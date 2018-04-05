const debug = require('debug')('busy-bot:upvoter');

function getAccounts() {
  debug('STEEM_ACCOUNTS', process.env.STEEM_ACCOUNTS);
  const accounts = JSON.parse(process.env.STEEM_ACCOUNTS || '[]');

  return accounts.map(account => ({
    username: account.username,
    wif: account.wif,
    minVests: account.minVests || 20000000,
    maxVests: account.maxVests || 4000000000000,
    limitVests: account.limitVests || 10000000000000,
    minPercent: account.minPercent || 6,
    maxPercent: account.maxPercent || 2500,
  }));
}

module.exports = getAccounts;
