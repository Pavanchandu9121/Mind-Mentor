const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes — mount at '/' because API Gateway strips '/api/screening'
app.use('/', require('./routes/screening'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Screening Service',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5011;

app.listen(PORT, () => {
  console.log(`Screening Service running on port ${PORT}`);
});
