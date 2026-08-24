const router = require('express').Router();
const c = require('../controllers/goalController');
const protect = require('../middleware/authMiddleware');

router.use(protect);
router.route('/').get(c.listGoals).post(c.createGoal);
router.route('/:id').put(c.updateGoal).delete(c.deleteGoal);
router.post('/:id/contribute', c.contributeGoal);

module.exports = router;
