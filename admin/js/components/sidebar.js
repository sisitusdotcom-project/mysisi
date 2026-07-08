export class AdminSidebar {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById('admin-sidebar');
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="admin-sidebar-header">
        <i class="fas fa-shield-halved" style="color: var(--admin-primary); font-size: 1.5rem;"></i>
        <span class="admin-logo-text">SISITUS Admin</span>
      </div>
      <nav class="admin-nav-menu">
        <div style="color: var(--admin-text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; padding: 10px 16px; margin-top: 10px;">Main Menu</div>
        
        <a href="#!/admin/" class="admin-nav-item" data-route="/admin/">
          <i class="fas fa-chart-pie"></i> Overview
        </a>
        <a href="#!/admin/users" class="admin-nav-item" data-route="/admin/users">
          <i class="fas fa-users"></i> Users
        </a>
        <a href="#!/admin/transactions" class="admin-nav-item" data-route="/admin/transactions">
          <i class="fas fa-file-invoice-dollar"></i> Transaksi
        </a>
        
        <div style="color: var(--admin-text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; padding: 10px 16px; margin-top: 15px;">Manajemen Produk</div>
        
        <a href="#!/admin/packages" class="admin-nav-item" data-route="/admin/packages">
          <i class="fas fa-box-open"></i> Paket & Domain
        </a>
        <a href="#!/admin/dns" class="admin-nav-item" data-route="/admin/dns">
          <i class="fas fa-network-wired"></i> DNS Records
        </a>
        <a href="#!/admin/promos" class="admin-nav-item" data-route="/admin/promos">
          <i class="fas fa-ticket"></i> Promo Codes
        </a>

        <div style="color: var(--admin-text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; padding: 10px 16px; margin-top: 15px;">Sistem</div>
        
        <a href="#!/admin/support" class="admin-nav-item" data-route="/admin/support">
          <i class="fas fa-headset"></i> Support Tickets
        </a>
        <a href="#!/admin/settings" class="admin-nav-item" data-route="/admin/settings">
          <i class="fas fa-sliders"></i> Pengaturan
        </a>
        
        <a href="#!/admin/profile" class="admin-nav-item" data-route="/admin/profile">
          <i class="fas fa-user-circle"></i> Profil Admin
        </a>
      </nav>
      
      <div style="padding: 20px; border-top: 1px solid var(--admin-border); display: flex; flex-direction: column; gap: 10px;">
        <a href="/" class="admin-nav-item" style="color: var(--admin-text-muted);">
          <i class="fas fa-arrow-left"></i> Kembali ke Web
        </a>
        <button id="sidebar-logout-btn" class="admin-nav-item" style="color: var(--admin-danger); background: transparent; border: none; text-align: left; width: 100%; cursor: pointer;">
          <i class="fas fa-sign-out-alt"></i> Keluar
        </button>
      </div>
    `;
    
    // Setup logout listener
    const logoutBtn = this.container.querySelector('#sidebar-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (confirm('Apakah Anda yakin ingin keluar dari Admin Panel?')) {
          const { AuthManager } = await import('/assets/js/modules/unified-auth.js');
          AuthManager.clearSession();
          window.location.href = '/admin/login.html';
        }
      });
    }
  }

  setActive(route) {
    const items = this.container.querySelectorAll('.admin-nav-item');
    items.forEach(item => {
      if (item.getAttribute('data-route') === route) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
}
