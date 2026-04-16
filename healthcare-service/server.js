const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Gateway strips '/api/healthcare' and maps to '/'
app.use('/', require('./routes/healthcare'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Healthcare Service' });
});

const PORT = process.env.PORT || 5007;

app.listen(PORT, () => {
  console.log(`Healthcare Service running on port ${PORT}`);
});
