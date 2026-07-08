/**
 * Admin Dashboard SPA Main Application
 */

import { AdminSidebar } from './components/sidebar.js';
import { AdminNavbar } from './components/navbar.js';
import { AuthManager } from '/assets/js/modules/unified-auth.js';

class AdminApp {
  constructor() {
    this.currentRoute = null;
    this.sidebar = null;
    this.navbar = null;
    this.init();
  }

  async init() {
    // Render sidebar and navbar
    this.sidebar = new AdminSidebar(this);
    this.sidebar.render();

    this.navbar = new AdminNavbar();
    this.navbar.render();

    // Setup routes
    this.setupRoutes();

    // Listen for hash changes
    window.addEventListener('hashchange', () => this.handleRouteChange());

    // Initial route
    this.handleRouteChange();
  }

  setupRoutes() {
    this.routes = {
      '/admin/': {
        page: 'overview',
        title: 'Overview',
        loadModule: () => import('./modules/overview.js')
      },
      '/admin/users': {
        page: 'users',
        title: 'Kelola Users',
        loadModule: () => import('./modules/users.js')
      },
      '/admin/transactions': {
        page: 'transactions',
        title: 'Transaksi',
        loadModule: () => import('./modules/transactions.js')
      },
      '/admin/packages': {
        page: 'packages',
        title: 'Paket & Domain',
        loadModule: () => import('./modules/packages.js')
      },
      '/admin/dns': {
        page: 'dns',
        title: 'DNS Records',
        loadModule: () => import('./modules/dns.js')
      },
      '/admin/promos': {
        page: 'promos',
        title: 'Kode Promo',
        loadModule: () => import('./modules/promos.js')
      },
      '/admin/support': {
        page: 'support',
        title: 'Support Tickets',
        loadModule: () => import('./modules/support.js')
      },
      '/admin/settings': {
        page: 'settings',
        title: 'Pengaturan Sistem',
        loadModule: () => import('./modules/settings.js')
      },
      '/admin/profile': {
        page: 'profile',
        title: 'Profil Admin',
        loadModule: () => import('./modules/profile.js')
      }
    };
  }

  handleRouteChange() {
    const hash = window.location.hash;
    const routePart = hash.replace('#!', '').split('?')[0] || '/admin/';
    const baseRoute = routePart.startsWith('/admin/') ? routePart : `/admin/${routePart}`;
    this.navigate(baseRoute);
  }

  async navigate(route) {
    // PROTECT ROUTES
    if (route !== '/admin/login' && !AuthManager.isAdmin()) {
      window.location.href = '/admin/login.html';
      return;
    }

    if (!this.routes[route]) {
      route = '/admin/';
      window.location.hash = '#!' + route;
      return;
    }

    this.currentRoute = route;
    const routeConfig = this.routes[route];

    // Update sidebar UI
    if (this.sidebar) this.sidebar.setActive(route);

    // Update Navbar title
    if (this.navbar) this.navbar.setTitle(routeConfig.title);

    document.title = `${routeConfig.title} - Admin SISITUS`;

    try {
      this.showLoading();

      // Load JS module
      const module = await routeConfig.loadModule();

      // Load HTML view
      const response = await fetch(`/admin/views/${routeConfig.page}.html`);
      if (!response.ok) throw new Error(`View not found: ${routeConfig.page}`);
      const html = await response.text();

      const contentArea = document.getElementById('admin-content');
      contentArea.innerHTML = html;

      // Run module logic
      if (module.render) {
        await module.render();
      }

      contentArea.scrollTop = 0;
    } catch (error) {
      console.error('Routing Error:', error);
      document.getElementById('admin-content').innerHTML = `
        <div style="padding: 2rem; color: #ef4444; text-align: center;">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
          <h2>Error Loading Module</h2>
          <p>${error.message}</p>
        </div>
      `;
    } finally {
      this.hideLoading();
    }
  }

  showLoading() {
    const loader = document.getElementById('admin-loading-overlay');
    if (loader) loader.style.display = 'flex';
  }

  hideLoading() {
    const loader = document.getElementById('admin-loading-overlay');
    if (loader) loader.style.display = 'none';
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  window.adminApp = new AdminApp();
});
