const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Stub route for sending notifications
app.post('/send', (req, res) => {
  const { userId, message } = req.body;
  console.log(`Sending notification to user ${userId}: ${message}`);
  res.json({ status: 'success', message: 'Notification sent successfully' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Notification Service' });
});

const PORT = process.env.PORT || 5006;

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});
