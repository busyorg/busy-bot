const debug = require('debug')('busy-bot:fetcher');
const RSMQWorker = require('rsmq-worker');
const { FETCHERS_QUEUE } = require('../constants');

function start() {
  debug('fetcher started');
  const worker = new RSMQWorker(FETCHERS_QUEUE);
  worker.on('message', function(msg, next, id) {
    debug('Received message: ' + id);
    next();
  });
  worker.start();
}

module.exports = {
  start,
};
