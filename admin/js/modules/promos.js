import APIClient from '/assets/js/modules/unified-api.js';
import { AuthManager } from '/assets/js/modules/unified-auth.js';

let currentPromos = [];

export async function render() {
  console.log('Admin Promos Module Loaded');
  setupEventListeners();
  await loadPromos();
}

function setupEventListeners() {
  const btnAdd = document.getElementById('btn-add-promo');
  const btnClose = document.getElementById('btn-close-promo');
  const modal = document.getElementById('promo-modal');
  const form = document.getElementById('promo-form');
  
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      form.reset();
      document.getElementById('promo-code').readOnly = false;
      document.getElementById('promo-modal-title').textContent = 'Buat Promo Baru';
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
      
      const submitBtn = document.getElementById('btn-save-promo');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
      submitBtn.disabled = true;
      
      const promoData = {
        code: document.getElementById('promo-code').value.trim(),
        type: document.getElementById('promo-type').value,
        value: parseInt(document.getElementById('promo-value').value),
        limit: parseInt(document.getElementById('promo-limit').value),
        desc: document.getElementById('promo-desc').value.trim(),
        start: document.getElementById('promo-start').value,
        end: document.getElementById('promo-end').value,
        active: document.getElementById('promo-active').checked
      };
      
      try {
        const adminId = AuthManager.getUserId();
        const res = await APIClient.saveAdminPromo(adminId, promoData);
        if (res.success) {
          if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Promo berhasil disimpan!' });
          }
          modal.style.display = 'none';
          await loadPromos(); // reload table
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
  
  // Expose edit and delete to window so inline onclick can use it
  window.editPromo = (code) => {
    const promo = currentPromos.find(p => p.code === code);
    if (!promo) return;
    
    document.getElementById('promo-modal-title').textContent = 'Edit Promo';
    document.getElementById('promo-code').value = promo.code;
    document.getElementById('promo-code').readOnly = true; // prevent changing code
    document.getElementById('promo-type').value = promo.type;
    document.getElementById('promo-value').value = promo.value;
    document.getElementById('promo-limit').value = promo.limit;
    document.getElementById('promo-desc').value = promo.description || promo.desc || '';
    
    // Format dates for datetime-local (YYYY-MM-DDThh:mm)
    try {
      if (promo.start) document.getElementById('promo-start').value = new Date(promo.start).toISOString().slice(0,16);
      if (promo.end) document.getElementById('promo-end').value = new Date(promo.end).toISOString().slice(0,16);
    } catch(e) {}
    
    document.getElementById('promo-active').checked = promo.active;
    
    document.getElementById('promo-modal').style.display = 'flex';
  };
  
  window.deletePromo = async (code) => {
    if (typeof Swal !== 'undefined') {
      const result = await Swal.fire({
        title: 'Nonaktifkan Promo?',
        text: `Promo ${code} akan dinonaktifkan.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Ya, Nonaktifkan'
      });
      
      if (result.isConfirmed) {
        try {
          const res = await APIClient.deleteAdminPromo(AuthManager.getUserId(), code);
          if (res.success) {
            Swal.fire('Berhasil!', 'Promo telah dinonaktifkan.', 'success');
            await loadPromos();
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

async function loadPromos() {
  const tbody = document.getElementById('promos-table-body');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 16px; display: block;"></i>
        Memuat data promo...
      </td>
    </tr>
  `;

  try {
    const adminId = AuthManager.getUserId();
    const response = await APIClient.getAdminPromos(adminId);
    
    if (response.success) {
      const promos = response.data || [];
      if (promos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Belum ada kode promo.</td></tr>';
      } else {
        renderPromos(promos, tbody);
      }
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('Failed to load promos:', error);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--admin-danger);">${error.message}</td></tr>`;
  }
}

function renderPromos(promos, tbody) {
  tbody.innerHTML = '';
  currentPromos = promos;
  
  promos.forEach(p => {
    let valStr = p.type === 'percentage' ? `${p.value}%` : `Rp ${p.value.toLocaleString('id-ID')}`;
    let usageStr = p.limit === -1 || p.limit === undefined || p.limit === null || p.limit === '' ? `${p.usage || 0} / ∞` : `${p.usage || 0} / ${p.limit}`;
    let statusBg = p.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    let statusColor = p.active ? 'var(--admin-success)' : 'var(--admin-danger)';
    let statusText = p.active ? 'Aktif' : 'Nonaktif';
    
    let endDate = p.end ? new Date(p.end).toLocaleDateString('id-ID', { month: 'short', year: 'numeric', day: 'numeric' }) : '-';

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--admin-border)';
    tr.innerHTML = `
      <td style="padding: 16px;">
        <span style="font-family: monospace; background: var(--admin-surface-hover); padding: 4px 8px; border-radius: 4px; font-weight: bold; border: 1px dashed var(--admin-border); letter-spacing: 1px;">
          ${p.code}
        </span>
      </td>
      <td style="padding: 16px;">
        <p style="margin: 0; font-weight: 600;">${valStr}</p>
        <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: var(--admin-text-muted); text-transform: capitalize;">${p.type}</p>
      </td>
      <td style="padding: 16px;">
        ${usageStr}
      </td>
      <td style="padding: 16px; font-size: 0.9rem; color: var(--admin-text-muted);">
        s/d ${endDate}
      </td>
      <td style="padding: 16px;">
        <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
          ${statusText}
        </span>
      </td>
      <td style="padding: 16px; text-align: right;">
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="admin-btn" onclick="window.editPromo('${p.code}')" style="background: rgba(59, 130, 246, 0.1); color: var(--admin-info); padding: 8px; border-radius: 6px;" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="admin-btn" onclick="window.deletePromo('${p.code}')" style="background: rgba(239, 68, 68, 0.1); color: var(--admin-danger); padding: 8px; border-radius: 6px;" title="Nonaktifkan">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
