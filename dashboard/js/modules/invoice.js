/**
 * INVOICE PAGE MODULE
 * ===================================
 * Display invoice after successful payment
 * - Show order details
 * - Display invoice number
 * - PDF download option (optional)
 * - Link to dashboard
 * 
 * Usage: /invoice/{order_id}
 */

import APIClient from '/assets/js/modules/unified-api.js';
import { AuthManager } from '/assets/js/modules/unified-auth.js';
import { formatPrice, formatDateTime, showError } from '/assets/js/modules/unified-utils.js';

let invoiceData = null;
let currentUser = null;

/**
 * Main render function
 */
export async function render(user) {
  try {
    currentUser = user || AuthManager.getCurrentUser();

    // Get order ID from URL
    const orderId = extractOrderIdFromUrl();
    if (!orderId) {
      throw new Error('Order ID tidak ditemukan di URL');
    }

    // Load order data
    await loadOrderData(orderId);

    // Render UI
    renderInvoice();
    setupEventListeners();

  } catch (error) {
    console.error('Error rendering invoice:', error);
    showError('Error', error.message);
    
    const container = document.getElementById('invoice-container');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <div style="color: #dc2626; margin-bottom: 20px; font-size: 48px;">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <h2>${error.message}</h2>
          <a href="/dashboard/" class="btn" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #2563EB; color: white; text-decoration: none; border-radius: 5px;">
            <i class="fas fa-arrow-left"></i> Kembali ke Dashboard
          </a>
        </div>
      `;
    }
  }
}

/**
 * Extract order ID from URL
 * Support both /invoice/ORDER-123 and URL with hash routing
 */
function extractOrderIdFromUrl() {
  // Try from pathname
  const pathParts = window.location.pathname.split('/');
  if (pathParts.length >= 3 && pathParts[1] === 'invoice') {
    return pathParts[2];
  }

  // Try from search params
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');
  if (orderId) return orderId;

  // Try from hash
  const hash = window.location.hash;
  if (hash.includes('?')) {
    const hashParams = new URLSearchParams(hash.split('?')[1]);
    return hashParams.get('orderId');
  }

  return null;
}

/**
 * Load order data from backend
 */
async function loadOrderData(orderId) {
  try {
    // Show loading
    const container = document.getElementById('invoice-container');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #2563EB; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <p style="margin-top: 20px; color: #666;">Memuat invoice...</p>
        </div>
      `;
    }

    // Fetch order data
    const result = await APIClient.getOrderDetail(orderId, currentUser?.userId);
    
    if (!result.success) {
      throw new Error(result.message || 'Gagal memuat order');
    }

    invoiceData = result.data || result.order;
    
    if (!invoiceData) {
      throw new Error('Data order tidak ditemukan');
    }

    // Verify payment was successful
    if (invoiceData.paymentStatus !== 'paid' && invoiceData.orderStatus !== 'completed') {
      console.warn('Order payment status:', invoiceData.paymentStatus, 'Order status:', invoiceData.orderStatus);
      // Allow viewing invoice anyway (might be in processing)
    }

  } catch (error) {
    console.error('Error loading order data:', error);
    throw error;
  }
}

/**
 * Render invoice
 */
