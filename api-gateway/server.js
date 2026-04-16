const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security and Logging Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Service Registry map
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:5002',
  assessment: process.env.ASSESSMENT_SERVICE_URL || 'http://localhost:5003',
  recommendation: process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:5004',
  tracking: process.env.TRACKING_SERVICE_URL || 'http://localhost:5005',
  ai: process.env.AI_SERVICE_URL || 'http://localhost:5001',
  screening: process.env.SCREENING_SERVICE_URL || 'http://localhost:5011',
  emotion: process.env.EMOTION_SERVICE_URL || 'http://localhost:5008',
  community: process.env.COMMUNITY_SERVICE_URL || 'http://localhost:5012',
  healthcare: process.env.HEALTHCARE_SERVICE_URL || 'http://localhost:5007',
  chat: process.env.CHAT_SERVICE_URL || 'http://localhost:5013'
};

// Route mapping configuration
const routes = {
  '/api/auth': services.auth,
  '/api/assessments': services.assessment,
  '/api/recommendations': services.recommendation,
  '/api/tracking': services.tracking,
  '/api/ai': services.ai,
  '/api/screening': services.screening,
  '/api/emotion': services.emotion,
  '/api/community': services.community,
  '/api/healthcare': services.healthcare,
  '/api/chat': services.chat
};

// Setup proxy middleware for each route
for (const [route, target] of Object.entries(routes)) {
  app.use(
    route,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: {
        [`^${route}`]: '', // Strip the base path when proxying
      },
      onError: (err, req, res) => {
        console.error(`[API Gateway] Error proxying request to ${target}: ${err.message}`);
        res.status(502).json({ error: 'Bad Gateway', message: 'Service is temporarily unavailable or starting up.' });
      }
    })
  );
}

// Gateway health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'API Gateway',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway is running on port ${PORT}`);
  console.log('--- Proxied Services ---');
  Object.entries(services).forEach(([name, url]) => {
    console.log(`[${name.toUpperCase()}]: ${url}`);
  });
});
