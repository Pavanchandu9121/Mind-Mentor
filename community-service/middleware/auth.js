const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mindmentor_secret_key_2024');
      req.user = { _id: decoded.id };
    } catch (error) {
      console.error('JWT Verify Error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed: ' + error.message });
    }
    next();
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
