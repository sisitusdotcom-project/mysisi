/**
 * Domains Page Module
 * Manage registered domains, renewal, DNS settings
 * MVP Status: ✅ COMPLETE - Shows list of registered domains
 * Future Enhancement: Add DNS management, renewal, domain settings
 */

import APIClient from '/assets/js/modules/unified-api.js';

export async function render(currentUser) {
  try {
    // Load user orders to get registered domains
    const result = await APIClient.getUserOrders(currentUser.userId);
    const orders = result.data?.orders || result.orders || [];

    // Filter completed orders to show as registered domains
    const domains = orders
      .filter(o => o.paymentStatus === 'paid')
      .map(o => ({
        name: o.domain,
        registeredDate: o.createdAt,
        expiryDate: calculateExpiryDate(o.createdAt, o.domainDuration || 1),
        status: getDomainStatus(o.createdAt, o.domainDuration || 1),
        orderId: o.orderId
      }));

    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h1 class="card-title">Domain Saya</h1>
          <p style="margin: 0; font-size: 12px; color: var(--color-text-light);">Kelola registrasi, DNS, dan renewal domain Anda</p>
        </div>
        <div class="card-body">
          ${domains.length === 0 ? `
            <div style="text-align: center; padding: 40px;">
              <p style="color: var(--color-text-light); margin-bottom: 20px;">Belum ada domain terdaftar.</p>
              <a href="/" class="btn btn-primary">Daftar Domain Baru</a>
            </div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
              ${domains.map(dom => `
                <div style="background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%); color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                  <div style="font-size: 18px; font-weight: 700; margin-bottom: 10px; word-break: break-all;">${dom.name}</div>
                  <div style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-bottom: 15px; background-color: rgba(255, 255, 255, 0.3);">${dom.status.text}</div>
                  <div style="font-size: 13px; margin: 15px 0; border-top: 1px solid rgba(255, 255, 255, 0.2); border-bottom: 1px solid rgba(255, 255, 255, 0.2); padding: 10px 0;">
                    <p style="margin: 5px 0;"><strong>Terdaftar:</strong> ${formatDate(dom.registeredDate)}</p>
                    <p style="margin: 5px 0;"><strong>Kadaluarsa:</strong> ${formatDate(dom.expiryDate)}</p>
                  </div>
                  <div style="display: flex; gap: 8px; margin-top: 15px;">
                    <button class="btn btn-sm btn-outline" style="flex: 1;" onclick="showInfo('Fitur DNS sedang dikembangkan')">🔧 DNS</button>
                    <button class="btn btn-sm btn-outline" style="flex: 1;" onclick="showInfo('Fitur renewal sedang dikembangkan')">🔄 Renew</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;

  } catch (error) {
    console.error('Error rendering domains:', error);
    document.getElementById('content').innerHTML = `
      <div class="alert alert-error">${error.message}</div>
    `;
  }
}

function calculateExpiryDate(createdDate, years = 1) {
  const date = new Date(createdDate);
  date.setFullYear(date.getFullYear() + years);
  return date;
}

function getDomainStatus(createdDate, years = 1) {
  const expiryDate = calculateExpiryDate(createdDate, years);
  const daysUntilExpiry = Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) {
    return { text: 'Kadaluarsa', class: 'danger' };
  } else if (daysUntilExpiry < 30) {
    return { text: `Segera Kadaluarsa (${daysUntilExpiry} hari)`, class: 'warning' };
  } else {
    return { text: 'Aktif', class: 'active' };
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
