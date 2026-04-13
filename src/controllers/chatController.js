const Chat = require('../models/Chat');
const User = require('../models/User');

exports.getOrCreateChat = async (req, res) => {
  try {
    const { budgetId, adminId: providedAdminId } = req.body;
    const userId = req.user._id;

    // Determine the other participant
    let otherId = providedAdminId;

    if (!otherId) {
      if (req.user.role === 'client') {
        // Client: find any admin user automatically
        const admin = await User.findOne({ role: 'admin' });
        if (admin) otherId = admin._id;
      }
      // If the caller is already admin and no otherId, just look up by admin alone
    }

    const participantIds = otherId ? [userId, otherId] : [userId];

    // Try to find an existing chat with exactly these participants
    let chat = await Chat.findOne({
      participants: { $all: participantIds },
      ...(budgetId ? { budget: budgetId } : {}),
    }).populate('participants', 'name avatar role');

    if (!chat) {
      chat = await Chat.create({
        budget: budgetId || null,
        participants: participantIds,
        messages: [],
      });
      await chat.populate('participants', 'name avatar role');
    }

    res.json({ chat });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyChats = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate('participants', 'name avatar role')
      .populate('messages.sender', 'name avatar')
      .sort({ lastMessageAt: -1 });
    res.json({ chats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { content, type } = req.body;
    const image = req.file ? { url: req.file.path, publicId: req.file.filename } : undefined;

    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat não encontrado' });

    const isParticipant = chat.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ message: 'Você não faz parte deste chat' });
    }

    const message = {
      sender: req.user._id,
      content,
      type: type || 'text',
      image,
    };

    chat.messages.push(message);
    chat.lastMessage = content || '📷 Imagem';
    chat.lastMessageAt = new Date();
    await chat.save();

    const newMessage = chat.messages[chat.messages.length - 1];
    res.status(201).json({ message: newMessage });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate('messages.sender', 'name avatar')
      .populate('participants', 'name avatar role');
    if (!chat) return res.status(404).json({ message: 'Chat não encontrado' });
    res.json({ chat });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
