const debug = require('debug')('busy-bot:fetcher');
const RSMQWorker = require('rsmq-worker');
const { STREAM_FETCHERS_QUEUE, PAST_FETCHERS_QUEUE } = require('../constants');
const fetchBatch = require('./fetchBatch');

function worker(queue, name) {
  const worker = new RSMQWorker(name);
  worker.on('message', async function(msg, next, id) {
    debug(name, 'Processing message:', id);
    try {
      const posts = (await fetchBatch(msg.split(' '))).map(tx => {
        const post = tx.op[1];
        return `${post.author}/${post.permlink}`;
      });

      const postsPromises = posts.map(queue.queueUpvote);
      await Promise.all(postsPromises);

      next();
    } catch (err) {
      debug("Couldn't process message:", id, err);
    }
  });
  worker.start();
}

function start(queue) {
  debug('fetcher started');

  worker(queue, STREAM_FETCHERS_QUEUE);
  worker(queue, PAST_FETCHERS_QUEUE);
}

module.exports = start;
