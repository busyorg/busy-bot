const _ = require('lodash');

const BLOCKS_PER_BATCH = 20;
const BUSY_APP_REGEX = /busy\/([0-9.]+)/;

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

module.exports = {
  getBatches,
  filterBusyPosts,
};
