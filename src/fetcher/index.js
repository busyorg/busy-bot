const debug = require('debug')('busy-bot:fetcher');
const RSMQWorker = require('rsmq-worker');
const retry = require('async-retry');
const { STREAM_FETCHERS_QUEUE, PAST_FETCHERS_QUEUE } = require('../constants');
const fetchBatch = require('./fetchBatch');

function createProcessBatch(name, queueUpvote) {
  return async (msg, next, id) => {
    try {
      await retry(
        async () => {
          debug(name, 'Processing message:', id);
          const posts = (await fetchBatch(msg.split(' '))).map(tx => {
            const post = tx.op[1];
            return `${post.author}/${post.permlink}`;
          });

          const postsPromises = posts.map(queueUpvote);
          await Promise.all(postsPromises);

          next();
        },
        { retries: 5 },
      );
    } catch (err) {
      debug(name, "Couldn't fetch blocks. Message", id);
    }
  };
}

function worker(rsmq, name, queueUpvote) {
  const worker = new RSMQWorker(name, {
    rsmq,
    timeout: 10000,
  });
  worker.on('message', createProcessBatch(name, queueUpvote));
  worker.start();
}

function start(queue) {
  debug('fetcher started');

  worker(queue.rsmq, STREAM_FETCHERS_QUEUE, queue.queueStreamUpvote);
  worker(queue.rsmq, PAST_FETCHERS_QUEUE, queue.queuePastUpvote);
}

module.exports = start;
