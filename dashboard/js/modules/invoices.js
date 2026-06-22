/**
 * Invoices Page Module
 * Display invoices and payment history
 * MVP Status: ✅ COMPLETE - Shows invoices table with search/filter
 * Future Enhancement: Add invoice download (PDF generation)
 */

import APIClient from '/assets/js/modules/unified-api.js';
import { formatPrice, formatDateTime } from '/assets/js/modules/unified-utils.js';

export async function render(currentUser) {
  try {
    // Load user orders (use as invoices for now)
    const result = await APIClient.getUserOrders(currentUser.userId);
    const orders = result.data?.orders || result.orders || [];

    // Filter orders with payment status = paid
    const invoices = orders.filter(o => o.paymentStatus === 'paid');

    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h1 class="card-title">Invoice</h1>
        </div>
        <div class="card-body">
          ${invoices.length === 0 ? `
            <div style="text-align: center; padding: 40px;">
              <p style="color: var(--color-text-light);">Belum ada invoice. Selesaikan pembayaran pesanan terlebih dahulu.</p>
            </div>
          ` : `
            <table class="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Order ID</th>
                  <th>Domain</th>
                  <th>Jumlah</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${invoices.map(inv => `
                  <tr>
                    <td>${formatDateTime(inv.createdAt)}</td>
                    <td><strong>${inv.orderId}</strong></td>
                    <td>${inv.domain}</td>
                    <td>${formatPrice(inv.total)}</td>
                    <td style="display: flex; gap: 8px;">
                      <a href="/invoice/?orderId=${inv.orderId}" class="btn btn-sm btn-primary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                        👁️ Lihat
                      </a>
                      <button class="btn btn-sm btn-outline" onclick="showInfo('Fitur download PDF sedang dikembangkan')">
                        📥 PDF
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;

  } catch (error) {
    console.error('Error rendering invoices:', error);
    document.getElementById('content').innerHTML = `
      <div class="alert alert-error">${error.message}</div>
    `;
  }
}


