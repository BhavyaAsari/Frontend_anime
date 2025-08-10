import { BASE_URL } from './config.js';

console.log(BASE_URL);

// Get current user info from session
let currentUser = null;
let receiverId = null;
let chatId = null;
const messages = [];

const socket = io(`${BASE_URL}`, { withCredentials: true });

const chatListEl = document.getElementById('chatList');
const searchInput = document.getElementById('searchUser');
const resultsList = document.getElementById('searchResults');
const chatBox = document.getElementById('chatBox');
const chatForm = document.getElementById('chatForm');

const messageInput = document.getElementById('messageInput');
const chatTitle = document.getElementById('chatTitle');

// ✅ Add image upload input
const imageInput = document.createElement('input');
imageInput.type = 'file';
imageInput.accept = 'image/*';
imageInput.style.display = 'none';
document.body.appendChild(imageInput);

// ✅ Helper function to safely handle API responses
async function handleApiResponse(response) {
  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = 'login.html';
      return null;
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.hasOwnProperty('success')) {
    if (!data.success) {
      throw new Error(data.message || 'Request failed');
    }
    return data.data;
  }
  return data;
}

// ✅ Helper function to get profile image URL
function getProfileImageUrl(user) {
  if (!user) return `https://ui-avatars.com/api/?name=User&background=random&color=fff&size=40`;
  if (user.profilePicture) {
    if (user.profilePicture.startsWith('http')) return user.profilePicture;
    if (user.profilePicture.startsWith('/uploads/')) return `${BASE_URL}${user.profilePicture}`;
    return `${BASE_URL}/${user.profilePicture}`;
  }
  if (user.avatar?.startsWith('http')) return user.avatar;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'User')}&background=random&color=fff&size=40`;
}

// ✅ Get current user info
async function getCurrentUser() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, { credentials: 'include' });
    currentUser = await handleApiResponse(res);
  } catch (err) {
    console.error('Error getting current user:', err);
    showError('Failed to load user information');
  }
}

// Show error message
function showError(message) {
  chatBox.innerHTML = `<div class="error" style="text-align: center; padding: 20px; color: #dc3545;">${message}</div>`;
}

// Show loading state
function showLoading(element, message = 'Loading...') {
  element.innerHTML = `<li class="loading" style="text-align: center; padding: 10px; color: #6c757d;">${message}</li>`;
}

// Compare IDs safely
function compareIds(id1, id2) {
  return id1?.toString() === id2?.toString();
}

// ✅ Render messages
function renderMessages() {
  if (messages.length === 0) {
    chatBox.innerHTML = '<div class="empty-state" style="text-align: center; padding: 40px; color: #6c757d;">No messages yet. Start the conversation!</div>';
    return;
  }

  chatBox.innerHTML = "";
  messages.forEach(msg => {
    const div = document.createElement("div");
    const isCurrentUser = compareIds(msg.senderId, currentUser._id);
    div.className = isCurrentUser ? "msg-right" : "msg-left";

    const senderName = isCurrentUser ? 'You' : (msg.senderName || msg.username || 'User');

    const msgUser = isCurrentUser ? currentUser : {
      profilePicture: msg.senderProfilePic || msg.profileImage || msg.profilePicture,
      avatar: msg.avatar,
      username: senderName
    };

    const profileImg = getProfileImageUrl(msgUser);

    let messageContent = '';
    if (msg.imageUrl) {
      const imageUrl = msg.imageUrl.startsWith('http') ? msg.imageUrl : `${BASE_URL}${msg.imageUrl}`;
      messageContent = `<img src="${imageUrl}" alt="Shared image" class="shared-image" style="max-width: 200px; max-height: 200px; border-radius: 8px; margin: 5px 0; cursor: pointer;" onclick="window.open('${imageUrl}', '_blank')">`;
    }
    if (msg.content) {
      messageContent += `<div>${escapeHtml(msg.content)}</div>`;
    }

    div.innerHTML = `
      <div class="msg-wrapper">
        ${!isCurrentUser ? `<img src="${profileImg}" class="profile-img" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 8px;" />` : ''}
        <span class="msg-bubble ${isCurrentUser ? 'you' : ''}" style="display:inline-block;padding:8px 12px;border-radius:18px;max-width:70%;${isCurrentUser ? 'background:#007bff;color:white;' : 'background:#f1f1f1;color:black;'}">
          ${!isCurrentUser ? `<strong>${senderName}:</strong> ` : ''}${messageContent}
        </span>
        ${isCurrentUser ? `<img src="${profileImg}" class="profile-img" style="width: 32px; height: 32px; border-radius: 50%; margin-left: 8px;" />` : ''}
      </div>
    `;
    chatBox.appendChild(div);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ✅ Render chat list
function renderChatList(chats) {
  if (!chats || chats.length === 0) {
    chatListEl.innerHTML = '<li class="list-group-item text-center text-muted">No chats yet</li>';
    return;
  }

  chatListEl.innerHTML = '';
  chats.forEach(chat => {
    const otherUser = chat.otherUser || chat.members?.find(m => !compareIds(m._id, currentUser._id));
    if (!otherUser) return;

    const li = document.createElement('li');
    li.className = 'list-group-item list-group-item-action p-0';

    const profileImg = getProfileImageUrl(otherUser);
    li.innerHTML = `
      <div class="user-item" style="display:flex;align-items:center;padding:12px;">
        <img src="${profileImg}" class="profile-img" style="width:40px;height:40px;border-radius:50%;margin-right:12px;">
        <div class="user-info" style="flex:1;">
          <p class="username" style="margin:0;font-weight:500;">${otherUser.username}</p>
          <p class="last-message" style="margin:0;font-size:0.9em;color:#666;">${chat.lastMessage?.content || 'No messages yet'}</p>
        </div>
      </div>
    `;
    li.addEventListener('click', () => openChat(chat, otherUser));
    chatListEl.appendChild(li);
  });
}

// ✅ Load chat list
async function loadChatList() {
  try {
    showLoading(chatListEl, 'Loading your chats...');
    const res = await fetch(`${BASE_URL}/api/one-on-one/chatlist`, { credentials: 'include' });
    const chats = await handleApiResponse(res);
    if (chats) renderChatList(chats);
  } catch (err) {
    console.error('Error loading chat list:', err);
    chatListEl.innerHTML = '<li class="list-group-item text-danger">Failed to load chats</li>';
  }
}

// ✅ Load messages
async function loadMessages(chatId) {
  try {
    const res = await fetch(`${BASE_URL}/api/messages/chat/${chatId}`, { credentials: 'include' });
    const data = await handleApiResponse(res);
    if (!data) return;

    const msgs = data.messages || data;
    messages.length = 0;
    messages.push(...msgs.map(m => ({
      senderId: m.sender?._id || m.senderId,
      senderName: m.sender?.username || m.senderName,
      username: m.sender?.username || m.username,
      profileImage: m.sender?.profilePicture || m.profileImage,
      profilePicture: m.sender?.profilePicture || m.profilePicture,
      senderProfilePic: m.senderProfilePic,
      avatar: m.sender?.avatar || m.avatar,
      content: m.content,
      imageUrl: m.imageUrl
    })));
    renderMessages();
  } catch (err) {
    console.error('Error loading messages:', err);
    showError('Failed to load messages. Please try again.');
  }
}

// ✅ Open chat
async function openChat(chat, otherUser) {
  chatId = chat._id;
  receiverId = otherUser._id;
  chatTitle.textContent = `Chat with ${otherUser.username}`;
  messages.length = 0;
  renderMessages();
  chatForm.style.display = 'flex';

  socket.emit('joinChat', chatId);
  await loadMessages(chatId);
}

// ✅ Search functionality
let searchTimeout;
searchInput.addEventListener('input', async () => {
  clearTimeout(searchTimeout);
  const query = searchInput.value.trim();
  resultsList.innerHTML = '';
  if (query.length < 2) return;

  searchTimeout = setTimeout(async () => {
    try {
      resultsList.innerHTML = '<li class="list-group-item loading">Searching...</li>';
      const res = await fetch(`${BASE_URL}/api/auth/search?q=${encodeURIComponent(query)}`, { credentials: 'include' });
      const users = await handleApiResponse(res);
      if (!users) return;

      resultsList.innerHTML = '';
      if (users.length === 0) {
        resultsList.innerHTML = '<li class="list-group-item text-muted">No users found</li>';
        return;
      }

      users.forEach(user => {
        if (compareIds(user._id, currentUser._id)) return;

        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action p-0';
        li.style.cursor = 'pointer';

        const profileImg = getProfileImageUrl(user);
        li.innerHTML = `
          <div class="user-item" style="display:flex;align-items:center;padding:12px;">
            <img src="${profileImg}" class="profile-img" style="width:40px;height:40px;border-radius:50%;margin-right:12px;">
            <div class="user-info" style="flex:1;">
              <p class="username" style="margin:0;font-weight:500;">${user.username}</p>
              <p class="last-message" style="margin:0;font-size:0.9em;color:#666;">Click to start chatting</p>
            </div>
          </div>
        `;
        li.addEventListener('click', async () => {
          const chatRes = await fetch(`${BASE_URL}/api/one-on-one/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ otherUserId: user._id })
          });
          const chat = await handleApiResponse(chatRes);
          if (chat) await openChat(chat, user);
        });
        resultsList.appendChild(li);
      });
    } catch (err) {
      console.error('Search error:', err);
      resultsList.innerHTML = '<li class="list-group-item text-danger">Search failed</li>';
    }
  }, 300);
});

