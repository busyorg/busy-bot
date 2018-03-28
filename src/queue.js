const debug = require('debug')('busy-bot:queue');
const bluebird = require('bluebird');
const RedisSMQ = require('rsmq');
const { FETCHERS_QUEUE, UPVOTERS_QUEUE } = require('./constants');

bluebird.promisifyAll(RedisSMQ.prototype);

async function createQueue() {
  const rsmq = new RedisSMQ();

  const fetchersResult = await rsmq.createQueueAsync({ qname: FETCHERS_QUEUE });
  const upvotersResult = await rsmq.createQueueAsync({ qname: UPVOTERS_QUEUE });
  if (fetchersResult === 1) {
    debug('created fetchers queue');
  }
  if (upvotersResult === 1) {
    debug('created upvoters queue');
  }

  return {
    queueBatch: batch =>
      rsmq.sendMessageAsync({
        qname: FETCHERS_QUEUE,
        message: batch.join(' '),
      }),
    queueUpvote: post =>
      rsmq.sendMessageAsync({
        qname: UPVOTERS_QUEUE,
        message: post,
      }),
  };
}

module.exports = { createQueue };
