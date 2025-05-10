const next = require('next');
const https = require('https-localhost')();

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  https.getServer((req, res) => {
    handle(req, res);
  }).listen(3000, () => {
    console.log('> Ready on https://localhost:3000');
  });
}); 