// ✅ Add image upload button
function addImageUploadButton() {
  if (document.querySelector('.image-upload-btn')) return;

  const imageBtn = document.createElement('button');
  imageBtn.type = 'button';
  imageBtn.innerHTML = '📷';
  imageBtn.title = 'Upload Image';
  imageBtn.className = 'btn btn-outline-secondary image-upload-btn';
  imageBtn.style.marginRight = '8px';
  imageBtn.addEventListener('click', () => imageInput.click());

  const sendBtn = chatForm.querySelector('button[type="submit"]');
  if (sendBtn) chatForm.insertBefore(imageBtn, sendBtn);
}

// ✅ Add emoji picker button
function addEmojiPickerButton() {
  if (document.querySelector('.emoji-btn')) return;

  const emojiBtn = document.createElement('button');
  emojiBtn.type = 'button';
  emojiBtn.textContent = '😊';
  emojiBtn.className = 'btn btn-outline-secondary emoji-btn';
  emojiBtn.style.marginRight = '8px';

  const emojiPicker = document.getElementById('emojiPicker');

  emojiBtn.addEventListener('click', () => {
    emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
  });

  emojiPicker.addEventListener('emoji-click', (event) => {
    messageInput.value += event.detail.unicode;
    messageInput.focus();
  });

  const sendBtn = chatForm.querySelector('button[type="submit"]');
  if (sendBtn) chatForm.insertBefore(emojiBtn, sendBtn);
}

