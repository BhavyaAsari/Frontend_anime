// import { BASE_URL } from './config'; // ✅ Uncomment and use this
// // Remove the hardcoded BASE_URL line below
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
    console.log('User data:', userData);
    return userData;
  } catch (error) {
    console.error('Auth check error:', error);
    window.location.href = 'login.html';
  }
}

// ✅ Fixed fetchUserProfile function
async function fetchUserProfile() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to fetch profile');

    const user = await response.json();
    console.log('Profile data:', user);

    // Populate form fields
    document.getElementById('username').value = user.username || '';
    document.getElementById('email').value = user.email || '';

    // ✅ Fixed profile picture URL handling
    if (user.profilePicture) {
      const profilePicUrl = user.profilePicture.startsWith('http') 
        ? user.profilePicture 
        : `${BASE_URL}/${user.profilePicture}`;
      
      document.getElementById('currentProfilePic').src = profilePicUrl;
      document.getElementById('currentProfilePic').style.display = 'block';
      document.getElementById('profilePicPlaceholder').style.display = 'none';
    } else {
      document.getElementById('currentProfilePic').style.display = 'none';
      document.getElementById('profilePicPlaceholder').style.display = 'block';
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

    // Hide current image and show placeholder
    document.getElementById('currentProfilePic').style.display = 'none';
    document.getElementById('profilePicPlaceholder').style.display = 'block';
    
    showSuccessToast('Profile picture deleted successfully!');
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    showErrorToast('Failed to delete profile picture');
  }
}

// Profile form submission
document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData();
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const profilePictureFile = document.getElementById('profilePicture').files[0];

  if (!username || !email) {
    showErrorToast('Username and email are required');
    return;
  }

  formData.append('username', username);
  formData.append('email', email);

  if (profilePictureFile) {
    // Validate file size (5MB limit)
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
    console.log('Update result:', result);

    // ✅ Fixed profile picture display after upload
    if (result.user && result.user.profilePicture) {
      const profilePicUrl = result.user.profilePicture.startsWith('http') 
        ? result.user.profilePicture 
        : `${BASE_URL}/${result.user.profilePicture}`;
      
      document.getElementById('currentProfilePic').src = profilePicUrl;
      document.getElementById('currentProfilePic').style.display = 'block';
      document.getElementById('profilePicPlaceholder').style.display = 'none';
    }

    showSuccessToast('Profile updated successfully!');
    
    // Clear the file input
    document.getElementById('profilePicture').value = '';

  } catch (error) {
    console.error('Error updating profile:', error);
    showErrorToast(error.message || 'Failed to update profile');
  }
});

// Add event listener for delete button
document.getElementById('deleteProfilePicBtn').addEventListener('click', deleteProfilePicture);

// Logout functionality
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

// Load profile data when page loads
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await fetchUserProfile();
});