function renderInvoice() {
  const container = document.getElementById('invoice-container');
  if (!container || !invoiceData) return;

  const invoiceNumber = generateInvoiceNumber(invoiceData.orderId);
  const isPaid = invoiceData.paymentStatus === 'paid';

  container.innerHTML = `
    <div class="invoice-wrapper" style="max-width: 1000px; margin: 0 auto; padding: 20px;">
      <!-- Invoice Header -->
      <div class="invoice-header" style="background: white; border-radius: 10px; padding: 30px; border: 1px solid #e0e0e0; margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
          <!-- Company Info -->
          <div>
            <h1 style="margin: 0 0 10px 0; color: #2563EB;">SISITUS</h1>
            <p style="margin: 0; color: #666; font-size: 13px;">
              PT SINTARA DIGITAL NUSANTARA<br>
              Email: hello@sisitus.com<br>
              Phone: +62-812-1528-9095
            </p>
          </div>

          <!-- Invoice Status -->
          <div style="text-align: right;">
            <div style="display: inline-block; background: ${isPaid ? '#efe' : '#fee'}; border: 1px solid ${isPaid ? '#cfc' : '#fcc'}; color: ${isPaid ? '#360' : '#c33'}; padding: 12px 20px; border-radius: 5px; font-weight: bold;">
              <i class="fas fa-${isPaid ? 'check-circle' : 'hourglass'}"></i>
              ${isPaid ? 'LUNAS' : 'PENDING'}
            </div>
          </div>
        </div>

        <!-- Invoice Title -->
        <div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e0e0e0;">
          <p style="margin: 0 0 5px 0; color: #999; font-size: 12px; text-transform: uppercase;">Invoice No</p>
          <h2 style="margin: 0; font-size: 24px; font-weight: bold;">${invoiceNumber}</h2>
          <p style="margin: 5px 0 0 0; color: #999; font-size: 12px;">
            Tanggal: ${formatDateTime(invoiceData.createdAt)}
          </p>
        </div>

        <!-- Customer & Order Info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
          <!-- Customer Info -->
          <div>
            <p style="margin: 0 0 5px 0; color: #999; font-size: 12px; text-transform: uppercase;">Bill To</p>
            <h4 style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold;">${invoiceData.name || invoiceData.displayName || 'Customer'}</h4>
            <p style="margin: 0; color: #666; font-size: 13px;">
              ${invoiceData.email}<br>
              ${invoiceData.phone || ''}
            </p>
          </div>

          <!-- Order Info -->
          <div>
            <p style="margin: 0 0 5px 0; color: #999; font-size: 12px; text-transform: uppercase;">Order Details</p>
            <table style="font-size: 13px; line-height: 1.8;">
              <tr>
                <td style="color: #666;">Order ID:</td>
                <td style="font-weight: bold; padding-left: 20px;">${invoiceData.orderId}</td>
              </tr>
              <tr>
                <td style="color: #666;">Domain:</td>
                <td style="font-weight: bold; padding-left: 20px;">${invoiceData.domain || 'N/A'}</td>
              </tr>
              <tr>
                <td style="color: #666;">Package:</td>
                <td style="font-weight: bold; padding-left: 20px;">${formatPackageName(invoiceData.packageId || invoiceData.package)}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>

      <!-- Invoice Items -->
      <div class="invoice-items" style="background: white; border-radius: 10px; overflow: hidden; border: 1px solid #e0e0e0; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8f9fa; border-bottom: 2px solid #e0e0e0;">
              <th style="padding: 15px; text-align: left; color: #666; font-weight: bold; font-size: 13px; text-transform: uppercase;">Description</th>
              <th style="padding: 15px; text-align: center; color: #666; font-weight: bold; font-size: 13px; text-transform: uppercase; width: 100px;">Qty</th>
              <th style="padding: 15px; text-align: right; color: #666; font-weight: bold; font-size: 13px; text-transform: uppercase; width: 150px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <!-- Domain -->
            <tr style="border-bottom: 1px solid #e0e0e0;">
              <td style="padding: 15px; color: #333;">
                <strong>${invoiceData.domain || 'Domain'}</strong><br>
                <small style="color: #999;">1 tahun registrasi</small>
              </td>
              <td style="padding: 15px; text-align: center;">1</td>
              <td style="padding: 15px; text-align: right; font-weight: bold;">${formatPrice(299000)}</td>
            </tr>
            ${renderInvoiceAddons()}
          </tbody>
        </table>
      </div>

      <!-- Invoice Summary -->
      <div class="invoice-summary" style="background: white; border-radius: 10px; padding: 30px; border: 1px solid #e0e0e0; display: flex; justify-content: flex-end; margin-bottom: 20px;">
        <div style="width: 100%; max-width: 400px;"> 
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; margin-bottom: 10px;">
            <span style="color: #666;">Subtotal:</span>
            <strong>${formatPrice(invoiceData.total || 0)}</strong>
          </div>

          <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 16px; font-weight: bold; color: #2563EB;">
            <span>Total:</span>
            <span>${formatPrice(invoiceData.total || 0)}</span>
          </div>
        </div>
      </div>

      <!-- Invoice Footer -->
      <div class="invoice-footer" style="background: #f8f9fa; border-radius: 10px; padding: 30px; border: 1px solid #e0e0e0; margin-bottom: 20px;">
        <h4 style="margin: 0 0 15px 0;">Payment Information</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 13px; line-height: 1.8;">
          <div>
            <p style="margin: 0; color: #666;">
              <strong>Payment Status:</strong><br>
              <span style="color: ${isPaid ? '#360' : '#c33'}; font-weight: bold;">
                ${isPaid ? '✓ SUDAH DIBAYAR' : '⏳ MENUNGGU PEMBAYARAN'}
              </span>
            </p>
          </div>
          <div>
            <p style="margin: 0; color: #666;">
              <strong>Transaction ID:</strong><br>
              ${invoiceData.transactionId || 'N/A'}
            </p>
          </div>
        </div>

        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="margin: 0; color: #999; font-size: 12px;">
            Terima kasih telah menjadi bagian dari SISITUS. Untuk pertanyaan lebih lanjut, hubungi support kami.
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="invoice-actions" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
        <button onclick="window.print()" class="btn" style="padding: 12px 24px; background: #f0f0f0; color: #333; border: 1px solid #ddd; border-radius: 5px; cursor: pointer; font-weight: bold;">
          <i class="fas fa-print"></i> Cetak/PDF
        </button>
        <a href="/dashboard/" class="btn" style="padding: 12px 24px; background: #2563EB; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          <i class="fas fa-chart-line"></i> Ke Dashboard
        </a>
      </div>

      <style>
        @media print {
          body {
            background: white;
          }
          .invoice-actions {
            display: none;
          }
          .invoice-wrapper {
            max-width: 100%;
            padding: 0;
          }
        }

        @media (max-width: 768px) {
          .invoice-header {
            padding: 20px !important;
          }

          .invoice-summary {
            flex-direction: column;
          }

          .invoice-actions {
            flex-direction: column;
          }

          .invoice-actions > * {
            width: 100%;
          }
        }
      </style>
    </div>
  `;
}

