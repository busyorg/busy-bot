const debug = require('debug')('busy-bot:queue');
const bluebird = require('bluebird');
const RedisSMQ = require('rsmq');
const { STREAM_FETCHERS_QUEUE, PAST_FETCHERS_QUEUE, UPVOTERS_QUEUE } = require('./constants');

bluebird.promisifyAll(RedisSMQ.prototype);

async function createQueue() {
  const rsmq = new RedisSMQ();
  try {
    const streamFetchersResult = await rsmq.createQueueAsync({ qname: STREAM_FETCHERS_QUEUE });
    const pastFetchersResult = await rsmq.createQueueAsync({ qname: PAST_FETCHERS_QUEUE });
    const upvotersResult = await rsmq.createQueueAsync({ qname: UPVOTERS_QUEUE });
    if (streamFetchersResult === 1) {
      debug('created stream fetchers queue');
    }
    if (pastFetchersResult === 1) {
      debug('created past fetchers queue');
    }
    if (upvotersResult === 1) {
      debug('created upvoters queue');
    }
  } catch (err) {
    debug('new queues not created');
  }

  return {
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
    queueUpvote: post => rsmq.sendMessageAsync({ qname: UPVOTERS_QUEUE, message: post }),
  };
}

module.exports = { createQueue };
