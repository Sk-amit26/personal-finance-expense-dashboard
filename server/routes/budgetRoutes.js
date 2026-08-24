const router = require('express').Router();
const controller = require('../controllers/budgetController');
const protect = require('../middleware/authMiddleware');
router.use(protect);
router.route('/').get(controller.listBudgets).post(controller.createBudget);
router.route('/:id').put(controller.updateBudget).delete(controller.deleteBudget);
module.exports = router;
