// const BASE_URL = 'http://localhost:3000';
import { BASE_URL } from '../Scripts/config.js';

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

    return await response.json();
  } catch (error) {
    console.error('Auth check error:', error);
    window.location.href = 'login.html';
  }
}

// Fetch and display user profile
async function fetchUserProfile() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/profile`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to fetch profile');

    const user = await response.json();

    document.getElementById('username').textContent = user.username || '';
    document.getElementById('userEmail').textContent = user.email || '';
    document.getElementById('usernameInput').value = user.username || '';
    document.getElementById('emailInput').value = user.email || '';
    document.getElementById('reviewsPosted').textContent = user.reviewsPosted || '0';
    document.getElementById('joinedAt').textContent = new Date(user.joinedAt).toLocaleDateString();
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

// Compress image before upload
function compressImage(file, maxWidth = 500, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.floor((maxWidth / width) * height);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
          'image/jpeg',
          quality
        );
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Delete profile picture
async function deleteProfilePicture() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/delete-profile-pic`, {
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

  const username = document.getElementById('usernameInput').value.trim();
  const email = document.getElementById('emailInput').value.trim();
  let profilePictureFile = document.getElementById('profilePicInput').files[0];

  if (!username || !email) {
    showErrorToast('Username and email are required');
    return;
  }

  try {
    const requests = [];

    // Update username & email
    requests.push(
      fetch(`${BASE_URL}/api/auth/update-profile`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email }),
      })
    );

    // Upload profile picture if exists
    if (profilePictureFile) {
      if (profilePictureFile.size > 5 * 1024 * 1024) {
        showErrorToast('Profile picture must be less than 5MB');
        return;
      }

      // Compress before upload
      profilePictureFile = await compressImage(profilePictureFile);

      const formData = new FormData();
      formData.append('profilePicture', profilePictureFile);

      requests.push(
        fetch(`${BASE_URL}/api/auth/upload-profile-pic`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        })
      );

      // Show preview immediately
      const previewUrl = URL.createObjectURL(profilePictureFile);
      document.getElementById('profilePicDisplay').src = previewUrl;
      document.getElementById('profilePicPreview').src = previewUrl;
    }

    // Run requests in parallel
    const responses = await Promise.all(requests);

    // Check for any failures
    for (const res of responses) {
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Profile update failed');
      }
    }

    await fetchUserProfile(); // Refresh UI from server
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

document.getElementById('deletePicBtn').addEventListener('click', deleteProfilePicture);

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
