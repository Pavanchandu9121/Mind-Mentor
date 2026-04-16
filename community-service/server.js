const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Gateway strips '/api/community' and maps to '/'
app.use('/', require('./routes/community'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Community Service' });
});

const PORT = process.env.PORT || 5012;

app.listen(PORT, () => {
  console.log(`Community Service running on port ${PORT}`);
});
