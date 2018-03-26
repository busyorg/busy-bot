const bluebird = require('bluebird');
const Client = require('lightrpc');
const debug = require('debug')('busybot');
const { getBatches, filterBusyPosts } = require('./utils');

const WEEKLY_BLOCKS = 7 * 24 * 60 * 20;

const client = new Client('https://api.steemit.com');

bluebird.promisifyAll(client);

async function start() {
  const resp = await client.callAsync('get_dynamic_global_properties', [], null);
  const lastBlock = resp.last_irreversible_block_num;

  const startBlock = lastBlock - WEEKLY_BLOCKS;
  const blockCount = lastBlock - startBlock;

  const batches = getBatches(startBlock, blockCount);
  debug(`got ${batches.length} of batches`);

  const transactions = await client
    .callAsync('get_ops_in_block', [startBlock], null)
    .filter(filterBusyPosts);
  debug(transactions.length);
}

start();
