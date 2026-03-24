export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'trans',
    password: process.env.DB_PASSWORD || 'change_me',
    database: process.env.DB_DATABASE || 'trans',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiration: process.env.JWT_EXPIRATION || '3650d',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '3650d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  oauth: {
    ft: {
      clientId: process.env.OAUTH_42_CLIENT_ID || '',
      clientSecret: process.env.OAUTH_42_CLIENT_SECRET || '',
      callbackUrl:
        process.env.OAUTH_42_CALLBACK_URL ||
        'http://localhost:3001/api/auth/42/callback',
    },
  },
});
