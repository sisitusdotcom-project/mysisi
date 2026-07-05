import APIClient from '/assets/js/modules/unified-api.js';
import { AuthManager } from '/assets/js/modules/unified-auth.js';

let currentPackages = [];

export async function render() {
  console.log('Admin Packages Module Loaded');
  setupEventListeners();
  await loadPackages();
}

function setupEventListeners() {
  const btnAdd = document.getElementById('btn-add-package');
  const btnClose = document.getElementById('btn-close-package');
  const modal = document.getElementById('package-modal');
  const form = document.getElementById('package-form');
  
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      form.reset();
      document.getElementById('pkg-id').readOnly = false;
      document.getElementById('package-modal-title').textContent = 'Buat Paket Baru';
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
      
      const submitBtn = document.getElementById('btn-save-package');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
      submitBtn.disabled = true;
      
      const packageData = {
        id: document.getElementById('pkg-id').value.trim(),
        name: document.getElementById('pkg-name').value.trim(),
        price: parseInt(document.getElementById('pkg-price').value),
        cycle: document.getElementById('pkg-cycle').value,
        desc: document.getElementById('pkg-desc').value.trim(),
        storage: document.getElementById('pkg-storage').value.trim(),
        emailAcc: document.getElementById('pkg-email').value.trim(),
        ssl: document.getElementById('pkg-ssl').value.trim(),
        backup: document.getElementById('pkg-backup').value.trim(),
        support: document.getElementById('pkg-support').value.trim(),
        active: document.getElementById('pkg-active').checked
      };
      
      try {
        const adminId = AuthManager.getUserId();
        const res = await APIClient.saveAdminPackage(adminId, packageData);
        if (res.success) {
          if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Paket berhasil disimpan!' });
          }
          modal.style.display = 'none';
          await loadPackages(); // reload list
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
  
  window.editPackage = (id) => {
    const pkg = currentPackages.find(p => p.id === id);
    if (!pkg) return;
    
    document.getElementById('package-modal-title').textContent = 'Edit Paket';
    document.getElementById('pkg-id').value = pkg.id;
    document.getElementById('pkg-id').readOnly = true; // prevent changing ID
    document.getElementById('pkg-name').value = pkg.name;
    document.getElementById('pkg-price').value = pkg.price;
    document.getElementById('pkg-cycle').value = pkg.cycle;
    document.getElementById('pkg-desc').value = pkg.desc || '';
    document.getElementById('pkg-storage').value = pkg.storage || 'N/A';
    document.getElementById('pkg-email').value = pkg.emailAcc || 'Limited';
    document.getElementById('pkg-ssl').value = pkg.ssl || 'Free';
    document.getElementById('pkg-backup').value = pkg.backup || 'Manual';
    document.getElementById('pkg-support').value = pkg.support || 'Standard';
    
    document.getElementById('pkg-active').checked = pkg.active;
    
    document.getElementById('package-modal').style.display = 'flex';
  };
  
  window.deletePackage = async (id) => {
    if (typeof Swal !== 'undefined') {
      const result = await Swal.fire({
        title: 'Nonaktifkan Paket?',
        text: `Paket dengan ID ${id} akan dinonaktifkan.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Ya, Nonaktifkan'
      });
      
      if (result.isConfirmed) {
        try {
          const res = await APIClient.deleteAdminPackage(AuthManager.getUserId(), id);
          if (res.success) {
            Swal.fire('Berhasil!', 'Paket telah dinonaktifkan.', 'success');
            await loadPackages();
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

async function loadPackages() {
  const container = document.getElementById('packages-grid');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--admin-text-muted);">
      <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 16px; display: block;"></i>
      Memuat data paket...
    </div>
  `;

  try {
    const adminId = AuthManager.getUserId();
    const response = await APIClient.getAdminPackages(adminId);
    
    if (response.success) {
      const packages = response.data || [];
      if (packages.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px;">Belum ada paket.</div>';
      } else {
        renderPackages(packages, container);
      }
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('Failed to load packages:', error);
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--admin-danger);">${error.message}</div>`;
  }
}

function renderPackages(packages, container) {
  container.innerHTML = '';
  currentPackages = packages;
  
  packages.forEach((pkg, index) => {
    // Determine if we should highlight this package
    const isPopular = index === 1; // Highlight the second package visually
    const inactiveStyle = pkg.active ? '' : 'opacity: 0.6; filter: grayscale(1);';
    
    const card = document.createElement('div');
    card.style.background = isPopular ? 'linear-gradient(145deg, rgba(99, 102, 241, 0.1), rgba(0, 0, 0, 0.2))' : 'rgba(0, 0, 0, 0.2)';
    card.style.border = isPopular ? '1px solid var(--admin-primary)' : '1px solid var(--admin-border)';
    card.style.borderRadius = '16px';
    card.style.padding = '24px';
    card.style.position = 'relative';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.cssText += inactiveStyle;
    
    let popularBadge = isPopular ? 
      `<div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--admin-primary); color: white; padding: 4px 16px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">Paling Populer</div>` 
      : '';
      
    let inactiveBadge = !pkg.active ? 
      `<div style="position: absolute; top: 10px; right: 10px; background: var(--admin-danger); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">NONAKTIF</div>` 
      : '';
      
    let featuresHtml = pkg.features.filter(f => f.trim().length > 0).map(f => `
      <li style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-check-circle" style="color: var(--admin-primary);"></i>
        <span style="color: var(--admin-text-muted);">${f.trim()}</span>
      </li>
    `).join('');

    card.innerHTML = `
      ${popularBadge}
      ${inactiveBadge}
      <h3 style="margin: 0 0 8px 0; color: var(--admin-text-main); font-size: 1.25rem;">${pkg.name}</h3>
      <div style="margin-bottom: 24px;">
        <span style="font-size: 2rem; font-weight: 700; color: var(--admin-text-main);">Rp ${pkg.price.toLocaleString('id-ID')}</span>
        <span style="color: var(--admin-text-muted);">/${pkg.cycle} Tahun</span>
      </div>
      
      <ul style="list-style: none; padding: 0; margin: 0 0 24px 0; flex-grow: 1;">
        ${featuresHtml}
      </ul>
      
      <div style="display: flex; gap: 12px; margin-top: auto;">
        <button class="admin-btn" onclick="window.editPackage('${pkg.id}')" style="flex: 1; background: var(--admin-primary); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600;">
          Edit Paket
        </button>
        <button class="admin-btn" onclick="window.deletePackage('${pkg.id}')" style="width: 44px; background: rgba(239, 68, 68, 0.1); color: var(--admin-danger); border: none; border-radius: 8px;" title="Nonaktifkan">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    
    container.appendChild(card);
  });
}
