After starting the bot it start working on two things at the same time.

* fetch previous blocks from last 7 days.
* stream new blocks.

```js
// STEEM_ACCOUNTS

[
  {
    username: 'hellosteem',
    wif: 'your_wif',
    minVests: 20000000,
    maxVests: '4000000000000',
    limitVests: '10000000000000',
    minPercent: 6,
    maxPercent: 2500,
  },
];
```

Example:

```bash
DEBUG=busy-bot:* STEEM_ACCOUNTS="[{\"username\": \"hellosteem\",\"wif\": \"your_wif\",\"minVests\": 20000000,\"maxVests\": \"4000000000000\",\"limitVests\": \"10000000000000\",\"minPercent\": 25,\"maxPercent\": 2500}]" yarn start
```
