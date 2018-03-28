const debug = require('debug')('busy-bot:fetcher');
const RSMQWorker = require('rsmq-worker');
const { FETCHERS_QUEUE } = require('../constants');
const fetchBatch = require('./fetchBatch');

async function start(queue) {
  debug('fetcher started');

  const worker = new RSMQWorker(FETCHERS_QUEUE);
  worker.on('message', async function(msg, next, id) {
    debug('Processing message:', id);
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

module.exports = start;
