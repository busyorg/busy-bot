const debug = require('debug')('busy-bot:worker');

const RSMQWorker = require('rsmq-worker');

function start() {
  const worker = new RSMQWorker('FETCHERS_QUEUE');
  worker.start();
  worker.on('message', function(msg, next, id) {
    debug('Received message: ' + id);
    next();
  });
}

module.exports = {
  start,
};
