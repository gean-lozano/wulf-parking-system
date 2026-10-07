const config = require('./config');
const app = require('./app');

app.listen(config.port, () => console.log(`NakPark API lista en http://localhost:${config.port}`));
