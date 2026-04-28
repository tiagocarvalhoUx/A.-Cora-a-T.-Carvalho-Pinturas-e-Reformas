const router = require('express').Router();
const {
  createBudget,
  getMyBudgets,
  getAllBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  rateBudget,
  verifyBudgetEmail,
} = require('../controllers/budgetController');
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

router.post('/', upload.array('photos', 5), createBudget);
router.get('/verify-email', verifyBudgetEmail);

router.use(protect);

router.get('/my', getMyBudgets);
router.get('/', adminOnly, getAllBudgets);
router.get('/:id', getBudgetById);
router.patch('/:id', adminOnly, updateBudget);
router.delete('/:id', adminOnly, deleteBudget);
router.post('/:id/rate', rateBudget);

module.exports = router;
