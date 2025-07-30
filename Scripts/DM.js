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
  
  // Handle new response format with success/data structure
  if (data.hasOwnProperty('success')) {
    if (!data.success) {
      throw new Error(data.message || 'Request failed');
    }
    return data.data;
  }
  
  // Handle old response format for backward compatibility
  return data;
}

// ✅ Helper function to get profile image URL
function getProfileImageUrl(user) {
  if (!user) return `https://ui-avatars.com/api/?name=User&background=random&color=fff&size=40`;
  
  if (user.profilePicture) {
    if (user.profilePicture.startsWith('http')) {
      return user.profilePicture;
    }
    // Handle the backend's profile picture URL format
    if (user.profilePicture.startsWith('/uploads/')) {
      return `${BASE_URL}${user.profilePicture}`;
    }
    return `${BASE_URL}/${user.profilePicture}`;
  }

  if (user.avatar?.startsWith('http')) {
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
    
    currentUser = await handleApiResponse(res);
    if (currentUser) {
      console.log('Current user:', currentUser);
    }
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

// Helper function to compare IDs safely
function compareIds(id1, id2) {
  if (!id1 || !id2) return false;
  return id1.toString() === id2.toString();
}

// ✅ Updated render messages to handle images and new message format
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
        profilePicture: msg.senderProfilePic || msg.profileImage || msg.profilePicture,
        avatar: msg.avatar,
        username: senderName
      };
      profileImg = getProfileImageUrl(msgUser);
    }
    
    console.log("Profile image URL:", profileImg);
    
    // ✅ Handle both text and image messages
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
       ${!isCurrentUser ? `<img src="${profileImg}" alt="${senderName}" class="profile-img" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 8px;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random&color=fff&size=32'" />` : ''}

        <span class="msg-bubble ${isCurrentUser ? 'you' : ''}" style="display: inline-block; padding: 8px 12px; border-radius: 18px; max-width: 70%; word-wrap: break-word; ${isCurrentUser ? 'background-color: #007bff; color: white;' : 'background-color: #f1f1f1; color: black;'}">
          ${!isCurrentUser ? `<strong>${senderName}:</strong> ` : ''}${messageContent}
        </span>
        ${isCurrentUser ? `<img src="${profileImg}" alt="You" class="profile-img" style="width: 32px; height: 32px; border-radius: 50%; margin-left: 8px;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.username)}&background=random&color=fff&size=32'">` : ''}
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

// ✅ Updated chat list rendering with new response format
function renderChatList(chats) {
  if (!chats || chats.length === 0) {
    chatListEl.innerHTML = '<li class="list-group-item text-center text-muted">No chats yet</li>';
    return;
  }

  chatListEl.innerHTML = '';
  chats.forEach(chat => {
    // Handle both old and new response formats
    const otherUser = chat.otherUser || chat.members?.find(m => !compareIds(m._id, currentUser._id));
    if (!otherUser) return;

    const li = document.createElement('li');
    li.className = 'list-group-item list-group-item-action p-0';
    
    const profileImg = getProfileImageUrl(otherUser);
   
    li.innerHTML = `
      <div class="user-item" style="display: flex; align-items: center; padding: 12px;">
        <img src="${profileImg}" class="profile-img" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 12px;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.username)}&background=random&color=fff&size=40'">
        <div class="user-info" style="flex: 1; min-width: 0;">
          <p class="username" style="margin: 0; font-weight: 500; color: #333;">${otherUser.username}</p>
          <p class="last-message" style="margin: 0; font-size: 0.9em; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${chat.lastMessage?.content ? (chat.lastMessage.content.length > 30 ? chat.lastMessage.content.substring(0, 30) + '...' : chat.lastMessage.content) : 'No messages yet'}</p>
        </div>
      </div>
    `;
    
    li.title = `Chat with ${otherUser.username}`;
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => openChat(chat, otherUser));
    chatListEl.appendChild(li);
  });
}

// ✅ Updated load chat list with new response format
async function loadChatList() {
  try {
    showLoading(chatListEl, 'Loading your chats...');
    const res = await fetch(`${BASE_URL}/api/one-on-one/chatlist`, {
      credentials: 'include',
      method: 'GET'
    });
    
    const chats = await handleApiResponse(res);
    if (chats) {
      console.log('Loaded chats:', chats);
      renderChatList(chats);
    }
  } catch (err) {
    console.error('Error loading chat list:', err);
    chatListEl.innerHTML = '<li class="list-group-item text-danger">Failed to load chats</li>';
  }
}

