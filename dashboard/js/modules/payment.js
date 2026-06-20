/**
 * Payment Page Module
 * Midtrans payment integration, order status tracking
 * Migrated and fixed from assets/js/pages/payment.js
 */

import APIClient from '/assets/js/modules/unified-api.js';
import { AuthManager } from '/assets/js/modules/unified-auth.js';  // NEW
import { showError, showSuccess, showWarning, showInfo, formatPrice, formatDateTime } from '/assets/js/modules/unified-utils.js';

const ADMIN_WHATSAPP = '6281215289095';
let currentUser = null;
let currentOrder = null;
let currentTransaction = null;

export async function render(user) {
  try {
    // CRITICAL: Refresh user data from storage
    if (!user) {
      AuthManager.refreshUserData();  // NEW: Load latest user session
    }
    
    // Store current user for use in other functions
    currentUser = user || AuthManager.getCurrentUser();  // NEW: Use refreshed data
    
    // Email verification check - REQUIRED before payment
    if (!currentUser?.emailVerified) {
      const content = document.getElementById('content');
      content.innerHTML = `
        <div style="max-width: 600px; margin: 60px auto; padding: 20px; text-align: center;">
          <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 10px 0; color: #92400e;">
              <i class="fas fa-envelope-open-text"></i> Verifikasi Email Diperlukan
            </h2>
            <p style="margin: 0 0 10px 0; color: #78350f;">
              Email Anda belum terverifikasi. Verifikasi email diperlukan untuk melanjutkan pembayaran.
            </p>
            <p style="margin: 0; color: #99410e; font-size: 14px;">
              Email dikirim ke: <strong>${currentUser?.email}</strong>
            </p>
          </div>

          <div style="margin-bottom: 20px;">
            <p style="color: #666;">Setelah memverifikasi email, refresh halaman ini untuk melanjutkan.</p>
            <button onclick="location.reload()" class="btn" style="padding: 12px 24px; background: #2563EB; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
              <i class="fas fa-redo"></i> Refresh Halaman
            </button>
          </div>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">

          <div style="color: #999; font-size: 14px;">
            <p>Link verifikasi tidak muncul?</p>
            <a href="/auth/verify-email.html" style="color: #2563EB; text-decoration: none; font-weight: bold;">
              Buka halaman verifikasi email
            </a>
          </div>
        </div>
      `;
      return;
    }
    
    // Get order ID from URL (support both search params and hash params)
    let orderId = new URLSearchParams(window.location.search).get('orderId');
    if (!orderId) {
      const hash = window.location.hash;
      if (hash && hash.includes('?')) {
        const queryPart = hash.split('?')[1];
        orderId = new URLSearchParams(queryPart).get('orderId');
      }
    }

    if (!orderId) {
      throw new Error('Order ID tidak ditemukan');
    }

    // Load order data
    await loadOrderData(orderId, currentUser);

    // Setup buttons
    setupPaymentButtons();

  } catch (error) {
    console.error('Error rendering payment page:', error);
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="alert alert-error">
        <h3>Error</h3>
        <p>${error.message}</p>
        <button onclick="window.history.back()" class="btn btn-primary">Kembali</button>
      </div>
    `;
  }
}

async function loadOrderData(orderId, currentUser) {
  try {
    // Show loading
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="card">
        <div class="card-body" style="text-align: center;">
          <div class="spinner"></div>
          <p>Memuat data pesanan...</p>
        </div>
      </div>
    `;

    // Fetch order data
    const result = await APIClient.getOrderDetail(orderId, currentUser.userId);
    if (!result.success) {
      throw new Error(result.message || 'Gagal memuat pesanan');
    }

    currentOrder = result.order;

    // Display order
    displayOrderData(currentOrder);

    // Generate payment token if not yet paid
    if (currentOrder.paymentStatus !== 'paid') {
      await generateMidtransToken(currentOrder);
    }

  } catch (error) {
    console.error('Error loading order data:', error);
    throw error;
  }
}

