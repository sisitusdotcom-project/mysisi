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
import { formatPrice, formatDateTime, formatDate, capitalize, showError } from '/assets/js/modules/unified-utils.js';

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
  if (pathParts.length >= 3 && pathParts[1] === 'invoice' && pathParts[2]) {
    return pathParts[2];
  }

  // Try from search params
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId') || params.get('orderid');
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
  
  // Calculate due date (24 hours from created)
  const createdDate = new Date(invoiceData.createdAt);
  const dueDate = new Date(createdDate.getTime() + (24 * 60 * 60 * 1000));
  
  const paymentMethodText = invoiceData.paymentMethod ? capitalize(invoiceData.paymentMethod.replace(/_/g, ' ')) : 'Midtrans Payment Gateway';

  const headerHTML = `
    <div class="inv-header">
      <div class="inv-logo">
        <img src="/assets/img/logo/logo.svg" alt="sisitus.com" onerror="this.outerHTML='<h2 style=\\'margin:0;color:#0f172a;\\'>sisitus.com</h2>'" style="height: 28px; margin-bottom: 6px;">
        <div style="font-weight: 800; font-size: 14px; color: #0f172a; letter-spacing: 0.5px;">SISITUS.COM</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">PT. SINTARA DIGITAL NUSANTARA</div>
      </div>
      <div class="inv-title-section">
        <h1 class="inv-title">INVOICE</h1>
        <div class="inv-meta">No: <strong>${invoiceNumber}</strong></div>
        <div class="inv-meta">Tanggal: ${formatDate(createdDate, 'long')}</div>
      </div>
    </div>

    <div class="inv-due-date">
      Due date: ${formatDate(dueDate, 'long')}
    </div>

    <div class="inv-details-grid">
      <div class="inv-from">
        <div class="inv-label">From:</div>
        <strong>sisitus.com</strong><br>
        Jl. Manyar II, Punggul, Gedangan<br>
        - Sidoarjo.<br>
        +62 812 1528 9095<br>
        https://sisitus.com<br>
        hello@sisitus.com<br>
        <span style="color:#64748b;">NPWP: 950355107564000</span>
      </div>
      <div class="inv-to">
        <div class="inv-label">Bill to:</div>
        <strong>${invoiceData.name || invoiceData.displayName || 'Customer'}</strong><br>
        <span style="color:#475569;">${invoiceData.email}</span><br>
        <span style="color:#475569;">${invoiceData.phone || ''}</span>
      </div>
      <div class="inv-pay-via">
        <div class="inv-label">Pay via:</div>
        ${isPaid ? '<div style="color:#16a34a;font-weight:800;font-size:14px;margin-bottom:4px;">LUNAS / PAID</div>' : ''}
        <strong>${paymentMethodText}</strong><br>
        <span style="color:#64748b;">Ref: ${invoiceData.transactionId || '-'}</span>
      </div>
    </div>

    <div class="inv-total-section">
      <div class="inv-total-text">Total amount due: <span style="${isPaid ? 'color:#16a34a;' : ''}">&nbsp;${isPaid ? 'Rp 0' : formatPrice(invoiceData.total || 0)}</span></div>
      <div class="inv-order-id"><strong>Order ID:</strong> &nbsp;${invoiceData.orderId}</div>
    </div>
  `;

  // Refined Watermark
  const watermarkHTML = isPaid ? `
    <div class="inv-watermark-stamp">PAID</div>
  ` : '';

  container.innerHTML = `
    <div class="invoice-wrapper">
      
      <!-- PAGE 1 -->
      <div class="invoice-page">
        ${watermarkHTML}
        ${headerHTML}

        <table class="inv-table">
          <thead>
            <tr>
              <th style="text-align: left; width: 45%;">Description</th>
              <th style="text-align: center; width: 10%;">Qty</th>
              <th style="text-align: right; width: 20%;">Price (Rp)</th>
              <th style="text-align: center; width: 10%;">Disc</th>
              <th style="text-align: right; width: 15%;">Total (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong style="font-size:12px; color:#0f172a;">${invoiceData.domain || 'Domain'}</strong><br>
                <span style="color: #64748b;">Paket ${formatPackageName(invoiceData.packageId || invoiceData.package)} - 1 tahun</span>
              </td>
              <td style="text-align: center;">1</td>
              <td style="text-align: right;">${formatPrice(invoiceData.total || 0).replace('Rp ', '')}</td>
              <td style="text-align: center;">-</td>
              <td style="text-align: right; font-weight:600; color:#0f172a;">${formatPrice(invoiceData.total || 0).replace('Rp ', '')}</td>
            </tr>
            ${renderInvoiceAddons()}
          </tbody>
        </table>

        <div class="inv-summary-container">
          <div class="inv-summary">
            <div class="inv-summary-row">
              <span>Subtotal</span>
              <span>${formatPrice(invoiceData.total || 0).replace('Rp ', '')}</span>
            </div>
            <div class="inv-summary-row inv-summary-total">
              <span>Total amount due</span>
              <span style="${isPaid ? 'color:#16a34a;' : ''}">${isPaid ? '0' : formatPrice(invoiceData.total || 0).replace('Rp ', '')}</span>
            </div>
          </div>
        </div>

        <div class="inv-signature">
          <div style="margin-bottom: 30px; color: #64748b;">Billing Admin,</div>
          <strong style="font-size:13px; color:#0f172a;">sisitus.com</strong>
        </div>
      </div>

      <!-- PAGE 2 -->
      <div class="invoice-page print-page-break">
        ${watermarkHTML}
        ${headerHTML}

        <div class="inv-terms-section">
          <div class="inv-terms-grid">
            <div class="inv-terms-title">Notes</div>
            <div class="inv-terms-content">
              <p>✦ Invoice ini merupakan tagihan resmi sisitus.com. Pembayaran dianggap sah setelah dana diterima dan terverifikasi.</p>
              <p>✦ Jika terdapat kesalahan data (nama, layanan, nominal, dll), klien WAJIB mengajukan perubahan invoice melalui:<br>
              <a href="https://sisitus.com/kontak/" style="color:#2563EB;text-decoration:none;">https://sisitus.com/kontak/</a></p>
              <p>✦ Dalam proses perubahan invoice, mohon TIDAK melakukan pembayaran sebelum menerima invoice terbaru. Segala kesalahan pembayaran menjadi tanggung jawab klien.</p>
              <p>✦ Layanan akan diproses setelah pembayaran dikonfirmasi oleh tim sisitus.</p>
            </div>
            
            <div class="inv-terms-title">Terms &<br>conditions</div>
            <div class="inv-terms-content">
              <ol>
                <li>Pembayaran bersifat non-refundable, kecuali kesalahan dari pihak sisitus.</li>
                <li>Pengerjaan dimulai setelah pembayaran diterima dan terverifikasi.</li>
                <li>Revisi mengikuti ketentuan paket atau kontrak yang disepakati.</li>
                <li>Keterlambatan dari pihak klien (konten, feedback, approval) dapat memengaruhi timeline proyek.</li>
                <li>SISITUS berkomitmen membantu penyelesaian kendala teknis, termasuk yang melibatkan layanan pihak ketiga, sesuai batas kendali dan akses yang dimiliki.</li>
                <li>Dengan melakukan pembayaran, klien dianggap telah membaca, memahami, dan menyetujui seluruh ketentuan yang berlaku.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="invoice-actions no-print" style="text-align: center; margin-top: 30px; padding-bottom: 40px;">
        <button onclick="window.print()" class="btn" style="padding: 12px 24px; background: #0f172a; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; margin-right: 10px; transition: all 0.2s; box-shadow: 0 2px 4px -1px rgba(0,0,0,0.1);">
          <i class="fas fa-print"></i> Download / Print PDF
        </button>
        <a href="/dashboard/" class="btn" style="padding: 12px 24px; background: #2563EB; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; transition: all 0.2s; box-shadow: 0 2px 4px -1px rgba(37,99,235,0.2);">
          <i class="fas fa-home"></i> Kembali Dashboard
        </a>
      </div>

      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .invoice-wrapper {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          color: #1e293b;
          line-height: 1.5;
          max-width: 800px;
          margin: 0 auto;
        }

        .invoice-page {
          background: white;
          padding: 40px;
          margin-bottom: 25px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        }

        /* Elevate all content above watermark */
        .inv-header, .inv-due-date, .inv-details-grid, .inv-total-section, .inv-table, .inv-summary-container, .inv-signature, .inv-terms-section {
          position: relative;
          z-index: 10;
        }

        .inv-watermark-stamp {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-25deg);
          font-size: 100px;
          font-weight: 800;
          color: rgba(22, 163, 74, 0.04);
          border: 6px solid rgba(22, 163, 74, 0.04);
          padding: 10px 40px;
          border-radius: 12px;
          z-index: 1;
          pointer-events: none;
          user-select: none;
        }

        .inv-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 25px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 20px;
        }

        .inv-title-section {
          text-align: right;
        }

        .inv-title {
          font-size: 24px;
          font-weight: 800;
          margin: 0 0 6px 0;
          color: #0f172a;
          letter-spacing: 1px;
        }

        .inv-meta {
          color: #64748b;
          font-size: 12px;
          margin-bottom: 2px;
        }

        .inv-due-date {
          display: inline-block;
          background-color: #fef9c3;
          color: #854d0e;
          padding: 6px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 12px;
          margin-bottom: 25px;
          border: 1px solid #fde047;
        }

        .inv-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1.2fr;
          gap: 20px;
          margin-bottom: 25px;
          font-size: 11px;
          line-height: 1.6;
        }

        .inv-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #94a3b8;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .inv-pay-via {
          background-color: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .inv-total-section {
          margin-bottom: 25px;
          background: #f8fafc;
          padding: 15px;
          border-left: 3px solid #2563EB;
          border-radius: 4px;
        }

        .inv-total-text {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 4px 0;
          color: #0f172a;
        }

        .inv-order-id {
          font-size: 11px;
          color: #64748b;
        }

        .inv-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 11px;
        }

        .inv-table th {
          border-top: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
          padding: 10px 8px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
        }

        .inv-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #f1f5f9;
        }

        .inv-summary-container {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 30px;
        }

        .inv-summary {
          width: 280px;
          font-size: 12px;
        }

        .inv-summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
          color: #475569;
        }

        .inv-summary-total {
          font-weight: 700;
          font-size: 14px;
          color: #0f172a;
          border-bottom: 1px solid #cbd5e1;
          margin-top: 4px;
        }

        .inv-signature {
          text-align: right;
          font-size: 12px;
          padding-top: 10px;
        }

        .inv-terms-section {
          background-color: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          font-size: 11px;
          line-height: 1.6;
          color: #334155;
          border: 1px solid #e2e8f0;
        }

        .inv-terms-grid {
          display: grid;
          grid-template-columns: 100px 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }

        .inv-terms-grid:last-child {
          margin-bottom: 0;
        }

        .inv-terms-title {
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
        }

        .inv-terms-content p {
          margin: 0 0 8px 0;
        }

        .inv-terms-content ol {
          margin: 0;
          padding-left: 14px;
        }

        .inv-terms-content li {
          margin-bottom: 6px;
        }

        /* PRINT CONFIGURATION */
        @page {
          size: A4;
          margin: 0mm; /* Using 0 margin for print, letting internal padding handle it */
        }

        @media print {
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .page-container {
            padding: 0 !important;
            margin: 0 !important;
          }

          .invoice-wrapper {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
          }

          .invoice-page {
            box-shadow: none !important;
            padding: 15mm !important; /* Fixed inner margin to prevent cutoff */
            margin: 0 !important;
            border-radius: 0 !important;
            width: 210mm !important;
            min-height: 296mm !important;
            box-sizing: border-box !important;
            page-break-after: always;
          }

          .print-page-break {
            /* Handled by page-break-after */
          }

          .no-print {
            display: none !important;
          }
        }


        @media (max-width: 768px) {
          .inv-details-grid {
            grid-template-columns: 1fr;
          }
          .inv-summary {
            width: 100%;
          }
          .inv-terms-grid {
            grid-template-columns: 1fr;
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
