const router = require('express').Router();
const { getOrCreateChat, getMyChats, sendMessage, getMessages } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

router.use(protect);

router.post('/', getOrCreateChat);
router.get('/', getMyChats);
router.get('/:chatId', getMessages);
router.post('/:chatId/messages', upload.single('image'), sendMessage);

module.exports = router;
