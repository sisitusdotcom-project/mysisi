/**
 * Dashboard Sidebar Navigation Component
 */

export class DashboardSidebar {
  constructor(router) {
    this.router = router;
    this.currentRoute = null;
  }

  render(currentRoute = '/dashboard/') {
    this.currentRoute = currentRoute;
    const container = document.getElementById('sidebar');

    const menuItems = [
      {
        id: 'dashboard',
        icon: 'icon-home',
        label: 'Dashboard',
        route: '/dashboard/'
      },
      {
        id: 'profile',
        icon: 'icon-user',
        label: 'Profil',
        route: '/dashboard/profile'
      },
      {
        id: 'cart',
        icon: 'icon-basket',
        label: 'Keranjang',
        route: '/cart/',
        isExternal: true,
        badge: 'cart-badge'
      },
      {
        id: 'wishlist',
        icon: 'icon-heart',
        label: 'Wishlist',
        route: '/dashboard/wishlist'
      },
      {
        id: 'orders',
        icon: 'icon-shopping',
        label: 'Pesanan',
        route: '/dashboard/orders'
      },

      {
        id: 'invoices',
        icon: 'icon-file-text',
        label: 'Invoice',
        route: '/dashboard/invoices',
        badge: ''
      },
      {
        id: 'domains',
        icon: 'icon-globe',
        label: 'Domain Saya',
        route: '/dashboard/domains'
      },
      {
        id: 'support',
        icon: 'icon-headphones',
        label: 'Support',
        route: '/dashboard/support'
      }
    ];

    container.innerHTML = `
      <div class="sidebar-header">
        <h2>Menu</h2>
      </div>
      
      <nav class="sidebar-menu">
        ${menuItems.map(item => {
          let badge = '';
          if (item.badge === 'cart-badge') {
            // Will be updated dynamically
            badge = '<span class="menu-badge cart-badge-count" style="display: none;">0</span>';
          } else if (item.badge) {
            badge = `<span class="menu-badge">${item.badge}</span>`;
          }
          const href = item.isExternal ? item.route : `#!${item.route}`;
          return `
            <a 
              href="${href}" 
              class="menu-item ${this.currentRoute === item.route ? 'active' : ''}"
              data-route="${item.route}"
              ${item.isExternal ? 'data-external="true"' : ''}
              title="${item.label}"
            >
              <span class="menu-icon ${item.icon}"></span>
              <span class="menu-label">${item.label}</span>
              ${badge}
            </a>
          `;
        }).join('')}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-info">
          <small>SISITUS Client Dashboard</small>
          <small>v1.0</small>
        </div>
      </div>
    `;

    // Add click handlers
    container.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (item.dataset.external === 'true') {
          return;
        }
        e.preventDefault();
        const route = item.dataset.route;
        this.router.navigate(route);
      });
    });

    // Update cart badge on cart changes
    this.updateCartBadge();
    window.addEventListener('cart:updated', () => this.updateCartBadge());
  }

  /**
   * Update cart item count badge
   */
  async updateCartBadge() {
    try {
      const { CartManager } = await import('../../../assets/js/modules/unified-cart.js');
      const cartSummary = CartManager.getSummary();
      const badge = document.querySelector('.cart-badge-count');
      
      if (badge) {
        if (cartSummary.itemCount > 0) {
          badge.textContent = cartSummary.itemCount;
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }
      }
    } catch (err) {
      // CartManager not available, skip silently
    }
  }

  /**
   * Set active menu item
   */
  setActive(route) {
    document.querySelectorAll('.menu-item').forEach(item => {
      item.classList.remove('active');
    });
    const activeItem = document.querySelector(`[data-route="${route}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }
    this.currentRoute = route;
  }
}
