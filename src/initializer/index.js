const debug = require('debug')('busy-bot:initializer');
const api = require('../api');
const { WEEKLY_BLOCKS } = require('../constants');
const getBatches = require('./getBatches');

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
