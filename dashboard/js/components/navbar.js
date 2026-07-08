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
    let photoURL = this.user?.photoURL || '/assets/img/avatar-default.svg';
    
    if (photoURL.includes('drive.google.com/file/d/')) {
      const match = photoURL.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        photoURL = `https://lh3.googleusercontent.com/d/${match[1]}`;
      }
    }
    container.innerHTML = `
      <div class="navbar-container">
        <!-- Mobile hamburger menu button -->
        <button id="sidebar-toggle" class="sidebar-toggle" aria-label="Toggle Sidebar">
          <i class="fas fa-bars"></i>
        </button>

        <div class="navbar-brand">
          <a href="#!/dashboard/" class="navbar-logo">
            <img src="/assets/img/logo/logo512x512.webp" alt="SISITUS" class="logo-img">
            <span class="logo-text">Client Area</span>
          </a>
        </div>

        <div class="navbar-content">
          <!-- Breadcrumb or Title -->
          <div class="navbar-breadcrumbs">
            <a href="#!/dashboard/" class="breadcrumb-link"><i class="fas fa-home"></i> Dashboard</a>
            <span class="breadcrumb-separator"><i class="fas fa-chevron-right"></i></span>
            <span class="breadcrumb-item active" id="navbar-active-page">Overview</span>
          </div>
        </div>

        <div class="navbar-actions">
          <!-- Buy Now green button -->
          <a href="#!/dashboard/checkout" class="btn btn-success btn-buy-now">
            <i class="fas fa-shopping-cart"></i> <span>Beli Layanan</span>
          </a>

          <!-- User Profile Dropdown -->
          <div class="user-dropdown-container">
            <div class="user-profile-trigger" id="user-profile-trigger">
              <img src="${photoURL}" alt="${this.user?.displayName || 'User'}" class="user-avatar">
              <span class="user-name">${this.user?.displayName || 'Pelanggan'}</span>
              <i class="fas fa-chevron-down dropdown-arrow"></i>
            </div>
            <div class="user-dropdown-menu" id="user-dropdown-menu">
              <div class="dropdown-header">
                <strong>${this.user?.displayName || 'Pelanggan'}</strong>
                <span class="dropdown-email">${this.user?.email || ''}</span>
              </div>
              <hr>
              <a href="#!/dashboard/profile" class="dropdown-item"><i class="fas fa-user-cog"></i> Profil Saya</a>
              <a href="#!/dashboard/orders" class="dropdown-item"><i class="fas fa-history"></i> Pesanan</a>
              <a href="#!/dashboard/invoices" class="dropdown-item"><i class="fas fa-file-invoice-dollar"></i> Invoice</a>
              <hr>
              <button id="btn-logout-dropdown" class="dropdown-item logout-btn"><i class="fas fa-sign-out-alt"></i> Keluar</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Dropdown toggle logic
    const dropdownTrigger = document.getElementById('user-profile-trigger');
    const dropdownMenu = document.getElementById('user-dropdown-menu');
    if (dropdownTrigger && dropdownMenu) {
      dropdownTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
        const arrow = dropdownTrigger.querySelector('.dropdown-arrow');
        if (arrow) {
          if (dropdownMenu.classList.contains('show')) {
            arrow.style.transform = 'rotate(180deg)';
          } else {
            arrow.style.transform = 'rotate(0deg)';
          }
        }
      });

      document.addEventListener('click', () => {
        dropdownMenu.classList.remove('show');
        const arrow = dropdownTrigger.querySelector('.dropdown-arrow');
        if (arrow) {
          arrow.style.transform = 'rotate(0deg)';
        }
      });
    }

    // Mobile sidebar toggle logic
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('open');
      });

      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }

    // Logout handler
    const btnLogout = document.getElementById('btn-logout-dropdown');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        showConfirm('Yakin ingin logout?', () => DashboardAuth.logout());
      });
    }

    // Listen for auth changes
    window.addEventListener('authStateChanged', (e) => {
      if (e.detail) {
        this.user = e.detail;
        this.render();
      }
    });

    // Update active breadcrumb name on hashchange
    this.updateActiveBreadcrumb();
    window.addEventListener('hashchange', () => this.updateActiveBreadcrumb());
  }

  updateActiveBreadcrumb() {
    const hash = window.location.hash;
    const pageId = hash.replace('#!', '').split('?')[0].split('/').filter(Boolean).pop() || 'dashboard';
    
    const pageData = {
      'dashboard': { label: 'Overview', icon: 'fas fa-th-large' },
      'profile': { label: 'Profil Saya', icon: 'fas fa-user-cog' },
      'orders': { label: 'Pesanan Saya', icon: 'fas fa-shopping-bag' },
      'payment': { label: 'Pembayaran', icon: 'fas fa-credit-card' },
      'invoices': { label: 'Invoice', icon: 'fas fa-file-invoice-dollar' },
      'domains': { label: 'Domain Saya', icon: 'fas fa-globe' },
      'wishlist': { label: 'Wishlist Saya', icon: 'fas fa-heart' },
      'support': { label: 'Support & Bantuan', icon: 'fas fa-headset' },
      'checkout': { label: 'Pesan Domain Baru', icon: 'fas fa-shopping-cart' },
      'cart': { label: 'Keranjang Belanja', icon: 'fas fa-shopping-cart' },
      'keranjang': { label: 'Keranjang Saya', icon: 'fas fa-shopping-cart' },
      'keranjang-saya': { label: 'Keranjang Saya', icon: 'fas fa-shopping-cart' }
    };

    const activeBreadcrumb = document.getElementById('navbar-active-page');
    if (activeBreadcrumb) {
      const data = pageData[pageId] || pageData['dashboard'];
      activeBreadcrumb.innerHTML = `<i class="${data.icon}" style="margin-right: 6px; color: var(--primary-blue);"></i>${data.label}`;
    }
  }
}
