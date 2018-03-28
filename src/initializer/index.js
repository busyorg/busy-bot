const debug = require('debug')('busy-bot:initializer');
const { WEEKLY_BLOCKS, SLEEP_TIME } = require('../constants');
const { sleep } = require('../utils');
const getLastIrreversibleBlock = require('./getLastIrreversibleBlock');
const getBatches = require('./getBatches');

async function processCurrentBlocks(queue, block) {
  let lastBlock = block;
  while (true) {
    await sleep(SLEEP_TIME);

    const currentBlock = await getLastIrreversibleBlock();

    const batches = getBatches(lastBlock, currentBlock - lastBlock);

    const batchPromises = batches.map(queue.queueStreamBatch);
    await Promise.all(batchPromises);

    lastBlock = currentBlock;
  }
}

async function processPastBlocks(queue, lastBlock) {
  const startBlock = lastBlock - WEEKLY_BLOCKS;
  const blockCount = lastBlock - startBlock;

  const batches = getBatches(startBlock, blockCount);

  const batchPromises = batches.map(queue.queuePastBatch);
  await Promise.all(batchPromises);
}

async function start(queue) {
  debug('initializer started');

  const lastBlock = await getLastIrreversibleBlock();
  debug('last irreversible block', lastBlock);

  processCurrentBlocks(queue, lastBlock);
  processPastBlocks(queue, lastBlock);
}

module.exports = start;
