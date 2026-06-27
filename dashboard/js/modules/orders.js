/**
 * Orders Page Module
 * Display user's orders with detail modal
 * Migrated and enhanced from assets/js/pages/orders.js
 */

import APIClient from '/assets/js/modules/unified-api.js';
import { showError, formatPrice, formatDateTime } from '/assets/js/modules/unified-utils.js';

let currentUser = null;

export async function render(user) {
  try {
    currentUser = user;

    // Load orders
    const result = await APIClient.getUserOrders(user.userId);
    const orders = result.data?.orders || result.orders || [];

    // Render orders table
    const tableBody = document.querySelector('#orders-table tbody');
    if (tableBody) {
      if (orders.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 30px;">
              <p>Belum ada pesanan. <a href="/">Cari dan pesan domain sekarang</a></p>
            </td>
          </tr>
        `;
      } else {
        tableBody.innerHTML = orders.map(order => `
          <tr class="order-row" data-order-id="${order.orderId}" style="cursor: pointer;">
            <td><strong>${order.orderId}</strong></td>
            <td>${order.domain}</td>
            <td>${order.packageId ? (order.packageId.charAt(0).toUpperCase() + order.packageId.slice(1)) : 'Starter'}</td>
            <td>${formatPrice(order.total)}</td>
            <td id="status-${order.orderId}"><span class="badge badge-${getStatusClass(order.paymentStatus)}">${getStatusText(order.paymentStatus)}</span></td>
            <td>${formatDateTime(order.createdAt)}</td>
          </tr>
        `).join('');

        // Attach click handlers to rows
        document.querySelectorAll('#orders-table .order-row').forEach(row => {
          row.addEventListener('click', (e) => {
            const orderId = row.dataset.orderId;
            showOrderDetail(orderId);
          });
        });

        // Auto-sync pending orders in the background
        const pendingOrders = orders.filter(o => o.paymentStatus === 'pending');
        if (pendingOrders.length > 0) {
          syncPendingOrders(pendingOrders);
        }
      }
    }

  } catch (error) {
    console.error('Error rendering orders:', error);
    document.getElementById('content').innerHTML = `
      <div class="alert alert-error">
        ${error.message}
      </div>
    `;
  }
}

async function syncPendingOrders(pendingOrders) {
  for (const order of pendingOrders) {
    try {
      const syncResult = await APIClient.syncOrderStatus(order.orderId);
      
      // If the status has changed, update the UI
      if (syncResult.success && syncResult.data && syncResult.data.newStatus) {
        const newStatus = syncResult.data.newStatus;
        const statusTd = document.getElementById(`status-${order.orderId}`);
        
        if (statusTd) {
          // Update the badge with a subtle animation
          statusTd.innerHTML = `<span class="badge badge-${getStatusClass(newStatus)}" style="animation: fadeIn 0.5s;">${getStatusText(newStatus)}</span>`;
        }
      }
    } catch (error) {
      console.warn(`Failed to sync order ${order.orderId}:`, error);
    }
  }
}

async function showOrderDetail(orderId) {
  try {
    // Load order details
    const result = await APIClient.getOrderDetail(orderId, currentUser.userId);
    
    if (!result.success) {
      showError('Gagal memuat detail pesanan');
      return;
    }

    const order = result.data || result.order;
    const modal = document.getElementById('order-detail-modal');
    
    // Render modal content
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${order.orderId}</h2>
          <button class="btn-close" onclick="document.getElementById('order-detail-modal').style.display='none'">×</button>
        </div>

        <div class="modal-body">
          <!-- Order Summary -->
          <div class="section">
            <h3>Ringkasan Pesanan</h3>
            <div class="order-summary">
              <div class="summary-row">
                <span>Domain:</span>
                <strong>${order.domain}</strong>
              </div>
              <div class="summary-row">
                <span>Paket:</span>
                <strong>${order.packageName || order.packageId || 'Starter'}</strong>
              </div>
              <div class="summary-row">
                <span>Durasi:</span>
                <strong>${order.domainDuration || 1} tahun</strong>
              </div>
              <div class="summary-divider"></div>
              <div class="summary-row total">
                <span>Total:</span>
                <strong>${formatPrice(order.total)}</strong>
              </div>
            </div>
          </div>

          <!-- Customer Data -->
          <div class="section">
            <h3>Data Pelanggan</h3>
            <div class="details-grid">
              <div class="detail-item">
                <label>Nama:</label>
                <div>${order.customerName || order.name || 'Customer'}</div>
              </div>
              <div class="detail-item">
                <label>Email:</label>
                <div>${order.email}</div>
              </div>
              <div class="detail-item">
                <label>Telepon:</label>
                <div>${formatPhoneNumber(order.phone)}</div>
              </div>
              <div class="detail-item">
                <label>Alamat:</label>
                <div>${sanitizeHTML(order.address || '-')}</div>
              </div>
            </div>
          </div>

          <!-- Status Info -->
          <div class="section">
            <h3>Status & Tanggal</h3>
            <div class="details-grid">
              <div class="detail-item">
                <label>Status Pembayaran:</label>
                <div>
                  <span class="badge badge-${getStatusClass(order.paymentStatus)}">
                    ${getStatusText(order.paymentStatus)}
                  </span>
                </div>
              </div>
              <div class="detail-item">
                <label>Dibuat:</label>
                <div>${formatDateTime(order.createdAt)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          ${order.paymentStatus === 'pending' ? `
            <button class="btn btn-primary" onclick="window.location.hash='#!payment?orderId=${order.orderId}'">
              💳 Lanjut Pembayaran
            </button>
          ` : ''}
          <button class="btn btn-outline" onclick="document.getElementById('order-detail-modal').style.display='none'">
            Tutup
          </button>
        </div>
      </div>
    `;

    // Show modal
    modal.style.display = 'flex';

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });

  } catch (error) {
    console.error('Error loading order detail:', error);
    showError('Gagal memuat detail pesanan: ' + error.message);
  }
}

function getStatusClass(status) {
  const statusMap = {
    'paid': 'success',
    'pending': 'warning',
    'expired': 'danger',
    'cancel': 'danger',
    'denied': 'danger',
    'processing': 'info'
  };
  return statusMap[status] || 'info';
}

function getStatusText(status) {
  const statusMap = {
    'paid': 'Selesai',
    'pending': 'Tertunda',
    'expired': 'Expired',
    'cancel': 'Dibatalkan',
    'denied': 'Ditolak',
    'processing': 'Diproses'
  };
  return statusMap[status] || status;
}

function formatPhoneNumber(phone) {
  if (!phone) return '-';
  // Format: 0812-3456-7890 or similar
  return phone.replace(/(\d{4})(\d{4})(\d)/, '$1-$2-$3');
}

function sanitizeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
