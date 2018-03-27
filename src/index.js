const bluebird = require('bluebird');
const RedisSMQ = require('rsmq');
const Client = require('lightrpc');
const debug = require('debug')('busy-bot:initializer');
const { start: startFetcher } = require('./fetcher');
const { getBatches, filterBusyPosts } = require('./utils');

const WEEKLY_BLOCKS = 7 * 24 * 60 * 20;
const FETCHERS_QUEUE = 'FETCHERS_QUEUE';

const client = new Client('https://api.steemit.com');

bluebird.promisifyAll(RedisSMQ.prototype);
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
  startFetcher();

  const rsmq = new RedisSMQ();

  try {
    const queueResult = await rsmq.createQueueAsync({ qname: FETCHERS_QUEUE });
    if (queueResult === 1) {
      debug('created fetchers queue');
    }
  } catch (err) {
    debug("didn't create fetchers queue");
  }

  const resp = await client.callAsync('get_dynamic_global_properties', [], null);
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

start();
