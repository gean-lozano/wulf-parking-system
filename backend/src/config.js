require('dotenv').config();

const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://nakpark:nakpark123@localhost:5432/nakpark',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-cambiar',
  jwtExpires: process.env.JWT_EXPIRES || '10h',
  adminUser: process.env.ADMIN_USER || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  tz: process.env.TZ_APP || 'America/Lima',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

if (process.env.NODE_ENV === 'production' && config.jwtSecret === 'dev-secret-cambiar') {
  throw new Error('Define JWT_SECRET en el .env antes de correr en producción');
}

module.exports = config;
