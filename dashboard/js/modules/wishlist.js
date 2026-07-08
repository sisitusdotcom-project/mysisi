/**
 * DASHBOARD WISHLIST VIEW MODULE
 * ===================================
 * Professional wishlist management for dashboard
 * - Display wishlist items with priorities
 * - Move to cart
 * - Remove items
 */

import { CartManager, WishlistManager } from '/assets/js/modules/unified-cart.js';
import { showSuccess, showError } from '/assets/js/modules/unified-utils.js';

class DashboardWishlist {
  constructor() {
    this.wishlist = WishlistManager.getWishlist();
    this.container = null;
  }

  /**
   * Render wishlist view
   */
  render(containerElement) {
    this.container = containerElement;

    if (WishlistManager.getWishlist().domains.length === 0) {
      this.renderEmptyWishlist();
      return;
    }

    this.renderWishlistContent();
  }

  /**
   * Render empty wishlist UI
   */
  renderEmptyWishlist() {
    this.container.innerHTML = `
      <div class="wishlist-empty" style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 80px; margin-bottom: 20px; opacity: 0.5;">
          <i class="fas fa-heart-broken"></i>
        </div>
        <h2 style="color: #333; margin-bottom: 10px;">Wishlist Kosong</h2>
        <p style="color: #666; margin-bottom: 30px; font-size: 16px;">
          Belum ada domain di wishlist Anda. <br>
          Tambahkan domain impian Anda ke wishlist untuk disimpan!
        </p>
        <a href="#!/dashboard/checkout" class="btn btn-primary" style="display: inline-block; padding: 12px 30px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
          <i class="fas fa-search"></i> Cari Domain
        </a>
      </div>
    `;
  }

