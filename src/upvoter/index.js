const debug = require('debug')('busy-bot:upvoter');
const RSMQWorker = require('rsmq-worker');
const { UPVOTERS_QUEUE } = require('../constants');

function start() {
  debug('upvoter started');

  const worker = new RSMQWorker(UPVOTERS_QUEUE);
  worker.on('message', async function(msg, next, id) {
    debug('Upvoting post', id, msg);
    next();
  });
  worker.start();
}

module.exports = start;
