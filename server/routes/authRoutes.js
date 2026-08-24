const router = require('express').Router();
const c = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');

router.post('/register', c.register);
router.post('/login', c.login);
router.delete('/account', protect, c.deleteAccount);

module.exports = router;

