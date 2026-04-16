const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
// Gateway strips '/api/tracking' and maps to '/'
app.use('/', require('./routes/tracking'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Tracking Service' });
});

const PORT = process.env.PORT || 5005;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Tracking Service running on port ${PORT}`);
  });
};

startServer();
