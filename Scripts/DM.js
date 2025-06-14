// import { BASE_URL } from './config';

// console.log(BASE_URL); 
const BASE_URL = 'https://animehub-server.onrender.com';




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

// ✅ Add image upload elements
const imageInput = document.createElement('input');
imageInput.type = 'file';
imageInput.accept = 'image/*';
imageInput.style.display = 'none';
document.body.appendChild(imageInput);

// ✅ Helper function to get profile image URL
function getProfileImageUrl(user) {
  if (user?.profilePicture?.startsWith('http')) {
    return user.profilePicture;
  }

  if (user?.profilePicture) {
    return `${BASE_URL}/${user.profilePicture}`;
  }

  if (user?.avatar?.startsWith('http')) {
    return user.avatar;
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'User')}&background=random&color=fff&size=40`;
}

// Get current user info
async function getCurrentUser() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      credentials: 'include'
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = 'login.html';
        return;
      }
      throw new Error('Failed to get user info');
    }
    currentUser = await res.json();
    console.log('Current user:', currentUser);
  } catch (err) {
    console.error('Error getting current user:', err);
    showError('Failed to load user information');
  }
}

// Show error message
function showError(message) {
  chatBox.innerHTML = `<div class="error">${message}</div>`;
}

// Show loading state
function showLoading(element, message = 'Loading...') {
  element.innerHTML = `<li class="loading">${message}</li>`;
}

// Helper function to compare IDs safely
function compareIds(id1, id2) {
  if (!id1 || !id2) return false;
  return id1.toString() === id2.toString();
}

// ✅ Updated render messages to handle images
function renderMessages() {
  if (messages.length === 0) {
    chatBox.innerHTML = '<div class="empty-state">No messages yet. Start the conversation!</div>';
    return;
  }

  chatBox.innerHTML = "";
  messages.forEach(msg => {
    const div = document.createElement("div");
    const isCurrentUser = compareIds(msg.senderId, currentUser._id);
    div.className = isCurrentUser ? "msg-right" : "msg-left";
    
    // Get sender name
    let senderName;
    if (isCurrentUser) {
      senderName = 'You';
    } else {
      senderName = msg.senderName || msg.username || 'User';
    }
    
    // Get profile image
    let profileImg;
    if (isCurrentUser) {
      profileImg = getProfileImageUrl(currentUser);
    } else {
      const msgUser = {
        profilePicture: msg.profileImage || msg.profilePicture,
        avatar: msg.avatar,
        username: senderName
      };
      profileImg = getProfileImageUrl(msgUser);

    }
    console.log("url final = ",profileImg);
    // ✅ Handle both text and image messages
    let messageContent = '';
    console.log("url = ",msg.imageUrl);
    if (msg.imageUrl) {
      const imageUrl = msg.imageUrl.startsWith('http') ? msg.imageUrl : `${BASE_URL}${msg.imageUrl}`;
      messageContent = `<img src="${imageUrl}" alt="Shared image" class="shared-image" style="max-width: 200px; max-height: 200px; border-radius: 8px; margin: 5px 0;">`;
    }
    if (msg.content) {
      messageContent += `<div>${escapeHtml(msg.content)}</div>`;
    }
    
    div.innerHTML = `
      <div class="msg-wrapper">
       ${!isCurrentUser ? `<img src="${profileImg}" alt="${senderName}" class="profile-img" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random&color=fff&size=32'" />` : ''}

        <span class="msg-bubble ${isCurrentUser ? 'you' : ''}">
          <strong>${senderName}:</strong> ${messageContent}
        </span>
        ${isCurrentUser ? `<img src="${profileImg}" alt="You" class="profile-img" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.username)}&background=random&color=fff&size=32'">` : ''}
      </div>
    `;
    chatBox.appendChild(div);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ✅ Updated chat list rendering
function renderChatList(chats) {
  if (chats.length === 0) {
    chatListEl.innerHTML = '<li class="list-group-item text-center text-muted">No chats yet</li>';
    return;
  }

  chatListEl.innerHTML = '';
  chats.forEach(chat => {
    const otherUser = chat.members.find(m => !compareIds(m._id, currentUser._id));
    if (!otherUser) return;

    const li = document.createElement('li');
    li.className = 'list-group-item list-group-item-action p-0';
    
    const profileImg = getProfileImageUrl(otherUser);
   
    li.innerHTML = `
      <div class="user-item">
        <img src="${profileImg}" class="profile-img" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.username)}&background=random&color=fff&size=40'">
        <div class="user-info">
          <p class="username">${otherUser.username}</p>
          <p class="last-message">${chat.lastMessage ? (chat.lastMessage.content.length > 30 ? chat.lastMessage.content.substring(0, 30) + '...' : chat.lastMessage.content) : 'No messages yet'}</p>
        </div>
      </div>
    `;
    
    li.title = `Chat with ${otherUser.username}`;
    li.addEventListener('click', () => openChat(chat, otherUser));
    chatListEl.appendChild(li);
  });
}

// Load chat list from backend
async function loadChatList() {
  try {
    showLoading(chatListEl, 'Loading your chats...');
    const res = await fetch(`${BASE_URL}/api/one-on-one/chatlist`, {
      credentials: 'include',
      method: 'GET'
    });
    
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = 'login.html';
        return;
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const chats = await res.json();
    console.log('Loaded chats:', chats);
    renderChatList(chats);
  } catch (err) {
    console.error('Error loading chat list:', err);
    chatListEl.innerHTML = '<li class="list-group-item text-danger">Failed to load chats</li>';
  }
}

// ✅ Updated message loading to handle images
async function loadMessages(chatId) {
  try {
    const res = await fetch(`${BASE_URL}/api/messages/chat/${chatId}`, {
      credentials: 'include'
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const msgs = await res.json();
    messages.length = 0;
    messages.push(...msgs.map(m => ({
      senderId: m.sender._id,
      senderName: m.sender.username,
      username: m.sender.username,
      profileImage: m.sender.profilePicture,
      profilePicture: m.sender.profilePicture,
      avatar: m.sender.avatar,
      content: m.content,
      imageUrl: m.imageUrl // ✅ Include image URL
    })));
    renderMessages();
  } catch (err) {
    console.error('Error loading messages:', err);
    showError('Failed to load messages. Please try again.');
  }
}

// Open or start a chat from chat list or search result
async function openChat(chat, otherUser) {
  chatId = chat._id;
  receiverId = otherUser._id;
  chatTitle.textContent = `Chat with ${otherUser.username}`;
  messages.length = 0;
  renderMessages();
  chatForm.style.display = 'flex';

  socket.emit('joinChat', chatId);
  await loadMessages(chatId);

  localStorage.setItem('selectedChat', JSON.stringify({
    chatId,
    receiverId,
    receiverUsername: otherUser.username,
    receiverProfile: otherUser.profilePicture || otherUser.avatar || null
  }));
  
  // Clear search results and input
  resultsList.innerHTML = '';
  searchInput.value = '';
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
      
      const res = await fetch(`${BASE_URL}/api/auth/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const users = await res.json();
      resultsList.innerHTML = '';

      if (users.length === 0) {
        resultsList.innerHTML = '<li class="list-group-item text-muted">No users found</li>';
        return;
      }

      users.forEach(user => {
        if (compareIds(user._id, currentUser._id)) return;

        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action p-0';
        
        const profileImg = getProfileImageUrl(user);
 
        li.innerHTML = `
          <div class="user-item">
            <img src="${profileImg}" alt="${user.username}" class="profile-img" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff&size=40'">
            <div class="user-info">
              <p class="username">${user.username}</p>
              <p class="last-message">Click to start chatting</p>
            </div>
          </div>
        `;
        
        li.title = `Start chat with ${user.username}`;
        
        li.addEventListener('click', async () => {
          try {
            resultsList.innerHTML = '<li class="list-group-item loading">Starting chat...</li>';
            
            const chatRes = await fetch(`${BASE_URL}/api/one-on-one/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ otherUserId: user._id })
            });
            
            if (!chatRes.ok) {
              throw new Error(`HTTP ${chatRes.status}: ${chatRes.statusText}`);
            }
            
            const chat = await chatRes.json();
            await openChat(chat, user);
            
            loadChatList();
          } catch (err) {
            console.error('Error starting chat:', err);
            resultsList.innerHTML = '<li class="list-group-item text-danger">Failed to start chat</li>';
          }
        });
        
        resultsList.appendChild(li);
      });
    } catch (err) {
      console.error('Search error:', err);
      resultsList.innerHTML = '<li class="list-group-item text-danger">Search failed</li>';
    }
  }, 300);
});

// ✅ Add image upload button to chat form
function addImageUploadButton() {
  const imageBtn = document.createElement('button');
  imageBtn.type = 'button';
  imageBtn.innerHTML = '📷';
  imageBtn.title = 'Upload Image';
  imageBtn.className = 'btn btn-outline-secondary';
  imageBtn.addEventListener('click', () => imageInput.click());
  
  // Insert before the send button
  const sendBtn = chatForm.querySelector('button[type="submit"]');
  chatForm.insertBefore(imageBtn, sendBtn);
}

// ✅ Updated message sending with image support
async function sendMessage(content = '', imageFile = null) {
  if ((!content.trim() && !imageFile) || !chatId || !currentUser) return;

  const formData = new FormData();
  formData.append('chat', chatId);
  formData.append('chatModel', 'DirectMessage');
  
  if (content.trim()) {
    formData.append('content', content);
  }
  
  if (imageFile) {
    formData.append('image', imageFile);
  }

  // Disable form while sending
  const submitBtn = chatForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Sending...';
  submitBtn.disabled = true;
  messageInput.disabled = true;

  try {
    const res = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      credentials: 'include',
      body: formData, // ✅ Use FormData for file upload
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const savedMsg = await res.json();
    messages.push({
      senderId: currentUser._id,
      senderName: currentUser.username,
      username: currentUser.username,
      profileImage: currentUser.profilePicture,
      profilePicture: currentUser.profilePicture,
      avatar: currentUser.avatar,
      content: savedMsg.content,
      imageUrl: savedMsg.imageUrl, // ✅ Include image URL
    });
    
    renderMessages();
    messageInput.value = '';

    // ✅ Socket emission with image support
    socket.emit('sendMessage', { 
      chatId, 
      content: savedMsg.content,
      imageUrl: savedMsg.imageUrl, // ✅ Include image URL
      senderId: currentUser._id, 
      senderName: currentUser.username,
      username: currentUser.username,
      profilePicture: currentUser.profilePicture || currentUser.avatar,
      receiverId 
    });

  } catch (err) {
    console.error('Error sending message:', err);
    alert('Failed to send message. Please try again.');
  } finally {
    // Re-enable form
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
  }
}

// ✅ Handle image selection
imageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    await sendMessage('', file);
    imageInput.value = ''; // Clear the input
  }
});

// ✅ Updated form submission
chatForm.addEventListener('submit', async e => {
  e.preventDefault();
  const content = messageInput.value.trim();
  await sendMessage(content);
});

// ✅ Updated socket message reception
socket.on('receiveMessage', (msg) => {
  console.log('Received message:', msg);

  if (msg.chatId === chatId && !compareIds(msg.senderId, currentUser._id)) {
    messages.push({
      senderId: msg.senderId,
      senderName: msg.senderName,
      username: msg.username || msg.senderName,
      profileImage: msg.profilePicture,
      profilePicture: msg.profilePicture,
      avatar: msg.avatar,
      content: msg.content,
      imageUrl: msg.imageUrl // ✅ Include image URL
    });
    renderMessages();
  }
});

socket.on('connect', () => {
  console.log("✅ Connected to socket server");
});

socket.on('disconnect', () => {
  console.log("❌ Disconnected from socket server");
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    window.location.href = 'login.html';
  } catch (err) {
    console.error('Logout error:', err);
    window.location.href = 'login.html';
  }
});

// Initialize app
async function init() {
  await getCurrentUser();
  if (currentUser) {
    loadChatList();
    addImageUploadButton(); // ✅ Add image upload button
  }

  const storedChat = localStorage.getItem('selectedChat');
  if (storedChat) {
    try {
      const { chatId: storedChatId, receiverId: storedReceiverId, receiverUsername, receiverProfile } = JSON.parse(storedChat);

      chatId = storedChatId;
      receiverId = storedReceiverId;
      chatTitle.textContent = `Chat with ${receiverUsername}`;
      messages.length = 0;
      renderMessages();
      chatForm.style.display = 'flex';

      socket.emit('joinChat', chatId);
      await loadMessages(chatId);

    } catch (err) {
      console.error('Failed to restore chat from localStorage:', err);
    }
  }
}

// Start the app
init();