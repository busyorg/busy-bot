const api = require('../api');

async function getLastIrreversibleBlock() {
  try {
    const resp = await api.callAsync('get_dynamic_global_properties', [], null);
    return resp.last_irreversible_block_num;
  } catch (err) {
    return -1;
  }
}

module.exports = getLastIrreversibleBlock;
