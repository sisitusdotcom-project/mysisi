/**
 * Domains Page Module
 * Manage registered domains, renewal, DNS settings
 * MVP Status: ✅ COMPLETE - Shows list of registered domains
 * Future Enhancement: Add DNS management, renewal, domain settings
 */

import APIClient from '/assets/js/modules/unified-api.js';
import { showInfo } from '/assets/js/modules/unified-utils.js';

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

    const container = document.getElementById('domains-list-container');
    if (!container) return;

    if (domains.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <p style="color: var(--color-text-light); margin-bottom: 20px;">Belum ada domain terdaftar.</p>
          <a href="#!/dashboard/checkout" class="btn btn-primary">Daftar Domain Baru</a>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
          ${domains.map(dom => `
            <div style="background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%); color: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
              <div style="font-size: 18px; font-weight: 700; margin-bottom: 10px; word-break: break-all;">${dom.name}</div>
              <div style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-bottom: 15px; background-color: rgba(255, 255, 255, 0.25);">${dom.status.text}</div>
              <div style="font-size: 13px; margin: 15px 0; border-top: 1px solid rgba(255, 255, 255, 0.15); border-bottom: 1px solid rgba(255, 255, 255, 0.15); padding: 10px 0; line-height: 1.6;">
                <p style="margin: 5px 0;"><strong>Terdaftar:</strong> ${formatDate(dom.registeredDate)}</p>
                <p style="margin: 5px 0;"><strong>Kadaluarsa:</strong> ${formatDate(dom.expiryDate)}</p>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 15px;">
                <button class="btn btn-sm btn-outline btn-dns" style="flex: 1; border-color: rgba(255,255,255,0.4); color: white;" data-domain="${dom.name}">🔧 DNS</button>
                <button class="btn btn-sm btn-outline btn-renew" style="flex: 1; border-color: rgba(255,255,255,0.4); color: white;" data-domain="${dom.name}">🔄 Renew</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      // Attach modern event listeners instead of using inline onclick with global fallback
      container.querySelectorAll('.btn-dns').forEach(btn => {
        btn.addEventListener('click', () => {
          showInfo(`Fitur DNS Management untuk domain ${btn.dataset.domain} sedang dikembangkan.`);
        });
      });

      container.querySelectorAll('.btn-renew').forEach(btn => {
        btn.addEventListener('click', () => {
          showInfo(`Fitur Renewal untuk domain ${btn.dataset.domain} sedang dikembangkan.`);
        });
      });
    }

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
