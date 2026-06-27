/**
 * Dashboard SPA Main Application
 * Handles routing, session management, and page rendering
 */

import { DashboardAuth } from './modules/auth.js';
import { DashboardNavbar } from './components/navbar.js';
import { DashboardSidebar } from './components/sidebar.js';
import { showSuccess, showError, showWarning, showInfo } from '/assets/js/modules/unified-utils.js';

// Expose utility functions globally for inline onclick handlers
window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo;

class DashboardApp {
  constructor() {
    this.currentUser = DashboardAuth.getCurrentUser();
    this.currentRoute = null;
    this.navbar = null;
    this.sidebar = null;

    // Note: Auth check moved to individual pages that require it
    // Cart page allows inline login for guests
    this.init();
  }

  async init() {
    // Render navbar and sidebar
    this.navbar = new DashboardNavbar();
    this.navbar.render();

    this.sidebar = new DashboardSidebar(this);
    this.sidebar.render();

    // Setup route handlers
    this.setupRoutes();

    // Listen for hash changes
    window.addEventListener('hashchange', () => this.handleRouteChange());

    // Handle auth state changes
    window.addEventListener('authStateChanged', (e) => {
      if (!e.detail) {
        // User logged out
        window.location.href = '/auth/';
      } else {
        this.currentUser = e.detail;
      }
    });

    // Initial route
    this.handleRouteChange();
  }

  setupRoutes() {
    this.routes = {
      '/dashboard/': {
        page: 'dashboard',
        title: 'Dashboard',
        requiresAuth: true,
        loadModule: () => import('./modules/dashboard.js')
      },
      '/dashboard/profile': {
        page: 'profile',
        title: 'Profil Saya',
        requiresAuth: true,
        loadModule: () => import('./modules/profile.js')
      },
      '/dashboard/orders': {
        page: 'orders',
        title: 'Pesanan Saya',
        requiresAuth: true,
        loadModule: () => import('./modules/orders.js')
      },

      '/dashboard/payment': {
        page: 'payment',
        title: 'Pembayaran',
        requiresAuth: true,
        loadModule: () => import('./modules/payment.js?v=2')
      },
      '/dashboard/invoices': {
        page: 'invoices',
        title: 'Invoice',
        requiresAuth: true,
        loadModule: () => import('./modules/invoices.js')
      },
      '/dashboard/domains': {
        page: 'domains',
        title: 'Domain Saya',
        requiresAuth: true,
        loadModule: () => import('./modules/domains.js')
      },
      '/dashboard/wishlist': {
        page: 'wishlist',
        title: 'Wishlist Saya',
        requiresAuth: true,
        loadModule: () => import('./modules/wishlist.js')
      },
      '/dashboard/support': {
        page: 'support',
        title: 'Support',
        requiresAuth: true,
        loadModule: () => import('./modules/support.js')
      },
      '/dashboard/cart': {
        page: 'cart',
        title: 'Keranjang Belanja',
        requiresAuth: true,
        loadModule: () => import('./modules/cart.js')
      },
      '/dashboard/keranjang': {
        page: 'cart',
        title: 'Keranjang Saya',
        requiresAuth: true,
        loadModule: () => import('./modules/cart.js')
      },
      '/dashboard/keranjang-saya': {
        page: 'cart',
        title: 'Keranjang Saya',
        requiresAuth: true,
        loadModule: () => import('./modules/cart.js')
      }
    };
  }

  handleRouteChange() {
    const hash = window.location.hash;
    // Extract route without query parameters
    // From: #!checkout?domain=example.com
    // To: /dashboard/checkout
    const routePart = hash.replace('#!', '').split('?')[0] || '/dashboard/';
    const baseRoute = routePart.startsWith('/dashboard/') ? routePart : `/dashboard/${routePart}`;
    this.navigate(baseRoute);
  }

  async navigate(route) {
    // Default to home if invalid
    if (!this.routes[route]) {
      route = '/dashboard/';
      window.location.hash = '#!' + route;
      return;
    }

    // Check if route requires authentication
    const routeConfig = this.routes[route];
    if (routeConfig.requiresAuth && !this.currentUser) {
      // Redirect to auth page
      window.location.href = '/auth/';
      return;
    }

    this.currentRoute = route;

    // Update sidebar active state
    this.sidebar.setActive(route);

    // Update page title
    document.title = `${routeConfig.title} - SISITUS Dashboard`;

    // Load and render page
    try {
      this.showLoadingOverlay();
      
      // Load module
      const module = await routeConfig.loadModule();
      
      // Load HTML view
      const response = await fetch(`/dashboard/views/${routeConfig.page}.html`);
      if (!response.ok) {
        throw new Error(`Failed to load view for ${routeConfig.page}`);
      }
      const html = await response.text();

      // Render content
      const contentArea = document.getElementById('content');
      contentArea.innerHTML = html;

      // Initialize page module
      if (module.render) {
        await module.render(this.currentUser);
      }

      // Scroll to top
      contentArea.scrollTop = 0;

    } catch (error) {
      console.error('Error loading route:', error);
      document.getElementById('content').innerHTML = `
        <div class="error-container">
          <h2>Error</h2>
          <p>${error.message}</p>
          <button onclick="window.location.reload()">Reload</button>
        </div>
      `;
    } finally {
      this.hideLoadingOverlay();
    }
  }

  showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  /**
   * Show notification
   * Note: Uses SweetAlert2 for consistent and professional notifications.
   */
  static showNotification(message, type = 'info') {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: type === 'error' ? 'error' : (type === 'success' ? 'success' : 'info'),
        title: type === 'error' ? 'Kesalahan' : (type === 'success' ? 'Sukses' : 'Informasi'),
        text: message,
        confirmButtonText: 'OK',
        confirmButtonColor: type === 'error' ? '#ef4444' : '#2563eb'
      });
    } else {
      alert(message);
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.dashboardApp = new DashboardApp();
  });
} else {
  window.dashboardApp = new DashboardApp();
}
