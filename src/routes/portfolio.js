const router = require('express').Router();
const { getAll, getById, create, update, remove } = require('../controllers/portfolioController');
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

const uploadFields = upload.fields([
  { name: 'before', maxCount: 1 },
  { name: 'after', maxCount: 1 },
  { name: 'extraBefore', maxCount: 10 },
  { name: 'extraAfter', maxCount: 10 },
]);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', protect, adminOnly, uploadFields, create);
router.patch('/:id', protect, adminOnly, uploadFields, update);
router.delete('/:id', protect, adminOnly, remove);

module.exports = router;
