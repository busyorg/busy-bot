const bluebird = require('bluebird');
const Client = require('lightrpc');
const { API } = require('./constants');

bluebird.promisifyAll(Client.prototype);

module.exports = new Client(API);