/**
 * Generate formatted invoice number
 */
function generateInvoiceNumber(orderId) {
  // Format: INV-2026-03-28-00001
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const sequence = orderId.replace('ORDER-', '').slice(0, 5);
  
  return `INV-${year}-${month}-${day}-${sequence}`;
}

/**
 * Format package name nicely
 */
function formatPackageName(packageId) {
  const names = {
    'starter': 'Starter',
    'professional': 'Professional',
    'business': 'Business',
    'enterprise': 'Enterprise'
  };
  
  return names[packageId?.toLowerCase()] || packageId || 'Standard';
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Print button
  const printBtn = document.querySelector('[onclick="window.print()"]');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Keyboard shortcut for print
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      window.print();
    }
  });
}

/**
 * Render addons in invoice items table
 * Returns HTML rows for each addon
 */
function renderInvoiceAddons() {
  if (!invoiceData || !invoiceData.addons || !Array.isArray(invoiceData.addons)) {
    return '';
  }

  let html = '';
  for (const addon of invoiceData.addons) {
    if (addon && addon.price && addon.price > 0) {
      html += `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 15px; color: #333;">
            <strong>${addon.name || 'Addon'}</strong><br>
            <small style="color: #999;">${addon.duration || 1} tahun</small>
          </td>
          <td style="padding: 15px; text-align: center;">1</td>
          <td style="padding: 15px; text-align: right; font-weight: bold;">${formatPrice(addon.price)}</td>
        </tr>
      `;
    }
  }
  return html;
}

export default render;
