const debug = require('debug')('busy-bot:upvoter');
const fetch = require('node-fetch');
const retry = require('async-retry');
const RSMQWorker = require('rsmq-worker');
const steem = require('steem');
const api = require('../api');
const { STREAM_UPVOTERS_QUEUE, PAST_UPVOTERS_QUEUE } = require('../constants');

const STEEM_API = process.env.STEEM_API || 'https://api.steemit.com';
const STEEM_USERNAME = process.env.STEEM_USERNAME;
const STEEM_POSTING_WIF = process.env.STEEM_POSTING_WIF;

const MIN_VESTS = process.env.MIN_VESTS || 20000000;
const MAX_VESTS = process.env.MAX_VESTS || 4000000000000;
const LIMIT_VESTS = process.env.LIMIT_VESTS || 10000000000000;
const MIN_PERCENT = process.env.MIN_PERCENT || 6;
const MAX_PERCENT = process.env.MAX_PERCENT || 2500;

steem.api.setOptions({ url: STEEM_API });

async function getVoteWeight(username) {
  const mvests = await fetch(`https://steemdb.com/api/accounts?account[]=${username}`)
    .then(res => res.json())
    .then(res => res[0].followers_mvest);

  if (mvests < MIN_VESTS || mvests > LIMIT_VESTS) return 0;

  const percent = parseInt(10000 / MAX_VESTS * mvests);

  return Math.min(Math.max(percent, MIN_PERCENT), MAX_PERCENT);
}

async function getIsVoted(username, permlink) {
  const res = await api.callAsync('get_content', [username, permlink], null);

  return res.active_votes.filter(vote => vote.voter === 'busy.org').length !== 0;
}

function createProcessUpvote(blacklistUser) {
  return async (msg, next) => {
    try {
      await retry(
        async () => {
          const [author, permlink] = msg.split('/');

          const [voted, weight] = await Promise.all([
            getIsVoted(author, permlink),
            getVoteWeight(author),
          ]);

          if (voted || weight === 0) {
            next();
            return;
          }

          await steem.broadcast.voteAsync(
            STEEM_POSTING_WIF,
            STEEM_USERNAME,
            author,
            permlink,
            weight,
          );
          await blacklistUser(author);

          debug('Upvoted post', msg, weight);
          next();
        },
        { retries: 5 },
      );
    } catch (err) {
      debug("Couldn't upvote post: ", msg);
    }
  };
}

function worker(queue, name) {
  const streamWorker = new RSMQWorker(name, {
    rsmq: queue.rsmq,
    timeout: 10000,
  });
  streamWorker.on('message', createProcessUpvote(queue.blacklistUser));
  streamWorker.start();
}

function start(queue) {
  debug('upvoter started');

  worker(queue, STREAM_UPVOTERS_QUEUE);
  worker(queue, PAST_UPVOTERS_QUEUE);
}

module.exports = start;
