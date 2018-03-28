const bluebird = require('bluebird');
const RedisSMQ = require('rsmq');
const debug = require('debug')('busy-bot:initializer');
const api = require('../api');
const { FETCHERS_QUEUE, WEEKLY_BLOCKS, BLOCKS_PER_BATCH } = require('../constants');

bluebird.promisifyAll(RedisSMQ.prototype);

function getBatches(startBlock, blockCount) {
  const batches = [];

  let batch = [];
  for (let i = 0; i < blockCount; i++) {
    batch.push(startBlock + i);

    if (batch.length === BLOCKS_PER_BATCH || i === blockCount - 1) {
      batches.push(batch);
      batch = [];
    }
  }

  return batches;
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

module.exports = start;
