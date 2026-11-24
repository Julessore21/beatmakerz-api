/**
 * Passe un compte existant administrateur (base neuve : personne ne l'est).
 * Le compte se crée d'abord normalement sur le site, puis :
 *
 *   MONGO_URI=… node scripts/make-admin.js ton@adresse.fr
 *
 * L'adresse de la base se colle dans le Terminal, jamais dans le code ni une conversation.
 */
const { MongoClient } = require('mongodb');
const { randomUUID } = require('crypto');

const email = (process.argv[2] || '').trim().toLowerCase();
if (!process.env.MONGO_URI || !email) {
  console.error('Usage : MONGO_URI=… node scripts/make-admin.js ton@adresse.fr');
  process.exit(1);
}

(async () => {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const users = client.db().collection('users');
  // Adresse comparée sans tenir compte des majuscules (le schéma ne les retire pas).
  const exact = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const res = await users.updateOne({ email: exact }, { $set: { role: 'admin' } });
  // Une prod appartient à un artiste : sur une base neuve, le profil « Beatmakerz » est créé pour ce compte.
  if (res.matchedCount) {
    const user = await users.findOne({ email: exact });
    const artists = client.db().collection('artists');
    if (!(await artists.findOne({ userId: user._id }))) {
      const now = new Date();
      await artists.insertOne({ _id: randomUUID(), userId: user._id, name: 'Beatmakerz', verified: true, createdAt: now, updatedAt: now });
      console.log('Profil d\'artiste « Beatmakerz » créé.');
    }
  }
  console.log(
    res.matchedCount
      ? `${email} est administrateur. Reconnecte-toi sur le site pour que ce soit pris en compte.`
      : `Aucun compte pour ${email} : crée-le d'abord sur le site.`,
  );
  await client.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
