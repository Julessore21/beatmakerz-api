export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  // FRONTEND_URL peut en lister plusieurs (virgules) : la première est l'adresse
  // principale (retours de Stripe, liens), toutes sont acceptées par CORS.
  frontendUrl: process.env.FRONTEND_URL?.split(',')[0]?.trim().replace(/\/$/, ''),
  frontendUrls: process.env.FRONTEND_URL,
  mongoUri: process.env.MONGO_URI,
  jwt: {
    accessSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900),
    refreshTtlSeconds: Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 2592000),
  },
  stripe: {
    apiKey: process.env.STRIPE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    customProdPriceId: process.env.STRIPE_PRICE_CUSTOM_PROD,
  },
  publicApiUrl: process.env.PUBLIC_API_URL,
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
  },
  email: {
    apiKey: process.env.EMAIL_API_KEY,
  },
});
