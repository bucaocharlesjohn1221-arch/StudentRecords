const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const backendEnv = dotenv.parse(
  fs.readFileSync(path.join(process.cwd(), 'backend', '.env')),
);

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiUrl: backendEnv.API_URL || 'http://localhost:5000',
  },
});