// Hide emoji picker when clicking outside
document.addEventListener('click', (e) => {
  const emojiPicker = document.getElementById('emojiPicker');
  const emojiBtn = document.querySelector('.emoji-btn');
  if (emojiPicker && !emojiPicker.contains(e.target) && e.target !== emojiBtn) {
    emojiPicker.style.display = 'none';
  }
});

// ✅ Send message
async function sendMessage(content = '', imageFile = null) {
  if ((!content.trim() && !imageFile) || !chatId || !currentUser) return;

  const submitBtn = chatForm.querySelector('button[type="submit"]');
  const originalText = submitBtn?.textContent || 'Send';
  if (submitBtn) {
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
  }
  messageInput.disabled = true;

  try {
    const formData = new FormData();
    formData.append('chat', chatId);
    formData.append('chatModel', 'DirectMessage');
    if (imageFile) formData.append('image', imageFile);
    if (content.trim()) formData.append('content', content.trim());

    const res = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    const savedMsg = await handleApiResponse(res);
    if (!savedMsg) return;

    const newMessage = {
      senderId: currentUser._id,
      senderName: currentUser.username,
      username: currentUser.username,
      profileImage: currentUser.profilePicture,
      profilePicture: currentUser.profilePicture,
      senderProfilePic: currentUser.profilePicture,
      avatar: currentUser.avatar,
      content: savedMsg.content,
      imageUrl: savedMsg.imageUrl,
    };

    messages.push(newMessage);
    renderMessages();
    messageInput.value = '';

    socket.emit('sendMessage', {
      chatId,
      content: savedMsg.content,
      imageUrl: savedMsg.imageUrl,
      senderId: currentUser._id,
      senderName: currentUser.username,
      username: currentUser.username,
      profilePicture: currentUser.profilePicture || currentUser.avatar,
      receiverId
    });

  } catch (err) {
    console.error('Error sending message:', err);
    alert('Failed to send message: ' + err.message);
  } finally {
    if (submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
    messageInput.disabled = false;
    messageInput.focus();
  }
}

// ✅ Image selection
imageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) return alert('Image size must be < 5MB');
    if (!file.type.startsWith('image/')) return alert('Please select an image file');
    await sendMessage('', file);
    imageInput.value = '';
  }
});

// ✅ Form submission
chatForm.addEventListener('submit', async e => {
  e.preventDefault();
  const content = messageInput.value.trim();
  if (content) await sendMessage(content);
});

// ✅ Socket events
socket.on('receiveMessage', (msg) => {
  if (msg.chatId === chatId && !compareIds(msg.senderId, currentUser._id)) {
    messages.push({
      senderId: msg.senderId,
      senderName: msg.senderName,
      username: msg.username || msg.senderName,
      profileImage: msg.profilePicture,
      profilePicture: msg.profilePicture,
      senderProfilePic: msg.profilePicture,
      avatar: msg.avatar,
      content: msg.content,
      imageUrl: msg.imageUrl
    });
    renderMessages();
  }
});

// ✅ Init
async function init() {
  await getCurrentUser();
  if (currentUser) {
    loadChatList();
    addImageUploadButton();
    addEmojiPickerButton();
  }
}

init();
