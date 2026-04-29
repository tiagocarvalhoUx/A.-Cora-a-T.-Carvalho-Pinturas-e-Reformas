const router = require('express').Router();
const {
  register,
  login,
  getMe,
  updateFcmToken,
  verifyFirebaseMagicLink,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/firebase/verify', verifyFirebaseMagicLink);
router.get('/me', protect, getMe);
router.patch('/fcm-token', protect, updateFcmToken);

module.exports = router;
