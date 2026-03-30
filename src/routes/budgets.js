const router = require('express').Router();
const {
  createBudget,
  getMyBudgets,
  getAllBudgets,
  getBudgetById,
  updateBudget,
  rateBudget,
} = require('../controllers/budgetController');
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

router.use(protect);

router.post('/', upload.array('photos', 5), createBudget);
router.get('/my', getMyBudgets);
router.get('/', adminOnly, getAllBudgets);
router.get('/:id', getBudgetById);
router.patch('/:id', adminOnly, updateBudget);
router.post('/:id/rate', rateBudget);

module.exports = router;
