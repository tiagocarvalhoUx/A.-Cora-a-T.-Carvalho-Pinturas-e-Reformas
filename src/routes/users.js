const router = require('express').Router();
const { updateProfile, getAdminStats } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

router.use(protect);

router.patch('/profile', upload.single('avatar'), updateProfile);
router.get('/admin/stats', adminOnly, getAdminStats);
router.patch('/admin/set-role', adminOnly, require('../controllers/userController').setRole);

module.exports = router;