  /**
   * Render wishlist with items
   */
  renderWishlistContent() {
    const wishlist = WishlistManager.getWishlist();
    const grouped = {
      high: wishlist.domains.filter(d => d.priority === 'high'),
      medium: wishlist.domains.filter(d => d.priority === 'medium'),
      low: wishlist.domains.filter(d => d.priority === 'low')
    };

    let itemsHTML = '';

    // High priority
    if (grouped.high.length > 0) {
      itemsHTML += `
        <div class="wishlist-group">
          <h3 style="margin: 20px 0 10px 0; color: #e74c3c; font-size: 16px; font-weight: bold;">
            <i class="fas fa-star"></i> Prioritas Tinggi (${grouped.high.length})
          </h3>
          ${grouped.high.map(item => this.renderWishlistItem(item)).join('')}
        </div>
      `;
    }

    // Medium priority
    if (grouped.medium.length > 0) {
      itemsHTML += `
        <div class="wishlist-group">
          <h3 style="margin: 20px 0 10px 0; color: #f39c12; font-size: 16px; font-weight: bold;">
            <i class="fas fa-circle"></i> Prioritas Sedang (${grouped.medium.length})
          </h3>
          ${grouped.medium.map(item => this.renderWishlistItem(item)).join('')}
        </div>
      `;
    }

    // Low priority
    if (grouped.low.length > 0) {
      itemsHTML += `
        <div class="wishlist-group">
          <h3 style="margin: 20px 0 10px 0; color: #95a5a6; font-size: 16px; font-weight: bold;">
            <i class="fas fa-circle"></i> Prioritas Rendah (${grouped.low.length})
          </h3>
          ${grouped.low.map(item => this.renderWishlistItem(item)).join('')}
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="dashboard-page-header" style="background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);">
        <div class="dashboard-page-header-content">
          <h1 class="dashboard-page-header-title">Wishlist Saya</h1>
          <p class="dashboard-page-header-desc">Simpan nama domain potensial untuk proyek masa depan Anda dan pantau ketersediaan serta harga mereka.</p>
        </div>
        <div class="dashboard-page-header-visual">
          <i class="fas fa-heart"></i>
        </div>
      </div>

      <div class="wishlist-content" style="padding-top: 15px;">
        <div class="wishlist-items-list">
          ${itemsHTML}
        </div>

        <div style="margin-top: 40px; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
          <p style="color: #666; margin-bottom: 15px;">
            <i class="fas fa-info-circle"></i> Domain impian akan dipesan ketika harga lebih murah atau fitur baru tersedia
          </p>
          <a href="#!/dashboard/checkout" class="btn btn-secondary" style="display: inline-block; padding: 10px 25px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            <i class="fas fa-search"></i> Cari Domain Lebih Banyak
          </a>
        </div>
      </div>

      <style>
        .wishlist-items-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .wishlist-item {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .wishlist-group {
          border-left: 4px solid;
          padding-left: 15px;
        }
        .wishlist-group:has(h3 .fa-star) {
          border-left-color: #e74c3c;
        }
      </style>
    `;

    // Expose functions to window
    window.moveWishlistToCart = (domain) => this.moveToCart(domain);
    window.removeWishlistItem = (domain) => this.removeItem(domain);
    window.updateWishlistPriority = (domain, priority) => this.updatePriority(domain, priority);
  }

  /**
   * Render single wishlist item
   */
  renderWishlistItem(item) {
    const addedDate = new Date(item.addedAt).toLocaleDateString('id-ID');

    return `
      <div class="wishlist-item">
        <div style="flex: 1;">
          <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
            ${item.domain}
          </h4>
          <p style="margin: 0 0 5px 0; color: #666; font-size: 13px;">
            ${item.reason || 'Domain impian'}
          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            Ditambahkan: ${addedDate}
          </p>
        </div>
        <div style="display: flex; gap: 8px; margin-left: 15px;">
          <button onclick="window.moveWishlistToCart && window.moveWishlistToCart('${item.domain}')"
            class="btn" style="background: #e8f5e9; color: #27ae60; border: 1px solid #c8e6c9; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px;">
            <i class="fas fa-shopping-cart"></i> Beli
          </button>
          <button onclick="window.removeWishlistItem && window.removeWishlistItem('${item.domain}')"
            class="btn" style="background: #fee; color: #e74c3c; border: 1px solid #fcc; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 13px;">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Move wishlist item to cart
   */
  moveToCart(domain) {
    try {
      WishlistManager.moveToCart(domain);
      showSuccess('✓ Pindah ke Keranjang', `${domain} sudah ditambahkan ke keranjang`);
      this.render(this.container);
    } catch (error) {
      showError('❌ Error', error.message);
    }
  }

  /**
   * Remove item from wishlist
   */
  removeItem(domain) {
    WishlistManager.remove(domain);
    showSuccess('✓ Dihapus', `${domain} dihapus dari wishlist`);
    
    if (WishlistManager.getWishlist().domains.length === 0) {
      this.renderEmptyWishlist();
    } else {
      this.render(this.container);
    }
  }

  /**
   * Update item priority
   */
  updatePriority(domain, priority) {
    const wishlist = WishlistManager.getWishlist();
    const item = wishlist.domains.find(d => d.domain === domain);
    if (item) {
      item.priority = priority;
      WishlistManager.saveWishlist(wishlist);
      showSuccess('✓ Prioritas Diperbarui', `${domain} prioritasnya diubah`);
      this.render(this.container);
    }
  }
}

// Export render function for dashboard-app compatibility
export async function render(currentUser) {
  const container = document.getElementById('wishlist-container');
  if (!container) {
    console.error('Wishlist container not found');
    return;
  }

  try {
    const wishlist = new DashboardWishlist();
    wishlist.render(container);
  } catch (error) {
    console.error('Error rendering wishlist:', error);
    container.innerHTML = `
      <div class="alert alert-error">
        <p>${error.message}</p>
        <button onclick="window.location.reload()">Coba Lagi</button>
      </div>
    `;
  }
}
