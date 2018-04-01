const debug = require('debug')('busy-bot:upvoter');
const fetch = require('node-fetch');
const RSMQWorker = require('rsmq-worker');
const api = require('../api');
const { STREAM_UPVOTERS_QUEUE, PAST_UPVOTERS_QUEUE } = require('../constants');

const MIN_VESTS = process.env.MIN_VESTS || 20000000;
const MAX_VESTS = process.env.MAX_VESTS || 4000000000000;
const LIMIT_VESTS = process.env.LIMIT_VESTS || 10000000000000;
const MIN_PERCENT = process.env.MIN_PERCENT || 6;
const MAX_PERCENT = process.env.MAX_PERCENT || 2500;

async function getVotePercent(username) {
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

function createProcessUpvote() {
  return async (msg, next) => {
    try {
      const [username, permlink] = msg.split('/');

      const [voted, percent] = await Promise.all([
        getIsVoted(username, permlink),
        getVotePercent(username),
      ]);

      if (voted || percent === 0) {
        next();
        return;
      }

      debug('Upvoting post', msg, percent);
      next();
    } catch (err) {
      return;
    }
  };
}

function worker(name) {
  const streamWorker = new RSMQWorker(name);
  streamWorker.on('message', createProcessUpvote());
  streamWorker.start();
}

function start() {
  debug('upvoter started');

  worker(STREAM_UPVOTERS_QUEUE);
  worker(PAST_UPVOTERS_QUEUE);
}

module.exports = start;
