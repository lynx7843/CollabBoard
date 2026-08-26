const mongoose = require('mongoose');
const env = require('./env');

mongoose.set('strictQuery', true);

mongoose.connection.on('error', (e) => console.error('Mongo error:', e.message));
mongoose.connection.on('disconnected', () => console.warn('Mongo disconnected'));

async function connectDB(uri = env.mongoUri) {
  await mongoose.connect(uri, {
    dbName: env.mongoDb,
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
    // A cold start in production should not trigger an index build; create the
    // indexes once from a migration or the Atlas UI instead.
    autoIndex: !env.isProduction,
  });

  console.log(`MongoDB connected -> ${mongoose.connection.name}`);
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
