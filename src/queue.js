const _ = require('lodash');
const debug = require('debug')('busy-bot:queue');
const bluebird = require('bluebird');
const RedisSMQ = require('rsmq');
const {
  STREAM_FETCHERS_QUEUE,
  PAST_FETCHERS_QUEUE,
  STREAM_UPVOTERS_QUEUE,
  PAST_UPVOTERS_QUEUE,
  UPVOTE_DELAY_SECONDS,
} = require('./constants');

bluebird.promisifyAll(RedisSMQ.prototype);

async function createQueue() {
  const rsmq = new RedisSMQ();
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
