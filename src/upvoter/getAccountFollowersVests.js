const api = require('../api');

const FOLLOWERS_LIMIT = 1000;
const ACCOUNTS_LIMIT = 2500;

async function getAccountFollowersVests(username) {
  let vests = 0;
  let followers = [];
  let lastFollower = '';

  let resp = null;
  do {
    resp = await api.callAsync(
      'get_followers',
      [username, lastFollower, 'blog', FOLLOWERS_LIMIT],
      null,
    );
    const entries = lastFollower !== '' ? resp.slice(1) : resp;

    followers = [...followers, ...entries.map(follow => follow.follower)];
    lastFollower = entries[entries.length - 1].follower;
  } while (resp.length === FOLLOWERS_LIMIT);

  let steps = Math.ceil(followers.length / ACCOUNTS_LIMIT);

  for (let i = 0; i < steps; i++) {
    let start = i * ACCOUNTS_LIMIT;
    let end = Math.min(start + ACCOUNTS_LIMIT, followers.length);

    resp = await api.callAsync('get_accounts', [followers.slice(start, end)], null);
    vests += resp.reduce((acc, b) => acc + parseFloat(b.vesting_shares), 0);
  }

  return vests;
}

module.exports = getAccountFollowersVests;
