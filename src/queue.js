const _ = require('lodash');
const debug = require('debug')('busy-bot:queue');
const bluebird = require('bluebird');
const redis = require('redis');
const RedisSMQ = require('rsmq');
const {
  STREAM_FETCHERS_QUEUE,
  PAST_FETCHERS_QUEUE,
  STREAM_UPVOTERS_QUEUE,
  PAST_UPVOTERS_QUEUE,
  UPVOTE_DELAY_SECONDS,
  BLACKLIST_SECONDS,
  VESTS_CACHE_SECONDS,
} = require('./constants');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(RedisSMQ.prototype);

async function createQueue() {
  const client = redis.createClient(process.env.REDISCLOUD_URL);

  const rsmq = new RedisSMQ({ client });
  try {
    const streamFetchersResult = await rsmq.createQueueAsync({ qname: STREAM_FETCHERS_QUEUE });
    if (streamFetchersResult === 1) {
      debug('created stream fetchers queue');
    }

    const pastFetchersResult = await rsmq.createQueueAsync({ qname: PAST_FETCHERS_QUEUE });
    if (pastFetchersResult === 1) {
      debug('created past fetchers queue');
    }

    const streamUpvotersResult = await rsmq.createQueueAsync({ qname: STREAM_UPVOTERS_QUEUE });
    if (streamUpvotersResult === 1) {
      debug('created stream upvoters queue');
    }

    const pastUpvotersResult = await rsmq.createQueueAsync({ qname: PAST_UPVOTERS_QUEUE });
    if (pastUpvotersResult === 1) {
      debug('created past upvoters queue');
    }
  } catch (err) {
    debug('some queues not created');
  }

  return {
    rsmq,
    blacklistUser: username => client.setAsync(`${username}:voted`, true, 'EX', BLACKLIST_SECONDS),
    isBlacklisted: username => client.getAsync(`${username}:voted`),
    setCurrentBlock: block => client.setAsync('current_block', block),
    getCurrentBlock: () => client.getAsync('current_block'),
    setAccountFollowersVests: (username, vests) =>
      client.setAsync(`${username}:vests`, vests, 'EX', VESTS_CACHE_SECONDS),
    getAccountFollowersVests: username => client.getAsync(`${username}:vests`),
    stat: async () => {
      const queues = await rsmq.listQueuesAsync();
      return _.zipObject(
        queues,
        await Promise.all(queues.map(queue => rsmq.getQueueAttributesAsync({ qname: queue }))),
      );
    },
    queueStreamBatch: batch =>
      rsmq.sendMessageAsync({
        qname: STREAM_FETCHERS_QUEUE,
        message: batch.join(' '),
      }),
    queuePastBatch: batch =>
      rsmq.sendMessageAsync({
        qname: PAST_FETCHERS_QUEUE,
        message: batch.join(' '),
      }),
    queueStreamUpvote: message =>
      rsmq.sendMessageAsync({
        qname: STREAM_UPVOTERS_QUEUE,
        delay: UPVOTE_DELAY_SECONDS,
        message,
      }),
    queuePastUpvote: message =>
      rsmq.sendMessageAsync({
        qname: PAST_UPVOTERS_QUEUE,
        message,
      }),
  };
}

module.exports = { createQueue };
