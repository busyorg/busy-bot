const bluebird = require('bluebird');
const Client = require('lightrpc');
const debug = require('debug')('busybot');
const { getBatches, filterBusyPosts } = require('./utils');

const WEEKLY_BLOCKS = 7 * 24 * 60 * 20;

const client = new Client('https://api.steemit.com');

bluebird.promisifyAll(client);

async function fetchBatch(batch) {
  const requests = batch.map(block => ({
    method: 'get_ops_in_block',
    params: [block],
  }));

  return await client
    .sendBatchAsync(requests, null)
    .reduce((a, b) => [...a, ...b], [])
    .filter(filterBusyPosts);
}

async function start() {
  const resp = await client.callAsync('get_dynamic_global_properties', [], null);
  const lastBlock = resp.last_irreversible_block_num;

  const startBlock = lastBlock - WEEKLY_BLOCKS;
  const blockCount = lastBlock - startBlock;

  const batches = getBatches(startBlock, blockCount);
  debug(`got ${batches.length} of batches`);
}

start();
