const express = require('express');
const { createQueue } = require('./queue');
const upvoter = require('./upvoter');
const fetcher = require('./fetcher');
const initializer = require('./initializer');

const PORT = process.env.PORT || 3000;

const app = express();

async function start() {
  const queue = await createQueue();

  upvoter(queue);
  fetcher(queue);
  initializer(queue);

  app.get('/', async (req, res) => res.send(await queue.stat()));

  app.listen(PORT);
}

start();
