# Mettre l'API en ligne (Cloud Run + R2 + MongoDB Atlas)

Coût visé : 0 € par mois tant que le trafic reste dans les offres gratuites.
Aucune clé ne va dans le code : tout se colle dans les réglages de chaque service.

## 1. La base : MongoDB Atlas (gratuit, M0)

- Si la base actuelle est déjà sur Atlas (adresse `mongodb+srv://…mongodb.net`), on la garde.
- Sinon : créer un cluster **M0** sur cloud.mongodb.com, puis recopier l'ancienne base
  (`mongodump --uri <ancienne>` puis `mongorestore --uri <nouvelle>`).
- Network Access : autoriser `0.0.0.0/0` (Cloud Run n'a pas d'adresse fixe ; l'accès reste
  protégé par l'utilisateur et le mot de passe de la base).

## 2. Les fichiers : Cloudflare R2 (gratuit jusqu'à 10 Go)

1. dash.cloudflare.com › R2 › Create bucket : `beatmakerz` (laisser **privé**, ne pas activer l'accès public).
2. R2 › Manage API tokens › Create token : permission **Object Read & Write**, limité au bucket `beatmakerz`.
3. Noter : Account ID, Access Key ID, Secret Access Key.

## 3. L'API : Google Cloud Run

1. console.cloud.google.com › Cloud Run › **Deploy container** › *Continuously deploy from a repository*,
   choisir le repo `beatmakerz-api`, branche `main`, type de build **Dockerfile**.
2. Région : `europe-west1` (Belgique). Authentification : **Allow public access**.
3. Instances : minimum 0, maximum 2 (reste dans le gratuit). Mémoire : 512 Mo.
4. Variables (onglet *Variables & Secrets*) :

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | adresse de la base Atlas |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | les mêmes qu'avant sur Render (sinon tout le monde est déconnecté, c'est tout) |
| `STRIPE_KEY`, `STRIPE_PRICE_CUSTOM_PROD` | depuis le tableau de bord Stripe |
| `STRIPE_WEBHOOK_SECRET` | voir étape 4 |
| `EMAIL_API_KEY` | la même qu'avant |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | étape 2 |
| `R2_BUCKET` | `beatmakerz` |
| `PUBLIC_API_URL` | l'adresse donnée par Cloud Run, ex. `https://beatmakerz-api-xxxx.europe-west1.run.app` |
| `FRONTEND_URL` | l'adresse du site ; plusieurs possibles, séparées par des virgules (la première sert aux retours de Stripe) |

5. Vérifier : `<PUBLIC_API_URL>/health` répond `"status":"ok"`.

Après un moment sans visite, l'API se met en veille ; la première requête la réveille en quelques secondes.

## 4. Stripe

Developers › Webhooks › Add endpoint : `<PUBLIC_API_URL>/webhooks/stripe`,
événements `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, `checkout.session.expired`. Copier le *Signing secret* dans `STRIPE_WEBHOOK_SECRET`.
Supprimer l'ancien webhook qui pointait vers Render.

## 5. Recopier les anciens fichiers FileUp

```bash
# essai à blanc : dit ce qui sera recopié et ce qui ne répond plus
MONGO_URI=… R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET=beatmakerz \
PUBLIC_API_URL=https://… node scripts/migrate-to-r2.js
# puis pour de bon
… node scripts/migrate-to-r2.js --write
```

Un fichier introuvable sur FileUp reste tel quel en base et est listé : il faudra le renvoyer depuis l'admin.
