const moment = require('moment');
const debug = require('debug')('busy-bot:upvoter');
const fetch = require('node-fetch');
const retry = require('async-retry');
const RSMQWorker = require('rsmq-worker');
const steem = require('steem');
const api = require('../api');
const getAccounts = require('./getAccounts');
const { POST_TO_OLD_SECONDS, STREAM_UPVOTERS_QUEUE, PAST_UPVOTERS_QUEUE } = require('../constants');

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

function getPost(username, permlink) {
  return api.callAsync('get_content', [username, permlink], null);
}

function getIsVoted(post, account) {
  return post.active_votes.filter(vote => vote.voter === account.username).length !== 0;
}

async function upvotePost(name, author, permlink, account, queue) {
  const TAG = `[${name} - ${account.username}: ${author}/${permlink}]`;
  debug(TAG, 'started upvoting');

  const blacklisted = await queue.isBlacklisted(author);

  if (blacklisted) {
    debug(TAG, author, 'is blacklisted');
    return;
  }

  const [post, weight] = await Promise.all([
    getPost(author, permlink),
    getVoteWeight(author, account),
  ]);

  const timeSincePost = Math.floor(moment().diff(`${post.created}Z`) / 1000);

  const tooOld = timeSincePost > POST_TO_OLD_SECONDS;

  const voted = getIsVoted(post, account);

  if (voted || weight === 0 || tooOld) {
    debug(TAG, 'skipped', 'voted', voted, 'weight', weight, 'too old', tooOld);
    return;
  }

  try {
    await steem.broadcast.voteAsync(account.wif, account.username, author, permlink, weight);
    queue.blacklistUser(post.author, timeSincePost);
    debug(TAG, 'upvoted by', account.username, 'with', weight);
  } catch (err) {
    if (err.message.indexOf('STEEM_UPVOTE_LOCKOUT') !== -1) {
      debug(TAG, 'payout locked, skipping.');
      return;
    }
    throw err;
  }
}

function createProcessUpvote(queue, name) {
  const accounts = getAccounts();

  return async (msg, next, id) => {
    try {
      await retry(
        async () => {
          if (accounts.length === 0) {
            debug('no accounts loaded. did you set STEEM_ACCOUNTS variable?');
            next();
            return;
          }

          const [author, permlink] = msg.split('/');

          const votes = accounts.map(account => upvotePost(name, author, permlink, account, queue));

          await Promise.all(votes);

          await queue.rsmq.deleteMessageAsync({ qname: name, id });
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
  streamWorker.on('message', createProcessUpvote(queue, name));
  streamWorker.start();
}

function start(queue) {
  debug('upvoter started');

  worker(queue, STREAM_UPVOTERS_QUEUE);
  worker(queue, PAST_UPVOTERS_QUEUE);
}

module.exports = start;
