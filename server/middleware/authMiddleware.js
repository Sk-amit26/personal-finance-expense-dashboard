const jwt = require('jsonwebtoken');

function protect(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication token is required.' });
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch (_) { res.status(401).json({ message: 'Your session is invalid or has expired. Please log in again.' }); }
}
module.exports = protect;
