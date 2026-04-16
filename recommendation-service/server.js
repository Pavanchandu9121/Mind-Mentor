const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
// Gateway strips '/api/recommendations' and maps to '/'
app.use('/', require('./routes/recommendations'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Recommendation Service' });
});

const PORT = process.env.PORT || 5004;

app.listen(PORT, () => {
  console.log(`Recommendation Service running on port ${PORT}`);
});
