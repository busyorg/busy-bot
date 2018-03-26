const bluebird = require('bluebird');
const Client = require('lightrpc');
const debug = require('debug')('busybot');
const { getBatches } = require('./utils');

const client = new Client('https://api.steemit.com');

const WEEKLY_BLOCKS = 7 * 24 * 60 * 20;

bluebird.promisifyAll(client);

async function start() {
  const resp = await client.callAsync('get_dynamic_global_properties', [], null);
  const lastBlock = resp.last_irreversible_block_num;

  const startBlock = lastBlock - WEEKLY_BLOCKS;
  const blockCount = lastBlock - startBlock;

  const batches = getBatches(startBlock, blockCount);

  debug(`got ${batches.length} of batches`);
}

start();
