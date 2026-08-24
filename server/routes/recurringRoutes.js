const router = require('express').Router();
const c = require('../controllers/recurringController');
const protect = require('../middleware/authMiddleware');

router.use(protect);
router.route('/').get(c.listRecurring).post(c.createRecurring);
router.route('/:id').put(c.updateRecurring).delete(c.deleteRecurring);
router.patch('/:id/toggle', c.toggleRecurring);
router.post('/process', c.triggerManualProcess);

module.exports = router;
