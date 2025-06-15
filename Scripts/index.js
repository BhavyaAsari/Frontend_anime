// import { BASE_URL } from './config';

// console.log('BAse:',BASE_URL);
const BASE_URL = 'https://animehub-server.onrender.com';



    // Toast functions
    function showSuccessToast(message = "Profile updated successfully!") {
      document.getElementById('successToastBody').textContent = message;
      const toast = new bootstrap.Toast(document.getElementById('successToast'));
      toast.show();
    }

    function showErrorToast(message = "Failed to update profile!") {
      document.getElementById('errorToastBody').textContent = message;
      const toast = new bootstrap.Toast(document.getElementById('errorToast'));
      toast.show();
    }

    // Hide edit profile section
    function hideEditProfile() {
      document.getElementById("editProfileSection").style.display = "none";
    }

    // Show edit profile section
    function showEditProfile() {
      document.getElementById("editProfileSection").style.display = "block";
      document.getElementById("editProfileSection").scrollIntoView({ behavior: "smooth" });
    }

    async function fetchUserProfile() {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/profile`, {
          credentials: "include",
        });

        if (res.ok) {
          const user = await res.json();
          console.log("User data:", user); // Debug log

          // Update welcome message and static profile card
          document.getElementById("welcomeMessage").textContent = `Welcome, ${user.username}!`;
          document.querySelector(".profile-card #username").textContent = user.username;
          document.getElementById("userEmail").textContent = user.email || "Not provided";
          document.getElementById("reviewsPosted").textContent = user.reviewsPosted || 0;

          if (user.joinedAt) {
            const joinedDate = new Date(user.joinedAt);
            document.getElementById("joinedAt").textContent = joinedDate.toDateString();
          } else {
            document.getElementById("joinedAt").textContent = "Unknown";
          }

          // Prefill the profile edit form inputs
          document.getElementById("usernameInput").value = user.username;
          document.getElementById("emailInput").value = user.email || "";

          // Set profile picture if user has one
          if (user.profilePicture) {
            // Check if it's already a full URL (Cloudinary) or a relative path
            const profilePicUrl = user.profilePicture.startsWith('http') 
              ? user.profilePicture 
              : `${BASE_URL}/${user.profilePicture}`;
              
            document.getElementById("profilePicDisplay").src = profilePicUrl;
            document.getElementById("profilePicPreview").src = profilePicUrl;
          } else {
            // Keep placeholder
            document.getElementById("profilePicDisplay").src = "https://via.placeholder.com/150?text=Profile+Pic";
            document.getElementById("profilePicPreview").src = "https://via.placeholder.com/150?text=Profile+Pic";
          }
        } else {
          console.error("Profile fetch failed:", res.status);
          showErrorToast("Failed to load profile data");
          // Optional redirect on unauthorized:
          // window.location.href = 'login.html';
        }
      } catch (err) {
        console.error("Fetch failed:", err);
        showErrorToast("Network error while loading profile");
        // Optional redirect on network error:
        // window.location.href = 'login.html';
      }
    }

    fetchUserProfile();

    // Logout logic
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      try {
        const res = await fetch(  `${BASE_URL}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
        if (res.ok) {
          window.location.href = "login.html";
        } else {
          showErrorToast("Logout failed with status " + res.status);
        }
      } catch (err) {
        showErrorToast("Logout failed: " + err.message);
      }
    });

    // Profile picture preview update
    const profilePicInput = document.getElementById("profilePicInput");
    const profilePicPreview = document.getElementById("profilePicPreview");

    profilePicInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        profilePicPreview.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

    // Upload profile picture separately
    document.getElementById("uploadPicBtn").addEventListener("click", async () => {
      const fileInput = document.getElementById("profilePicInput");
      const file = fileInput.files[0];
      
      if (!file) {
        showErrorToast("Please select a picture first!");
        return;
      }

      const uploadBtn = document.getElementById("uploadPicBtn");
      const spinner = document.getElementById("uploadSpinner");
      uploadBtn.disabled = true;
      spinner.classList.remove("d-none");

      try {
        const formData = new FormData();
        formData.append("profilePicture", file);

        const res = await fetch(`${BASE_URL}/api/auth/upload-profile-pic`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (res.ok) {
          const result = await res.json();
          showSuccessToast("Profile picture uploaded successfully!");
          
          // Update the display image - handle both relative and absolute URLs
          const profilePicUrl = result.profilePicture.startsWith('http') 
            ? result.profilePicture 
            : `${BASE_URL}/${result.profilePicture}`;
            
          document.getElementById("profilePicDisplay").src = profilePicUrl;
          document.getElementById("profilePicPreview").src = profilePicUrl;
          
          // Clear the file input
          fileInput.value = "";
        } else {
          const error = await res.json();
          showErrorToast("Failed to upload picture: " + error.error);
        }
      } catch (err) {
        showErrorToast("Error uploading picture: " + err.message);
      } finally {
        uploadBtn.disabled = false;
        spinner.classList.add("d-none");
      }
    });

    // Delete profile picture
    document.getElementById("deletePicBtn").addEventListener("click", async () => {
      if (!confirm("Are you sure you want to delete your profile picture?")) {
        return;
      }

      try {
        const res = await fetch(`${BASE_URL}/api/auth/delete-profile-pic`, {
          method: "DELETE",
          credentials: "include",
        });

        if (res.ok) {
          showSuccessToast("Profile picture deleted successfully!");
          
          // Reset to placeholder
          document.getElementById("profilePicDisplay").src = "https://via.placeholder.com/150?text=Profile+Pic";
          document.getElementById("profilePicPreview").src = "https://via.placeholder.com/150?text=Profile+Pic";
        } else {
          const error = await res.json();
          showErrorToast("Failed to delete picture: " + error.error);
        }
      } catch (err) {
        showErrorToast("Error deleting picture: " + err.message);
      }
    });

    // Handle profile form submission (username and email only)
    document.getElementById("profileForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const saveBtn = document.getElementById("saveProfileBtn");
      const spinner = document.getElementById("saveSpinner");
      saveBtn.disabled = true;
      spinner.classList.remove("d-none");

      try {
        const username = document.getElementById("usernameInput").value;
        const email = document.getElementById("emailInput").value;

        const res = await fetch(`${BASE_URL}/api/auth/update-profile`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, email }),
        });

        if (res.ok) {
          showSuccessToast("Profile updated successfully!");
          hideEditProfile();
          await fetchUserProfile();
        } else {
          const text = await res.text();
          showErrorToast("Failed to update profile: " + text);
        }
      } catch (err) {
        showErrorToast("Error updating profile: " + err.message);
      } finally {
        saveBtn.disabled = false;
        spinner.classList.add("d-none");
      }
    });

    // Toggle Edit Profile jumbotron visibility on "Change Profile" click
    document.getElementById("editProfileBtn").addEventListener("click", () => {
      const editProfileSection = document.getElementById("editProfileSection");
      if (editProfileSection.style.display === "none" || editProfileSection.style.display === "") {
        showEditProfile();
      } else {
        hideEditProfile();
      }
    });