const debug = require('debug')('busy-bot:upvoter');
const fetch = require('node-fetch');
const retry = require('async-retry');
const RSMQWorker = require('rsmq-worker');
const steem = require('steem');
const api = require('../api');
const getAccounts = require('./getAccounts');
const { STREAM_UPVOTERS_QUEUE, PAST_UPVOTERS_QUEUE } = require('../constants');

const STEEM_API = process.env.STEEM_API || 'https://api.steemit.com';

steem.api.setOptions({ url: STEEM_API });

async function getVoteWeight(username, account) {
  const mvests = await fetch(`https://steemdb.com/api/accounts?account[]=${username}`)
    .then(res => res.json())
    .then(res => res[0].followers_mvest);

  if (mvests < account.minVests || mvests > account.limitVests) return 0;

  const percent = parseInt(10000 / account.maxVests * mvests);

  return Math.min(Math.max(percent, account.minPercent), account.maxPercent);
}

async function getIsVoted(username, permlink, account) {
  const res = await api.callAsync('get_content', [username, permlink], null);

  return res.active_votes.filter(vote => vote.voter === account.username).length !== 0;
}

async function upvotePost(author, permlink, account) {
  const TAG = `[${author}/${permlink}]`;
  debug(TAG, 'started upvoting');
  const [voted, weight] = await Promise.all([
    getIsVoted(author, permlink, account),
    getVoteWeight(author, account),
  ]);

  if (voted || weight === 0) {
    debug(TAG, 'skipped', 'voted', voted, 'weight', weight);
    return;
  }
  await steem.broadcast.voteAsync(account.wif, account.username, author, permlink, weight);
  debug(TAG, 'upvoted by', account.username, 'with', weight);
}

function createProcessUpvote(blacklistUser) {
  const accounts = getAccounts();

  return async (msg, next) => {
    try {
      await retry(
        async () => {
          if (accounts.length === 0) {
            debug('no accounts loaded. did you set STEEM_ACCOUNTS variable?');
            next();
            return;
          }

          const [author, permlink] = msg.split('/');

          const votes = accounts.map(account => upvotePost(author, permlink, account));

          await Promise.all(votes);

          blacklistUser(author);
          next();
        },
        { retries: 5 },
      );
    } catch (err) {
      debug("Couldn't upvote post: ", msg, err);
    }
  };
}

function worker(queue, name) {
  const streamWorker = new RSMQWorker(name, {
    rsmq: queue.rsmq,
    timeout: 30000,
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
