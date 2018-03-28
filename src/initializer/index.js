const debug = require('debug')('busy-bot:initializer');
const api = require('../api');
const { WEEKLY_BLOCKS, BLOCKS_PER_BATCH } = require('../constants');

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

async function start(queue) {
  debug('initializer started');

  const resp = await api.callAsync('get_dynamic_global_properties', [], null);
  const lastBlock = resp.last_irreversible_block_num;

  const startBlock = lastBlock - WEEKLY_BLOCKS;
  const blockCount = lastBlock - startBlock;

  const batches = getBatches(startBlock, blockCount);

  const batchPromises = batches.map(queue.queueBatch);
  await Promise.all(batchPromises);
}

module.exports = start;
