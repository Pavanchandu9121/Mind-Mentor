const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Stub route for admin metrics
app.get('/metrics', (req, res) => {
  res.json({
    activeUsers: 154,
    assessmentsCompleted: 342,
    alertsTriggered: 12
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Admin Service' });
});

const PORT = process.env.PORT || 5010;

app.listen(PORT, () => {
  console.log(`Admin Service running on port ${PORT}`);
});
