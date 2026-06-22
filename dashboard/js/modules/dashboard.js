/**
 * Dashboard Home Page Module
 */

import APIClient from '/assets/js/modules/unified-api.js';
import { formatPrice } from '/assets/js/modules/unified-utils.js';

export async function render(currentUser) {
  try {
    // Get order statistics from userOrderStats endpoint
    let stats = null;
    try {
      const result = await APIClient.getUserOrderStats(currentUser.userId);
      if (result.success) {
        stats = result.data || {};
        // Update dashboard with statistics
        updateStatisticsDisplay(stats);
      }
    } catch (error) {
      console.warn('Statistics not available:', error);
    }

    // Render cart reminder card at the top if cart is not empty
    try {
      const { CartManager } = await import('/assets/js/modules/unified-cart.js');
      const cartSummary = CartManager.getSummary();
      if (cartSummary.itemCount > 0) {
        const cart = CartManager.getCart();
        const firstItem = cart.domains[0];
        const domainName = firstItem?.domain || '';
        const packageId = firstItem?.package || 'starter';
        const packageName = packageId.charAt(0).toUpperCase() + packageId.slice(1);

        const reminderHTML = `
          <div class="card cart-reminder-card" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 5px solid #2563eb; border-top: none; margin-bottom: 20px; animation: slideInUp 0.4s ease-out;">
            <div class="card-body" style="display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; padding: 20px;">
              <div>
                <h3 style="color: #1e3a8a; margin: 0 0 5px 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; font-weight: 700;">
                  <i class="fas fa-shopping-cart"></i> Pemesanan Anda Belum Selesai!
                </h3>
                <p style="color: #1e40af; margin: 0; font-size: 0.9rem;">
                  Anda memiliki domain <strong>${domainName}</strong> (Paket ${packageName}) di keranjang belanja Anda.
                </p>
              </div>
              <div>
                <a href="/cart/" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; font-weight: bold; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); border: none;">
                  Selesaikan Pembayaran <i class="fas fa-arrow-right"></i>
                </a>
              </div>
            </div>
          </div>
        `;
        
        const content = document.getElementById('content');
        if (content) {
          content.insertAdjacentHTML('afterbegin', reminderHTML);
        }
      }
    } catch (cartError) {
      console.warn('Error rendering cart reminder card:', cartError);
    }

    // Setup event listeners
    setupEventListeners(currentUser);

  } catch (error) {
    console.error('Error rendering dashboard:', error);
    document.getElementById('content').innerHTML = `
      <div class="alert alert-error">
        ${error.message}
      </div>
    `;
  }
}

function updateStatisticsDisplay(stats) {
  // Update dashboard statistics widgets
  const widgets = {
    'stat-total-orders': stats.totalOrders || 0,
    'stat-total-spent': stats.totalSpent ? formatPrice(stats.totalSpent) : 'Rp 0',
    'stat-average-order': stats.averageOrderValue ? formatPrice(stats.averageOrderValue) : 'Rp 0',
    'stat-active-orders': stats.ordersByStatus?.processing || 0,
    'stat-completed': stats.ordersByStatus?.completed || 0
  };
  
  Object.entries(widgets).forEach(([elementId, value]) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  });
}

function setupEventListeners(currentUser) {
  // Quick action buttons
  const btnCheckout = document.getElementById('btn-quick-checkout');
  if (btnCheckout) {
    btnCheckout.addEventListener('click', () => {
      window.location.href = '/?section=cek-domain';
    });
  }

  const btnOrders = document.getElementById('btn-quick-orders');
  if (btnOrders) {
    btnOrders.addEventListener('click', () => {
      window.location.hash = '#!orders';
    });
  }

  const btnProfile = document.getElementById('btn-quick-profile');
  if (btnProfile) {
    btnProfile.addEventListener('click', () => {
      window.location.hash = '#!profile';
    });
  }
}
