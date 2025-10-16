export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  frontendUrl: process.env.FRONTEND_URL,
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
  storage: {
    endpoint: process.env.STORAGE_ENDPOINT,
    region: process.env.STORAGE_REGION,
    bucket: process.env.STORAGE_BUCKET,
    accessKey: process.env.STORAGE_ACCESS_KEY,
    secretKey: process.env.STORAGE_SECRET_KEY,
  },
  email: {
    apiKey: process.env.EMAIL_API_KEY,
  },
});
