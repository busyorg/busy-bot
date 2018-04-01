const debug = require('debug')('busy-bot:upvoter');
const RSMQWorker = require('rsmq-worker');
const { STREAM_UPVOTERS_QUEUE, PAST_UPVOTERS_QUEUE } = require('../constants');

function createProcessUpvote() {
  return (msg, next, id) => {
    debug('Upvoting post', id, msg);
    next();
  };
}

function worker(name) {
  const streamWorker = new RSMQWorker(name);
  streamWorker.on('message', createProcessUpvote());
  streamWorker.start();
}

function start() {
  debug('upvoter started');

  worker(STREAM_UPVOTERS_QUEUE);
  worker(PAST_UPVOTERS_QUEUE);
}

module.exports = start;
