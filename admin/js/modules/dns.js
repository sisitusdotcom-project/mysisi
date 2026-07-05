import APIClient from '/assets/js/modules/unified-api.js';
import { AuthManager } from '/assets/js/modules/unified-auth.js';

let currentDns = [];

export async function render() {
  console.log('Admin DNS Module Loaded');
  setupEventListeners();
  await loadDNS();
}

function setupEventListeners() {
  const btnAdd = document.getElementById('btn-add-dns');
  const btnClose = document.getElementById('btn-close-dns');
  const modal = document.getElementById('dns-modal');
  const form = document.getElementById('dns-form');
  
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      form.reset();
      document.getElementById('dns-domain').readOnly = false;
      document.getElementById('dns-modal-title').textContent = 'Tambah DNS Manual';
      modal.style.display = 'flex';
    });
  }
  
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
  
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('btn-save-dns');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
      submitBtn.disabled = true;
      
      const dnsData = {
        domain: document.getElementById('dns-domain').value.trim(),
        user: document.getElementById('dns-user').value.trim(),
        records: parseInt(document.getElementById('dns-records').value),
        ns_status: document.getElementById('dns-status').value
      };
      
      try {
        const adminId = AuthManager.getUserId();
        const res = await APIClient.saveAdminDNS(adminId, dnsData);
        if (res.success) {
          if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'success', title: 'Berhasil', text: 'DNS berhasil disimpan!' });
          }
          modal.style.display = 'none';
          await loadDNS();
        } else {
          throw new Error(res.message);
        }
      } catch (error) {
        console.error(error);
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
        }
      } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  }
  
  window.editDNS = (domain) => {
    const d = currentDns.find(x => x.domain === domain);
    if (!d) return;
    
    document.getElementById('dns-modal-title').textContent = 'Edit DNS';
    document.getElementById('dns-domain').value = d.domain;
    document.getElementById('dns-domain').readOnly = true;
    document.getElementById('dns-user').value = d.user;
    document.getElementById('dns-records').value = d.records;
    document.getElementById('dns-status').value = d.ns_status || 'pending';
    
    document.getElementById('dns-modal').style.display = 'flex';
  };
  
  window.deleteDNS = async (domain) => {
    if (typeof Swal !== 'undefined') {
      const result = await Swal.fire({
        title: 'Hapus DNS?',
        text: `Domain ${domain} akan dihapus.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Ya, Hapus'
      });
      
      if (result.isConfirmed) {
        try {
          const res = await APIClient.deleteAdminDNS(AuthManager.getUserId(), domain);
          if (res.success) {
            Swal.fire('Berhasil!', 'DNS telah dihapus.', 'success');
            await loadDNS();
          } else {
            throw new Error(res.message);
          }
        } catch(err) {
          Swal.fire('Error', err.message, 'error');
        }
      }
    }
  };
}

async function loadDNS() {
  const tbody = document.getElementById('dns-table-body');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 16px; display: block;"></i>
        Memuat data DNS...
      </td>
    </tr>
  `;

  try {
    const adminId = AuthManager.getUserId();
    const response = await APIClient.getAdminDNS(adminId);
    
    if (response.success) {
      const mockDns = response.data || [];
      if (mockDns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Belum ada data DNS.</td></tr>';
      } else {
        renderDNS(mockDns, tbody);
      }
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('Failed to load DNS:', error);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--admin-danger);">${error.message}</td></tr>`;
  }
}

function renderDNS(mockDns, tbody) {
  tbody.innerHTML = '';
  currentDns = mockDns;
  
  mockDns.forEach(d => {
    let statusBg, statusColor, statusIcon;
    if (d.ns_status === 'pointed' || d.ns_status === 'Propagated' || d.ns_status === 'aktif') {
        statusBg = 'rgba(16, 185, 129, 0.1)'; statusColor = 'var(--admin-success)'; statusIcon = 'fa-check';
    } else if (d.ns_status === 'pending') {
        statusBg = 'rgba(245, 158, 11, 0.1)'; statusColor = 'var(--admin-warning)'; statusIcon = 'fa-clock';
    } else {
        statusBg = 'rgba(239, 68, 68, 0.1)'; statusColor = 'var(--admin-danger)'; statusIcon = 'fa-times';
    }

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--admin-border)';
    tr.innerHTML = `
      <td style="padding: 16px; font-weight: 600; color: var(--admin-text-main);">
        <i class="fas fa-globe" style="color: var(--admin-primary); margin-right: 8px;"></i> ${d.domain}
      </td>
      <td style="padding: 16px; color: var(--admin-text-muted);">
        ${d.user}
      </td>
      <td style="padding: 16px;">
        <span style="background: var(--admin-surface-hover); padding: 4px 12px; border-radius: 20px; font-size: 0.85rem;">
          ${d.records} Records
        </span>
      </td>
      <td style="padding: 16px;">
        <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; text-transform: capitalize;">
          <i class="fas ${statusIcon}"></i> ${d.ns_status}
        </span>
      </td>
      <td style="padding: 16px; text-align: right;">
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="admin-btn" onclick="window.editDNS('${d.domain}')" style="background: rgba(59, 130, 246, 0.1); color: var(--admin-info); padding: 8px; border-radius: 6px;" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="admin-btn" onclick="window.deleteDNS('${d.domain}')" style="background: rgba(239, 68, 68, 0.1); color: var(--admin-danger); padding: 8px; border-radius: 6px;" title="Hapus">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
