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
app.use('/api/auth', require('./routes/auth'));
app.use('/api/assessments', require('./routes/assessment'));
app.use('/api/recommendations', require('./routes/recommendations'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mind Mentor API is running' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
