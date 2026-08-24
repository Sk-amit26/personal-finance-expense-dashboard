const router = require('express').Router();
const c = require('../controllers/exportController');
const protect = require('../middleware/authMiddleware');

router.use(protect);
router.get('/pdf', c.exportPDF);
router.get('/excel', c.exportExcel);

module.exports = router;
