const BASE_URL = 'https://animehub-server.onrender.com';

// Toast functions
function showSuccessToast(message = "Profile updated successfully!") {
  document.getElementById('successToastBody').textContent = message;
  const toast = new bootstrap.Toast(document.getElementById('successToast'));
  toast.show();
}

function showErrorToast(message = "An error occurred!") {
  document.getElementById('errorToastBody').textContent = message;
  const toast = new bootstrap.Toast(document.getElementById('errorToast'));
  toast.show();
}

// Check authentication on page load
async function checkAuth() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = 'login.html';
        return;
      }
      throw new Error('Authentication check failed');
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Auth check error:', error);
    window.location.href = 'login.html';
  }
}

// Fetch and display user profile
async function fetchUserProfile() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to fetch profile');

    const user = await response.json();

    // Update display
    document.getElementById('username').textContent = user.username || '';
    document.getElementById('userEmail').textContent = user.email || '';
    document.getElementById('usernameInput').value = user.username || '';
    document.getElementById('emailInput').value = user.email || '';
    document.getElementById('reviewsPosted').textContent = user.reviewsCount || '0';
    document.getElementById('joinedAt').textContent = new Date(user.createdAt).toLocaleDateString();
    document.getElementById('welcomeMessage').textContent = `Welcome, ${user.username}!`;

    if (user.profilePicture) {
      const profilePicUrl = user.profilePicture.startsWith('http')
        ? user.profilePicture
        : `${BASE_URL}/${user.profilePicture}`;
      document.getElementById('profilePicDisplay').src = profilePicUrl;
      document.getElementById('profilePicPreview').src = profilePicUrl;
    }

  } catch (error) {
    console.error('Error fetching profile:', error);
    showErrorToast('Failed to load profile data');
  }
}

// Delete profile picture
async function deleteProfilePicture() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/profile-picture`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to delete profile picture');

    document.getElementById('profilePicDisplay').src = 'https://via.placeholder.com/150?text=Profile+Pic';
    document.getElementById('profilePicPreview').src = 'https://via.placeholder.com/150?text=Profile+Pic';

    showSuccessToast('Profile picture deleted successfully!');
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    showErrorToast('Failed to delete profile picture');
  }
}

// Submit profile form
document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData();
  const username = document.getElementById('usernameInput').value.trim();
  const email = document.getElementById('emailInput').value.trim();
  const profilePictureFile = document.getElementById('profilePicInput').files[0];

  if (!username || !email) {
    showErrorToast('Username and email are required');
    return;
  }

  formData.append('username', username);
  formData.append('email', email);

  if (profilePictureFile) {
    if (profilePictureFile.size > 5 * 1024 * 1024) {
      showErrorToast('Profile picture must be less than 5MB');
      return;
    }
    formData.append('profilePicture', profilePictureFile);
  }

  try {
    const response = await fetch(`${BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update profile');
    }

    const result = await response.json();

    if (result.user && result.user.profilePicture) {
      const profilePicUrl = result.user.profilePicture.startsWith('http')
        ? result.user.profilePicture
        : `${BASE_URL}/${result.user.profilePicture}`;
      document.getElementById('profilePicDisplay').src = profilePicUrl;
      document.getElementById('profilePicPreview').src = profilePicUrl;
    }

    showSuccessToast('Profile updated successfully!');
    document.getElementById('profilePicInput').value = '';
  } catch (error) {
    console.error('Error updating profile:', error);
    showErrorToast(error.message || 'Failed to update profile');
  }
});

// Handle logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });

    if (response.ok) {
      window.location.href = 'login.html';
    } else {
      showErrorToast('Logout failed');
    }
  } catch (error) {
    console.error('Logout error:', error);
    showErrorToast('Logout failed');
  }
});

// Handle delete profile picture button
document.getElementById('deletePicBtn').addEventListener('click', deleteProfilePicture);

// Toggle profile edit view
document.getElementById('editProfileBtn').addEventListener('click', () => {
  document.getElementById('editProfileSection').style.display = 'block';
});

function hideEditProfile() {
  document.getElementById('editProfileSection').style.display = 'none';
}

// Run on page load
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await fetchUserProfile();
});
