module.exports = {
  env: {
    NODE_ENV: 'production',
    PORT: process.env.PORT || 5000,
    DB_TYPE: 'mysql',
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET || 'your_secure_session_secret_here',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://beanroutes.sonicbeans.com'
  }
}; 