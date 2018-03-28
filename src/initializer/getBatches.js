const { BLOCKS_PER_BATCH } = require('../constants');

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

module.exports = getBatches;
