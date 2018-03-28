const { createQueue } = require('./queue');
const upvoter = require('./upvoter');
const fetcher = require('./fetcher');
const initializer = require('./initializer');

async function start() {
  const queue = await createQueue();

  upvoter();
  fetcher(queue);
  initializer(queue);
}

start();
