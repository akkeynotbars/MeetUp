const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/messages/conversations — list all conversations for current user
router.get('/conversations', requireAuth, async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('Messages')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch conversations' });

  // Group by conversation partner
  const convMap = new Map();
  (data || []).forEach(msg => {
    const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
    const otherName = msg.sender_id === userId ? msg.receiver_name : msg.sender_name;
    const msgText = msg.content || '';
    if (!convMap.has(otherId)) {
      convMap.set(otherId, {
        other_user_id: otherId,
        other_user_name: otherName || 'Unknown',
        last_message: msgText,
        last_time: msg.created_at,
        unread: 0,
      });
    }
    if (msg.receiver_id === userId && !msg.is_read) {
      convMap.get(otherId).unread++;
    }
  });

  res.json({ conversations: [...convMap.values()] });
});

// GET /api/messages/:other_user_id — get all messages with a specific user
router.get('/:other_user_id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const otherId = req.params.other_user_id;

  const { data, error } = await supabase
    .from('Messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`
    )
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: 'Failed to fetch messages' });

  // Mark received messages as read (graceful — column may not exist yet)
  await supabase
    .from('Messages')
    .update({ is_read: true })
    .eq('sender_id', otherId)
    .eq('receiver_id', userId)
    .eq('is_read', false);

  res.json({ messages: data || [] });
});

// POST /api/messages/send — send a message
router.post('/send', requireAuth, async (req, res) => {
  const { receiver_id, content, receiver_name } = req.body;
  if (!receiver_id || !content) return res.status(400).json({ error: 'receiver_id and content are required' });

  const senderName = req.user.name || req.user.email || 'User';

  const { data, error } = await supabase
    .from('Messages')
    .insert({
      sender_id: req.user.id,
      receiver_id,
      content,
      sender_name: senderName,
      receiver_name: receiver_name || 'User',
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Message send error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
  res.status(201).json({ message: 'Message sent', data });
});

module.exports = router;