async function generateMidtransToken(orderData) {
  try {
    if (!currentUser) {
      throw new Error('Data pengguna tidak ditemukan');
    }

    // Call GAS to generate Midtrans token with all required parameters
    // NEW: Pass addons as the 8th parameter
    const result = await APIClient.generateMidtransToken(
      orderData.orderId,
      currentUser.email,
      currentUser.phone || '',
      currentUser.displayName || currentUser.name || 'Customer',
      orderData.domain,
      orderData.packageId || orderData.packageName,
      orderData.total,
      orderData.addons || []  // NEW: Pass addons array
    );

    if (!result.success || !result.data || !result.data.snapToken) {
      throw new Error(result.message || 'Gagal membuat token pembayaran');
    }

    currentTransaction = {
      token: result.data.snapToken,
      redirectUrl: result.data.snapRedirectUrl,
      orderId: orderData.orderId,
      amount: orderData.total
    };

  } catch (error) {
    console.error('Error generating Midtrans token:', error);
    // Show error but don't crash
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-warning';
    errorDiv.innerHTML = `
      Gagal memuat sistem pembayaran. Coba refresh halaman atau hubungi support.
      <br><a href="https://wa.me/${ADMIN_WHATSAPP}" target="_blank" class="btn btn-primary btn-sm">Chat Support</a>
    `;
    document.getElementById('payment-actions').appendChild(errorDiv);
  }
}

function setupPaymentButtons() {
  const btnPayment = document.getElementById('btn-payment');
  if (btnPayment) {
    btnPayment.addEventListener('click', () => openMidtransPayment());
  }

  const btnPreview = document.getElementById('btn-payment-preview');
  if (btnPreview) {
    btnPreview.addEventListener('click', () => requestPaymentAfterPreview());
  }
}

function openMidtransPayment() {
  try {
    if (!currentTransaction) {
      showWarning('Sistem pembayaran belum siap. Coba refresh halaman.');
      return;
    }

    if (!window.snap) {
      throw new Error('Midtrans library tidak loaded');
    }

    // Show loading
    const btn = document.getElementById('btn-payment');
    btn.disabled = true;
    btn.textContent = 'Membuka pembayaran...';

    // Open Midtrans Snap
    window.snap.pay(currentTransaction.token, {
      onSuccess: handlePaymentSuccess,
      onPending: handlePaymentPending,
      onError: handlePaymentError,
      onClose: handlePaymentClose
    });

  } catch (error) {
    console.error('Error opening payment:', error);
    showError('Error: ' + error.message);
    const btn = document.getElementById('btn-payment');
    btn.disabled = false;
    btn.textContent = 'Lanjut Pembayaran';
  }
}

function handlePaymentSuccess(result) {
  updateOrderStatus(currentOrder.orderId, 'paid', result.transaction_id);
  showSuccess('✓ Pembayaran Berhasil!', 'Terima kasih atas pemesanan Anda. Mengarahkan ke invoice...');
  
  // Redirect to invoice page after 2 seconds
  setTimeout(() => {
    window.location.href = `/invoice/?orderId=${encodeURIComponent(currentOrder.orderId)}`;
  }, 2000);
}

function handlePaymentPending(result) {
  showInfo('Pembayaran sedang diproses. Anda akan menerima konfirmasi dalam waktu singkat.');
}

function handlePaymentError(result) {
  showError('Pembayaran gagal. Silakan coba lagi.');
}

function handlePaymentClose() {
  // Re-enable button
  const btn = document.getElementById('btn-payment');
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Lanjut Pembayaran';
  }
}

async function updateOrderStatus(orderId, status, transactionId) {
  try {
    await APIClient.updateOrderStatus(orderId, status, transactionId);  // NEW: Pass transactionId
  } catch (error) {
    console.error('Error updating order status:', error);
  }
}

