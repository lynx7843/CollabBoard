module.exports = async function globalTeardown() {
  if (global.__MONGOD__) await global.__MONGOD__.stop();
};
