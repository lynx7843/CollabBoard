const { MongoMemoryServer } = require('mongodb-memory-server');

/*
 * One in-memory MongoDB for the whole run. The tests exercise the real unique
 * indexes and the real E11000 path, which a mocked model could not do.
 */
module.exports = async function globalSetup() {
  const mongod = await MongoMemoryServer.create();
  global.__MONGOD__ = mongod;
  process.env.MONGO_TEST_URI = mongod.getUri();
};
