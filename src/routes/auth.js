const router = require('express').Router();
const {
  register,
  login,
  getMe,
  updateFcmToken,
  requestMagicLink,
  verifyMagicLink,
  verifyFirebaseMagicLink,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/magic-link/request', requestMagicLink);
router.post('/magic-link/verify', verifyMagicLink);
router.post('/firebase/verify', verifyFirebaseMagicLink);
router.get('/me', protect, getMe);
router.patch('/fcm-token', protect, updateFcmToken);

module.exports = router;
