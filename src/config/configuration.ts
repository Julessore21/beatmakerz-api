export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  frontendUrl: process.env.FRONTEND_URL,
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
  },
  fileup: {
    apiKey: process.env.FILEUP_API_KEY,
  },
  email: {
    apiKey: process.env.EMAIL_API_KEY,
  },
});
