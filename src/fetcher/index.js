const _ = require('lodash');
const bluebird = require('bluebird');
const debug = require('debug')('busy-bot:fetcher');
const RedisSMQ = require('rsmq');
const RSMQWorker = require('rsmq-worker');
const api = require('../api');
const { FETCHERS_QUEUE, UPVOTERS_QUEUE } = require('../constants');

bluebird.promisifyAll(RedisSMQ.prototype);

const BUSY_APP_REGEX = /busy\/([0-9.]+)/;

function filterBusyPosts(tx) {
  if (tx.op[0] !== 'comment') return false;

  const post = tx.op[1];

  if (post.parent_author) return false;

  let metadata = _.attempt(JSON.parse, post.json_metadata);
  if (_.isError(metadata)) return false;

  return (
    typeof metadata.app === 'string' &&
    metadata.app.match(BUSY_APP_REGEX) &&
    metadata.tags &&
    metadata.tags.length &&
    metadata.tags.includes('busy') &&
    !metadata.tags.includes('test')
  );
}

async function fetchBatch(batch) {
  const requests = batch.map(block => ({
    method: 'get_ops_in_block',
    params: [block],
  }));

  return await api
    .sendBatchAsync(requests, null)
    .reduce((a, b) => [...a, ...b], [])
    .filter(filterBusyPosts);
}

async function start() {
  debug('fetcher started');

  const rsmq = new RedisSMQ();

  try {
    const queueResult = await rsmq.createQueueAsync({ qname: UPVOTERS_QUEUE });
    if (queueResult === 1) {
      debug('created upvoters queue');
    }
  } catch (err) {
    debug("didn't create upvoters queue");
  }

  const worker = new RSMQWorker(FETCHERS_QUEUE);
  worker.on('message', async function(msg, next, id) {
    debug('Processing message:', id);
    try {
      const posts = (await fetchBatch(msg.split(' '))).map(tx => {
        const post = tx.op[1];
        return `${post.author}/${post.permlink}`;
      });

      const postsPromises = posts.map(post =>
        rsmq.sendMessageAsync({
          qname: UPVOTERS_QUEUE,
          message: post,
        }),
      );

      await Promise.all(postsPromises);
      next();
    } catch (err) {
      debug("Couldn't process message:", id, err);
    }
  });
  worker.start();
}

module.exports = start;
