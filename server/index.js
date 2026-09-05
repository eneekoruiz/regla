require('dotenv').config({ quiet: true });
require('dotenv').config({ path: require('node:path').join(__dirname, '.env'), quiet: true });
const { createApp } = require('./app');

const app = createApp();
module.exports = app;

if (require.main === module) {
  const port = Number(process.env.PORT) || 3001;
  app.listen(port, () => console.log(`Aura API listening on port ${port}`));
}