// ✅ Updated message loading with new response format
async function loadMessages(chatId) {
  try {
    const res = await fetch(`${BASE_URL}/api/messages/chat/${chatId}`, {
      credentials: 'include'
    });
    
    const data = await handleApiResponse(res);
    if (!data) return;
    
    // Handle new response format
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

// ✅ Updated open chat with new response format
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

// ✅ Updated search functionality
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
          <div class="user-item" style="display: flex; align-items: center; padding: 12px;">
            <img src="${profileImg}" alt="${user.username}" class="profile-img" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 12px;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff&size=40'">
            <div class="user-info" style="flex: 1;">
              <p class="username" style="margin: 0; font-weight: 500; color: #333;">${user.username}</p>
              <p class="last-message" style="margin: 0; font-size: 0.9em; color: #666;">Click to start chatting</p>
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
            
            const chat = await handleApiResponse(chatRes);
            if (chat) {
              await openChat(chat, user);
              loadChatList();
            }
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
  // Check if button already exists
  if (document.querySelector('.image-upload-btn')) return;
  
  const imageBtn = document.createElement('button');
  imageBtn.type = 'button';
  imageBtn.innerHTML = '📷';
  imageBtn.title = 'Upload Image';
  imageBtn.className = 'btn btn-outline-secondary image-upload-btn';
  imageBtn.style.marginRight = '8px';
  imageBtn.addEventListener('click', () => imageInput.click());
  
  // Insert before the send button
  const sendBtn = chatForm.querySelector('button[type="submit"]');
  if (sendBtn) {
    chatForm.insertBefore(imageBtn, sendBtn);
  }
}

// ✅ Updated message sending with new response format

async function sendMessage(content = '', imageFile = null) {
  if ((!content.trim() && !imageFile) || !chatId || !currentUser) return;

  // Disable form while sending
  const submitBtn = chatForm.querySelector('button[type="submit"]');
  const originalText = submitBtn?.textContent || 'Send';
  if (submitBtn) {
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
  }
  messageInput.disabled = true;

  try {
    // ✅ FIXED: Use the same endpoint for both text and image messages
    const formData = new FormData();
    formData.append('chat', chatId);
    formData.append('chatModel', 'DirectMessage');
    
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    if (content.trim()) {
      formData.append('content', content.trim());
    }

    console.log('Sending message to chat:', chatId);

    const res = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const savedMsg = await handleApiResponse(res);
    if (!savedMsg) return;

    console.log('Message sent successfully:', savedMsg);

    // Add message to local array
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

    // ✅ Socket emission with image support
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
    // Re-enable form
    if (submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
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
  if (content) {
    await sendMessage(content);
  }
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
      senderProfilePic: msg.profilePicture,
      avatar: msg.avatar,
      content: msg.content,
      imageUrl: msg.imageUrl
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
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
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
    addImageUploadButton();
  }

  const storedChat = localStorage.getItem('selectedChat');
  if (storedChat) {
    try {
      const {
        chatId: storedChatId,
        receiverId: storedReceiverId,
        receiverUsername,
        receiverProfile
      } = JSON.parse(storedChat);

      // Validate chatId is a valid MongoDB ObjectId length (24 characters)
      if (storedChatId && storedChatId.length === 24 && /^[a-f\d]{24}$/i.test(storedChatId)) {
        console.log('Restoring valid chatId:', storedChatId);
        chatId = storedChatId;
        receiverId = storedReceiverId;
        chatTitle.textContent = `Chat with ${receiverUsername}`;
        messages.length = 0;
        renderMessages();
        chatForm.style.display = 'flex';

        socket.emit('joinChat', chatId);
        await loadMessages(chatId);
      } else {
        console.warn('Invalid chatId found in localStorage. Clearing...');
        localStorage.removeItem('selectedChat');
      }
    } catch (err) {
      console.error('Failed to restore chat from localStorage:', err);
      localStorage.removeItem('selectedChat');
    }
  }
}


// Start the app
init();