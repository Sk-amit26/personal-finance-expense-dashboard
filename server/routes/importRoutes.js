const router = require('express').Router();
const c = require('../controllers/importController');
const protect = require('../middleware/authMiddleware');

router.use(protect);
router.post('/csv', c.uploadMiddleware, c.importCSV);

module.exports = router;
