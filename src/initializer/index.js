const bluebird = require('bluebird');
const RedisSMQ = require('rsmq');
const debug = require('debug')('busy-bot:initializer');
const api = require('../api');
const { getBatches, filterBusyPosts } = require('../utils');
const { FETCHERS_QUEUE, WEEKLY_BLOCKS } = require('../constants');

bluebird.promisifyAll(RedisSMQ.prototype);

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
  debug('initializer started');
  const rsmq = new RedisSMQ();

  try {
    const queueResult = await rsmq.createQueueAsync({ qname: FETCHERS_QUEUE });
    if (queueResult === 1) {
      debug('created fetchers queue');
    }
  } catch (err) {
    debug("didn't create fetchers queue");
  }

  const resp = await api.callAsync('get_dynamic_global_properties', [], null);
  const lastBlock = resp.last_irreversible_block_num;

  const startBlock = lastBlock - WEEKLY_BLOCKS;
  const blockCount = lastBlock - startBlock;

  const batches = getBatches(startBlock, blockCount);

  const batchPromises = batches.map(batch =>
    rsmq.sendMessageAsync({
      qname: FETCHERS_QUEUE,
      message: batch.join(' '),
    }),
  );

  await Promise.all(batchPromises);

  rsmq.quit();
}

module.exports = {
  start,
};
