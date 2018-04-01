const debug = require('debug')('busy-bot:fetcher');
const RSMQWorker = require('rsmq-worker');
const { STREAM_FETCHERS_QUEUE, PAST_FETCHERS_QUEUE } = require('../constants');
const fetchBatch = require('./fetchBatch');

function createProcessBatch(name, queueUpvote) {
  return async (msg, next, id) => {
    debug(name, 'Processing message:', id);
    try {
      const posts = (await fetchBatch(msg.split(' '))).map(tx => {
        const post = tx.op[1];
        return `${post.author}/${post.permlink}`;
      });

      const postsPromises = posts.map(queueUpvote);
      await Promise.all(postsPromises);

      next();
    } catch (err) {
      debug("Couldn't process message:", id, err);
    }
  };
}

function worker(name, queueUpvote) {
  const worker = new RSMQWorker(name);
  worker.on('message', createProcessBatch(name, queueUpvote));
  worker.start();
}

function start(queue) {
  debug('fetcher started');

  worker(STREAM_FETCHERS_QUEUE, queue.queueStreamUpvote);
  worker(PAST_FETCHERS_QUEUE, queue.queuePastUpvote);
}

module.exports = start;
