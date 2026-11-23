/**
 * Recopie dans R2 les fichiers encore sur FileUp, puis met la base à jour.
 *
 *   - assets.storageKey  https://file-up.fr/…  →  r2:beats/<beat>/<type>/<nom>
 *   - beats.coverUrl     https://file-up.fr/…  →  <PUBLIC_API_URL>/files/public/covers/<beat>/…
 *
 * Par défaut, ESSAI À BLANC : rien n'est écrit, le script dit ce qu'il ferait
 * et quels fichiers ne répondent plus. Ajouter --write pour recopier.
 * Un fichier introuvable n'est jamais effacé de la base : il est listé.
 *
 * Usage (variables d'environnement, jamais dans le code) :
 *   MONGO_URI=… R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… \
 *   R2_BUCKET=… PUBLIC_API_URL=https://… node scripts/migrate-to-r2.js [--write]
 */
const { MongoClient, ObjectId } = require('mongodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { randomBytes } = require('crypto');

const WRITE = process.argv.includes('--write');
const need = [
  'MONGO_URI',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'PUBLIC_API_URL',
];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Variables manquantes : ${missing.join(', ')}`);
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  // R2 : pas de sommes de contrôle automatiques (réglage conseillé par Cloudflare).
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const publicBase = process.env.PUBLIC_API_URL.replace(/\/$/, '');

const clean = (s) =>
  s
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^[.-]+|-+$/g, '') || 'file';
const extOf = (type) =>
  type && type.includes('/')
    ? '.' +
      type
        .split('/')[1]
        .split(';')[0]
        .replace('mpeg', 'mp3')
        .replace('x-wav', 'wav')
    : '';
const nameFrom = (res, fallback) => {
  const cd = res.headers.get('content-disposition') || '';
  const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (m) return decodeURIComponent(m[1]);
  return fallback + extOf(res.headers.get('content-type'));
};
const keyWithSuffix = (path) => {
  const suffix = randomBytes(4).toString('hex');
  const dot = path.lastIndexOf('.');
  return dot > path.lastIndexOf('/') + 1
    ? `${path.slice(0, dot)}-${suffix}${path.slice(dot)}`
    : `${path}-${suffix}`;
};

async function copy(url, path) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`FileUp a répondu ${res.status}`);
  const body = Buffer.from(await res.arrayBuffer());
  const key = keyWithSuffix(path(nameFrom(res, 'file')));
  if (WRITE) {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: body,
        ContentType:
          res.headers.get('content-type') || 'application/octet-stream',
      }),
    );
  }
  return { key, size: body.length };
}

async function main() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db();
  const lost = [];
  let copied = 0;
  let bytes = 0;
  console.log(
    WRITE ? 'Recopie vers R2…' : 'ESSAI À BLANC (ajoute --write pour recopier)',
  );

  const assets = await db
    .collection('assets')
    .find({ storageKey: /^https?:\/\// })
    .toArray();
  for (const a of assets) {
    try {
      const { key, size } = await copy(
        a.storageKey,
        (n) => `beats/${a.beatId}/${a.type}/${clean(n)}`,
      );
      if (WRITE)
        await db
          .collection('assets')
          .updateOne(
            { _id: a._id },
            { $set: { storageKey: `r2:${key}`, legacyUrl: a.storageKey } },
          );
      copied++;
      bytes += size;
      console.log(`  ✓ ${a.type} du beat ${a.beatId} → ${key}`);
    } catch (e) {
      lost.push(
        `${a.type} du beat ${a.beatId} (${a.storageKey}) : ${e.message}`,
      );
    }
  }

  const beats = await db
    .collection('beats')
    .find({ coverUrl: /^https?:\/\/(www\.)?file-up\.fr/ })
    .toArray();
  for (const b of beats) {
    try {
      const { key, size } = await copy(
        b.coverUrl,
        (n) => `covers/${b._id}/${clean(n)}`,
      );
      const url = `${publicBase}/files/public/${key}`;
      if (WRITE)
        await db
          .collection('beats')
          .updateOne(
            { _id: new ObjectId(b._id) },
            { $set: { coverUrl: url, legacyCoverUrl: b.coverUrl } },
          );
      copied++;
      bytes += size;
      console.log(`  ✓ pochette de « ${b.title} »`);
    } catch (e) {
      lost.push(`pochette de « ${b.title} » (${b.coverUrl}) : ${e.message}`);
    }
  }

  console.log(
    `\n${copied} fichier(s) ${WRITE ? 'recopiés' : 'à recopier'}, ${(bytes / 1e6).toFixed(1)} Mo.`,
  );
  if (lost.length) {
    console.log(
      `\n${lost.length} fichier(s) introuvable(s) sur FileUp (gardés tels quels en base) :`,
    );
    for (const l of lost) console.log(`  ✗ ${l}`);
  }
  await client.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
