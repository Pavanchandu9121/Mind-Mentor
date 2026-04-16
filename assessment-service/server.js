const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
// Note: Mount at '/' because API Gateway strips '/api/assessments'
app.use('/', require('./routes/assessment'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Assessment Service' });
});

const PORT = process.env.PORT || 5003;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Assessment Service running on port ${PORT}`);
  });
};

startServer();
