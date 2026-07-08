import { AuthManager } from '/assets/js/modules/unified-auth.js';

export class AdminNavbar {
  constructor() {
    this.container = document.getElementById('admin-navbar');
  }

  render() {
    if (!this.container) return;

    // Get real user data from AuthManager
    const userData = AuthManager.getCurrentUser();
    let displayName = 'Administrator';
    let avatarHtml = '<div class="admin-avatar">A</div>';

    if (userData) {
      if (userData.displayName) {
        displayName = userData.displayName;
      }

      if (userData.photoURL) {
        let finalUrl = userData.photoURL;
        // Convert Google Drive view links to direct image links
        if (finalUrl.includes('drive.google.com/file/d/')) {
          const match = finalUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
            finalUrl = `https://lh3.googleusercontent.com/d/${match[1]}`;
          }
        }
        
        avatarHtml = `<img src="${finalUrl}" alt="${displayName}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover; border: 2px solid var(--admin-primary);">`;
      } else {
        const initials = displayName.charAt(0).toUpperCase();
        avatarHtml = `<div class="admin-avatar">${initials}</div>`;
      }
    }

    this.container.innerHTML = `
      <h2 class="admin-nav-title" id="admin-top-title">Overview</h2>
      
      <div class="admin-nav-actions">
        <button class="admin-btn" style="background: transparent; border: 1px solid var(--admin-border); color: var(--admin-text-main); padding: 8px 12px;">
          <i class="fas fa-bell"></i>
        </button>
        
        <div class="admin-profile-btn" id="admin-profile-trigger">
          ${avatarHtml}
          <span style="font-weight: 500; font-size: 0.9rem; padding-right: 8px;">${displayName}</span>
        </div>
      </div>
    `;

    // Profile click to go to profile settings
    const profileBtn = document.getElementById('admin-profile-trigger');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        window.location.hash = '#!/admin/profile';
      });
    }
  }

  setTitle(title) {
    const titleEl = document.getElementById('admin-top-title');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }
}
