const mongoose = require('mongoose');

// Set before anything requires src/config/env, which asserts these are present.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-not-used-outside-jest';
process.env.JWT_EXPIRES_IN = '7d';
// The default of 12 rounds is ~250ms per hash by design; that is the right cost
// in production and the wrong one in a test suite that hashes on every case.
process.env.BCRYPT_ROUNDS = '4';
process.env.MONGODB_DB = 'collabboard_test';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI, {
    dbName: process.env.MONGODB_DB,
  });
});

// Start every test from an empty database, and rebuild the indexes the
// duplicate-key assertions depend on.
beforeEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes()));
});

afterAll(async () => {
  await mongoose.disconnect();
});
