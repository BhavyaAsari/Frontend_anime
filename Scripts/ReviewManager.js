
    let reviews = [];
    const reviewsContainer = document.getElementById("reviewsContainer");
    const editReviewModal = new bootstrap.Modal(document.getElementById("editReviewModal"));

    async function fetchReviews() {
      try {
        const res = await fetch("http://localhost:3000/api/reviews/my", {
          credentials: "include"
        });
        reviews = await res.json();
         console.log("Fetched reviews data:", reviews);
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
        card.innerHTML = `
          <div class="card h-100">
            ${review.animeImageUrl ? `<img src="${review.animeImageUrl}" class="card-img-top" alt="Review Image">` : ""}
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">${review.animeTitle}</h5>
              <p class="card-text flex-grow-1">${review.reviewText}</p>
              <p class="card-text"><small class="text-muted">Rating: ${review.rating}</small></p>
              <div>
                <button class="btn btn-sm btn-outline-primary me-2" onclick="openEditForm('${review._id}')">Edit</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteReview('${review._id}')">Delete</button>
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
        const response = await fetch(`http://localhost:3000/api/reviews/${id}`, {
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
        const response = await fetch(`http://localhost:3000/api/reviews/${reviewId}`, {
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
