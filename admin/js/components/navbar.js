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
    let initials = 'A';
    
    if (userData && userData.displayName) {
      displayName = userData.displayName;
      initials = displayName.charAt(0).toUpperCase();
    }

    this.container.innerHTML = `
      <h2 class="admin-nav-title" id="admin-top-title">Overview</h2>
      
      <div class="admin-nav-actions">
        <button class="admin-btn" style="background: transparent; border: 1px solid var(--admin-border); color: var(--admin-text-main); padding: 8px 12px;">
          <i class="fas fa-bell"></i>
        </button>
        
        <div class="admin-profile-btn" id="admin-profile-trigger">
          <div class="admin-avatar">
            ${initials}
          </div>
          <span style="font-weight: 500; font-size: 0.9rem; padding-right: 8px;">${displayName}</span>
        </div>
      </div>
    `;
    
    // Optional: Add simple logout or profile popup logic
    const profileBtn = document.getElementById('admin-profile-trigger');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        if(confirm('Apakah Anda ingin keluar dari Dasbor Admin?')) {
          AuthManager.logout();
          window.location.href = '/admin/login.html';
        }
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
