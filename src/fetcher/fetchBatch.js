const _ = require('lodash');
const api = require('../api');

const BUSY_APP_REGEX = /(?:busy|bsteem)(?:\/(?:[0-9.]+))?/;

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
    (metadata.tags.includes('busy') || metadata.tags.includes('bsteem')) &&
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

module.exports = fetchBatch;
