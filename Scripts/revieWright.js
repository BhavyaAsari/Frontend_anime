import { BASE_URL } from './config.js';

document.getElementById('reviewForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form); // ✅ Create FormData directly from form
  
  const animeTitle = formData.get('animeTitle')?.trim();
  const reviewText = formData.get('reviewText')?.trim();
  const ratingValue = formData.get('rating');
  const rating = parseInt(ratingValue);
  const animeImageFile = formData.get('animeImage');
  const toastElement = document.getElementById('successToast');
  
  if (!animeTitle || !reviewText || !ratingValue || isNaN(rating) || rating < 1 || rating > 5) {
    return alert("Please fill all fields correctly.");
  }
  
  try {
    const res = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      credentials: 'include',
      body: formData // ✅ Send the FormData object directly
    });
    
    if (res.ok) {
      const toast = new bootstrap.Toast(toastElement);
      toast.show();
      
      form.reset();
    } else if (res.status === 401) {
      alert("You must be logged in to submit a review.");
      // window.location.href = 'login.html';
    } else {
      const msg = await res.text();
      alert("Error: " + msg);
    }
  } catch (err) {
    console.error("Error submitting review:", err);
    alert("Something went wrong. Please try again later.");
  }
});

// Logout button functionality
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    if (res.ok) {
      window.location.href = 'login.html';
    } else {
      alert("Logout failed.");
    }
  } catch (err) {
    alert("Logout error: " + err.message);
  }
});