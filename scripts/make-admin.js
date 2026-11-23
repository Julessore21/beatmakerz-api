/**
 * Passe un compte existant administrateur (base neuve : personne ne l'est).
 * Le compte se crée d'abord normalement sur le site, puis :
 *
 *   MONGO_URI=… node scripts/make-admin.js ton@adresse.fr
 *
 * L'adresse de la base se colle dans le Terminal, jamais dans le code ni une conversation.
 */
const { MongoClient } = require('mongodb');

const email = (process.argv[2] || '').trim().toLowerCase();
if (!process.env.MONGO_URI || !email) {
  console.error('Usage : MONGO_URI=… node scripts/make-admin.js ton@adresse.fr');
  process.exit(1);
}

(async () => {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const users = client.db().collection('users');
  const res = await users.updateOne({ email }, { $set: { role: 'admin' } });
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
