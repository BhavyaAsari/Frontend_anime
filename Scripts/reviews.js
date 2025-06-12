let allReviews = [];
const BASE_URL = 'http://localhost:3000';
const reviewFullTextMap = {}; // Stores full review text safely
const expandedReviews = new Set(); // Track which reviews are expanded

document.addEventListener('DOMContentLoaded', () => {
  fetchReviews();
  setupEventListeners();
});

// Setup events for filtering and logout
function setupEventListeners() {
  document.getElementById('searchInput').addEventListener('input', filterReviews);
  document.getElementById('ratingFilter').addEventListener('change', filterReviews);
  document.getElementById('sortBy').addEventListener('change', filterReviews);

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        alert("Logged out successfully!");
        window.location.href = 'login.html';
      } else {
        alert("Logout failed.");
      }
    } catch (err) {
      console.error("Logout error:", err);
      alert("Logout error: " + err.message);
    }
  });
}

// Fetch all reviews from server
async function fetchReviews() {
  try {
    showLoading(true);
    const res = await fetch(`${BASE_URL}/api/reviews`, { credentials: 'include' });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    allReviews = await res.json();
    console.log('Fetched reviews:', allReviews.length);
    displayReviews(allReviews);
  } catch (err) {
    console.error("Failed to fetch reviews:", err);
    showError("Failed to load reviews. Please try again later.");
  } finally {
    showLoading(false);
  }
}

// Render review cards
function displayReviews(reviews) {
  const container = document.getElementById('reviewsContainer');
  const noReviewsDiv = document.getElementById('noReviews');

  container.innerContent = '';
  if (reviews.length === 0) {
    noReviewsDiv.style.display = 'block';
    return;
  }
  noReviewsDiv.style.display = 'none';

  reviews.forEach(review => {
    createReviewCard(review, container);
  });
}

// Create individual review card
function createReviewCard(review, container) {
  const card = document.createElement('div');
  card.className = 'col-lg-4 col-md-6 mb-4';
  card.setAttribute('data-review-id', review._id);

  const imageUrl = review.animeImageUrl?.trim()
    ? `${BASE_URL}${review.animeImageUrl}`
    : null;

  const imageHtml = imageUrl
    ? `<img src="${imageUrl}" alt="${escapeHtml(review.animeTitle)}" class="anime-image" onerror="handleImageError(this)">`
    : `<div class="placeholder-image">
         <div>
           <i class="fas fa-image mb-2"></i><br>
           No Image Available
         </div>
       </div>`;

  // Store full review text with unique key
  reviewFullTextMap[review._id] = review.reviewText;

  // Check if this specific review is currently expanded
  const isExpanded = expandedReviews.has(review._id);
  const displayText = isExpanded 
    ? escapeHtml(review.reviewText) 
    : escapeHtml(truncate(review.reviewText, 120));
  
  // Only show button if text is long enough to truncate
  const needsToggle = review.reviewText.length > 120;
  const buttonText = isExpanded ? 'Read Less' : 'Read More';

  card.innerHTML = `
    <div class="card h-100 shadow-sm review-card">
      ${imageHtml}
      <div class="card-body d-flex flex-column">
        <h5 class="card-title text-primary">${escapeHtml(review.animeTitle)}</h5>
        <h6 class="card-subtitle mb-2 text-muted review-meta">
          <i class="fas fa-user"></i> ${escapeHtml(review.user?.username || 'Anonymous')}<br>
          <i class="fas fa-calendar"></i> ${formatDate(review.createdAt)}
        </h6>
        <div class="rating-stars mb-2">
          ${generateStars(review.rating)} <span class="text-muted">(${review.rating}/5)</span>
        </div>
        <p class="card-text review-text flex-grow-1" id="review-text-${review._id}">
          ${displayText}
        </p>
        <div class="mt-auto">
          ${needsToggle ? `
            <button class="btn btn-sm btn-outline-primary toggle-review-btn" 
                    id="toggle-btn-${review._id}"
                    onclick="toggleSpecificReview('${review._id}')"
                    type="button">
              ${buttonText}
            </button>` : ''
          }
        </div>
      </div>
    </div>
  `;

  container.appendChild(card);
}

// Toggle specific review text - FIXED VERSION
function toggleSpecificReview(reviewId) {
  console.log('toggleSpecificReview called for:', reviewId);
  
  // Get the specific elements using unique IDs
  const textElement = document.getElementById(`review-text-${reviewId}`);
  const buttonElement = document.getElementById(`toggle-btn-${reviewId}`);
  
  if (!textElement || !buttonElement) {
    console.error('Elements not found for reviewId:', reviewId);
    return;
  }
  
  const fullText = reviewFullTextMap[reviewId];
  if (!fullText) {
    console.error('Full text not found for reviewId:', reviewId);
    return;
  }

  const isCurrentlyExpanded = expandedReviews.has(reviewId);
  console.log('Current state for', reviewId, '- isExpanded:', isCurrentlyExpanded);
  
  if (isCurrentlyExpanded) {
    // Collapse: Show truncated text
    textElement.innerHTML = escapeHtml(truncate(fullText, 120));
    buttonElement.textContent = 'Read More';
    expandedReviews.delete(reviewId);
    console.log('Collapsed review:', reviewId);
  } else {
    // Expand: Show full text
    textElement.innerHTML = escapeHtml(fullText);
    buttonElement.textContent = 'Read Less';
    expandedReviews.add(reviewId);
    console.log('Expanded review:', reviewId);
  }
}

// Filter and sort reviews
function filterReviews() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const ratingFilter = document.getElementById('ratingFilter').value;
  const sortBy = document.getElementById('sortBy').value;

  let filtered = allReviews.filter(review => {
    const matchSearch = review.animeTitle.toLowerCase().includes(searchTerm) ||
                        review.reviewText.toLowerCase().includes(searchTerm) ||
                        (review.user?.username || '').toLowerCase().includes(searchTerm);
    const matchRating = !ratingFilter || review.rating >= parseInt(ratingFilter);
    return matchSearch && matchRating;
  });

  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
      case 'rating-high': return b.rating - a.rating;
      case 'rating-low': return a.rating - b.rating;
      case 'newest':
      default: return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  console.log('Filtering reviews, found:', filtered.length);
  displayReviews(filtered);
}

// Truncate long text
function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + "..." : str;
}

// Star rating display
function generateStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) stars += i <= rating ? '★' : '☆';
  return stars;
}

// Format date to readable form
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle image errors
function handleImageError(img) {
  const altText = img.alt || 'Unknown';
  img.outerHTML = `
    <div class="placeholder-image">
      <div>
        <i class="fas fa-exclamation-triangle mb-2"></i><br>
        Image Failed to Load<br>
        <small class="text-muted">${escapeHtml(altText)}</small>
      </div>
    </div>`;
}

// Show/hide loading spinner
function showLoading(show) {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) spinner.style.display = show ? 'block' : 'none';
}

// Display fallback error message
function showError(message) {
  const container = document.getElementById('reviewsContainer');
  container.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger text-center" role="alert">
        <h4 class="alert-heading">Error</h4>
        <p>${message}</p>
        <button class="btn btn-outline-danger" onclick="fetchReviews()">Try Again</button>
      </div>
    </div>`;
}

// Auto-refresh reviews every 5 minutes (changed from 30000000 to 300000)
setInterval(fetchReviews, 300000);