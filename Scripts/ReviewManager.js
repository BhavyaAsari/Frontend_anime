// import { BASE_URL } from './config'; // ✅ Add this import at the top

import { BASE_URL } from '../Scripts/config.js';


let reviews = [];
const reviewsContainer = document.getElementById("reviewsContainer");
const editReviewModal = new bootstrap.Modal(document.getElementById("editReviewModal"));

async function fetchReviews() {
  try {
    const res = await fetch(`${BASE_URL}/api/reviews/my`, { // ✅ Fixed
      credentials: "include"
    });
    reviews = await res.json();
    renderReviews();
  } catch (err) {
    console.error('Error fetching reviews:', err);
  }
}

function renderReviews() {
  reviewsContainer.innerHTML = "";

  if (reviews.length === 0) {
    reviewsContainer.innerHTML = "<p>No reviews yet.</p>";
    return;
  }

  reviews.forEach(review => {
    const card = document.createElement("div");
    card.className = "col-md-4 mb-4";
    
    // ✅ Fix image URL handling
    const imageUrl = review.animeImageUrl 
      ? (review.animeImageUrl.startsWith('http') 
          ? review.animeImageUrl 
          : `${BASE_URL}/${review.animeImageUrl}`)
      : '';
    
    card.innerHTML = `
      <div class="card">
        <div class="card-body">
          ${imageUrl ? `<img src="${imageUrl}" alt="${review.animeTitle}" class="img-fluid mb-3" style="max-height: 200px; object-fit: cover;">` : ""}
          <div class="card-content">
            <h5 class="card-title">${review.animeTitle}</h5>
            <p class="card-text">${review.reviewText}</p>
            <p class="card-text"><small class="text-muted">Rating: ${review.rating}</small></p>
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-primary" onclick="openEditForm('${review._id}')">Edit</button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteReview('${review._id}')">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `;
    reviewsContainer.appendChild(card);
  });
}

function openEditForm(id) {
  const review = reviews.find(r => r._id === id);
  if (!review) return;

  document.getElementById("editReviewId").value = review._id;
  document.getElementById("editTitle").value = review.animeTitle;
  document.getElementById("editContent").value = review.reviewText;
  document.getElementById("editRating").value = review.rating;

  editReviewModal.show();
}

async function deleteReview(id) {
  if (!confirm("Are you sure you want to delete this review?")) return;

  try {
    const response = await fetch(`${BASE_URL}/api/reviews/${id}`, { // ✅ Fixed
      method: 'DELETE',
      credentials: "include"
    });

    if (!response.ok) throw new Error("Failed to delete review");

    // Remove deleted review from local array and re-render
    reviews = reviews.filter(r => r._id !== id);
    renderReviews();

  } catch (error) {
    console.error("Error deleting review:", error);
    alert("Failed to delete review.");
  }
}

document.getElementById("editReviewForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const form = e.target;
  const oldFormData = new FormData(form);
  const reviewId = oldFormData.get("editReviewId");

  const formData = new FormData();
  formData.append("animeTitle", oldFormData.get("editTitle"));
  formData.append("reviewText", oldFormData.get("editContent"));
  formData.append("rating", oldFormData.get("editRating"));

  const imageFile = form.editImage.files[0];
  if (imageFile) {
    formData.append("animeImage", imageFile);
  }

  try {
    const response = await fetch(`${BASE_URL}/api/reviews/${reviewId}`, { // ✅ Fixed
      method: 'PUT',
      body: formData,
      credentials: "include"
    });

    if (!response.ok) throw new Error("Update failed");

    const updated = await response.json();

    const index = reviews.findIndex(r => r._id === reviewId);
    if (index !== -1) {
      reviews[index] = updated.review;
      renderReviews();
    }

    editReviewModal.hide();
  } catch (error) {
    console.error('Error updating review:', error);
    alert("Failed to update review.");
  }
});

// Initial load
fetchReviews();

// ✅ Fixed review submission form
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
      // Refresh the reviews list
      fetchReviews();
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