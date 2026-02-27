/**
 * Migration : convertit les liens FileUp dashboard → lien direct
 *
 * Avant : https://file-up.fr/dashboard/view/<id>
 * Après : https://file-up.fr/<id>
 *
 * Collections ciblées :
 *   - beats.coverUrl
 *   - assets.storageKey
 *
 * Usage :
 *   MONGO_URI="mongodb+srv://..." node scripts/migrate-fileup-links.js
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const PATTERN = '/dashboard/view/';

if (!MONGO_URI) {
  console.error('❌  Variable MONGO_URI manquante.');
  console.error('   Usage : MONGO_URI="mongodb+srv://..." node scripts/migrate-fileup-links.js');
  process.exit(1);
}

async function migrate() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅  Connecté à MongoDB\n');

    const db = client.db();

    // --- beats.coverUrl ---
    const beatsResult = await db.collection('beats').updateMany(
      { coverUrl: { $regex: '/dashboard/view/' } },
      [{
        $set: {
          coverUrl: {
            $replaceAll: { input: '$coverUrl', find: PATTERN, replacement: '/' },
          },
        },
      }],
    );
    console.log(`beats.coverUrl   — ${beatsResult.matchedCount} trouvés, ${beatsResult.modifiedCount} mis à jour`);

    // --- assets.storageKey ---
    const assetsResult = await db.collection('assets').updateMany(
      { storageKey: { $regex: '/dashboard/view/' } },
      [{
        $set: {
          storageKey: {
            $replaceAll: { input: '$storageKey', find: PATTERN, replacement: '/' },
          },
        },
      }],
    );
    console.log(`assets.storageKey — ${assetsResult.matchedCount} trouvés, ${assetsResult.modifiedCount} mis à jour`);

    console.log('\n✅  Migration terminée.');
  } finally {
    await client.close();
  }
}

migrate().catch((err) => {
  console.error('❌  Erreur lors de la migration :', err.message);
  process.exit(1);
});
