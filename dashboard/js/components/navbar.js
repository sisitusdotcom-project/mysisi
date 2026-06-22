/**
 * Dashboard Top Navigation Bar Component
 */

import { DashboardAuth } from '../modules/auth.js';
import { showConfirm } from '/assets/js/modules/unified-utils.js';

export class DashboardNavbar {
  constructor() {
    this.user = DashboardAuth.getCurrentUser();
  }

  render() {
    const container = document.getElementById('navbar');
    const photoURL = this.user?.photoURL || '/assets/img/avatar-default.svg';
    
    container.innerHTML = `
      <div class="navbar-container">
        <div class="navbar-brand">
          <a href="/" class="navbar-logo">
            <img src="/assets/img/logo/logo.svg" alt="SISITUS" class="logo-img">
            <span class="logo-text">Dashboard</span>
          </a>
        </div>

        <div class="navbar-content">
          <h1 class="navbar-title">Dashboard Client</h1>
        </div>

        <div class="navbar-user">
          <div class="user-profile">
            <img src="${photoURL}" alt="${this.user?.displayName}" class="user-avatar">
            <div class="user-info">
              <div class="user-name">${this.user?.displayName || 'User'}</div>
              <div class="user-email">${this.user?.email || ''}</div>
            </div>
          </div>

          <button id="btn-logout" class="btn btn-logout" title="Logout">
            <i class="icon-logout"></i> Logout
          </button>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById('btn-logout').addEventListener('click', () => {
      showConfirm('Yakin ingin logout?', () => DashboardAuth.logout());
    });

    // Listen for auth changes
    window.addEventListener('authStateChanged', (e) => {
      if (e.detail) {
        this.user = e.detail;
        this.render();
      }
    });
  }
}