function requestPaymentAfterPreview() {
  try {
    if (!currentOrder) return;

    // Build addon info if present
    let addonInfo = '';
    if (currentOrder.addons && Array.isArray(currentOrder.addons) && currentOrder.addons.length > 0) {
      addonInfo = `\nAddon (${currentOrder.addons.length}):\n`;
      currentOrder.addons.forEach(addon => {
        addonInfo += `- ${addon.name}: Rp ${formatPrice(addon.price)}\n`;
      });
    }

    const message = `Halo, saya ingin meminta preview desain untuk order berikut:\n\nOrder ID: ${currentOrder.orderId}\nDomain: ${currentOrder.domain}\nPaket: ${currentOrder.packageName}${addonInfo}\nTotal: Rp ${formatPrice(currentOrder.total)}\n\nTerima kasih`;

    const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

  } catch (error) {
    console.error('Error with WhatsApp:', error);
    showError('Gagal membuka WhatsApp. Hubungi support secara manual.');
  }
}

function displayOrderData(orderData) {
  const content = document.getElementById('content');

  const expirationDate = new Date(new Date(orderData.createdAt).getTime() + 24 * 60 * 60 * 1000);
  const isExpired = new Date() > expirationDate;
  const statusInfo = getStatusInfo(orderData.paymentStatus);

  // Build addons section if present
  let addonsSection = '';
  if (orderData.addons && Array.isArray(orderData.addons) && orderData.addons.length > 0) {
    const addonsHTML = orderData.addons.map(addon => `
      <div class="summary-row">
        <span>${addon.name} (${addon.duration} tahun)</span>
        <strong>Rp ${formatPrice(addon.price)}</strong>
      </div>
    `).join('');
    
    addonsSection = `
      <div class="summary-row">
        <span><strong>Addon (${orderData.addons.length})</strong></span>
        <strong>${orderData.addons.length} item</strong>
      </div>
      ${addonsHTML}
      <div class="summary-divider"></div>
    `;
  }

  // Build pricing breakdown if available
  let pricingBreakdown = '';
  if (orderData.subtotal !== undefined && orderData.ppn !== undefined) {
    pricingBreakdown = `
      <div class="summary-row">
        <span>Subtotal:</span>
        <strong>Rp ${formatPrice(orderData.subtotal)}</strong>
      </div>
      <div class="summary-row">
        <span>PPN (11%):</span>
        <strong>Rp ${formatPrice(orderData.ppn)}</strong>
      </div>
      ${orderData.discount > 0 ? `
        <div class="summary-row" style="color: #27ae60;">
          <span>Diskon (${orderData.promoCode || 'Promo'}):</span>
          <strong>-Rp ${formatPrice(orderData.discount)}</strong>
        </div>
      ` : ''}
      <div class="summary-divider"></div>
    `;
  }

  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="order-header">
          <div>
            <h1 class="card-title">${orderData.orderId}</h1>
            <small class="text-muted">Dibuat: ${formatDateTime(orderData.createdAt)}</small>
          </div>
          <div class="status-badge ${statusInfo.class}">
            <span class="status-icon">${statusInfo.icon}</span>
            <span>${statusInfo.text}</span>
          </div>
        </div>
      </div>

      <div class="card-body">
        <!-- Order Summary -->
        <div class="section">
          <h3>Ringkasan Pesanan</h3>
          <div class="order-summary">
            <div class="summary-row">
              <span>Domain:</span>
              <strong>${orderData.domain}</strong>
            </div>
            <div class="summary-row">
              <span>Paket:</span>
              <strong>${orderData.packageName}</strong>
            </div>
            <div class="summary-row">
              <span>Durasi:</span>
              <strong>${orderData.domainDuration} tahun</strong>
            </div>
            ${addonsSection}
            ${pricingBreakdown}
            <div class="summary-row total">
              <span>Total Pembayaran:</span>
              <strong class="total-price">Rp ${formatPrice(orderData.total)}</strong>
            </div>
          </div>
        </div>

        <!-- Order Details -->
        <div class="section">
          <h3>Data Pelanggan</h3>
          <div class="details-grid">
            <div class="detail-item">
              <label>Nama:</label>
              <div>${orderData.customerName}</div>
            </div>
            <div class="detail-item">
              <label>Email:</label>
              <div>${orderData.email}</div>
            </div>
            <div class="detail-item">
              <label>Telepon:</label>
              <div>${formatPhoneNumber(orderData.phone)}</div>
            </div>
            <div class="detail-item">
              <label>Alamat:</label>
              <div>${sanitizeHTML(orderData.address)}</div>
            </div>
          </div>
        </div>

        <!-- Payment Status -->
        <div class="section">
          <h3>Status Pembayaran</h3>
          <div class="payment-status">
            <div class="status-item ${orderData.paymentStatus === 'paid' ? 'completed' : ''}">
              <span class="status-check">${orderData.paymentStatus === 'paid' ? '✓' : ''}</span>
              <div class="status-text">
                <strong>Pembayaran</strong>
                <small>${orderData.paymentStatus === 'paid' ? 'Selesai' : 'Menunggu'}</small>
              </div>
            </div>
            <div class="status-item ${orderData.paymentStatus === 'paid' ? 'completed' : ''}">
              <span class="status-check">${orderData.paymentStatus === 'paid' ? '✓' : ''}</span>
              <div class="status-text">
                <strong>Proses</strong>
                <small>${orderData.paymentStatus === 'paid' ? 'Sedang Diproses' : 'Menunggu Pembayaran'}</small>
              </div>
            </div>
            <div class="status-item">
              <span class="status-check"></span>
              <div class="status-text">
                <strong>Penyelesaian</strong>
                <small>Dalam 1-7 hari kerja</small>
              </div>
            </div>
          </div>

          ${isExpired && orderData.paymentStatus !== 'paid' ? `
            <div class="alert alert-danger" style="margin-top: 15px;">
              ⚠️ Pembayaran telah expired. Silakan buat pesanan baru.
            </div>
          ` : orderData.paymentStatus !== 'paid' ? `
            <div class="alert alert-warning" style="margin-top: 15px;">
              ⏳ Pembayaran harus selesai sebelum: <strong>${formatDateTime(expirationDate)}</strong>
            </div>
          ` : ''}
        </div>

        <!-- Payment Actions -->
        <div id="payment-actions" class="section">
          <h3>Opsi Pembayaran</h3>
          <div class="button-group">
            ${orderData.paymentStatus !== 'paid' && !isExpired ? `
              <button id="btn-payment" class="btn btn-primary btn-lg">
                💳 Lanjut Pembayaran
              </button>
              <button id="btn-payment-preview" class="btn btn-secondary btn-lg">
                👁️ Minta Preview Dulu
              </button>
            ` : ''}
            <button onclick="window.location.hash='#!orders'" class="btn btn-outline">
              Kembali ke Pesanan
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getStatusInfo(status) {
  const statusMap = {
    'paid': {
      text: 'Pembayaran Selesai',
      icon: '✓',
      class: 'success'
    },
    'pending': {
      text: 'Pembayaran Tertunda',
      icon: '⏳',
      class: 'warning'
    },
    'processing': {
      text: 'Sedang Diproses',
      icon: '⚙️',
      class: 'info'
    },
    'expired': {
      text: 'Pembayaran Expired',
      icon: '✕',
      class: 'danger'
    },
    'cancelled': {
      text: 'Pesanan Dibatalkan',
      icon: '✕',
      class: 'danger'
    }
  };

  return statusMap[status] || statusMap['pending'];
}

function formatPhoneNumber(phone) {
  if (!phone) return '';
  // Convert 08x to +628x
  if (phone.startsWith('0')) {
    return '+62' + phone.substring(1);
  }
  if (!phone.startsWith('+')) {
    return '+62' + phone;
  }
  return phone;
}

function sanitizeHTML(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
