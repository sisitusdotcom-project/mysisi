import APIClient from '/assets/js/modules/unified-api.js';
import { AuthManager } from '/assets/js/modules/unified-auth.js';

let currentUsers = [];

export async function render() {
  console.log('Admin Users Module Loaded');
  setupEventListeners();
  await loadUsers();
}

function setupEventListeners() {
  const btnAdd = document.getElementById('btn-add-user');
  const btnClose = document.getElementById('btn-close-user');
  const modal = document.getElementById('user-modal');
  const form = document.getElementById('user-form');
  
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      form.reset();
      document.getElementById('usr-id').value = '';
      document.getElementById('user-modal-title').textContent = 'Tambah User Baru';
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
      
      const submitBtn = document.getElementById('btn-save-user');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
      submitBtn.disabled = true;
      
      const userData = {
        id: document.getElementById('usr-id').value.trim(),
        name: document.getElementById('usr-name').value.trim(),
        email: document.getElementById('usr-email').value.trim(),
        whatsapp: document.getElementById('usr-wa').value.trim(),
        role: document.getElementById('usr-role').value,
        password: document.getElementById('usr-password').value, // can be empty
        active: document.getElementById('usr-active').checked,
        verified: document.getElementById('usr-verified').checked
      };
      
      try {
        const adminId = AuthManager.getUserId();
        const res = await APIClient.saveAdminUser(adminId, userData);
        if (res.success) {
          if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'success', title: 'Berhasil', text: 'User berhasil disimpan!' });
          }
          modal.style.display = 'none';
          await loadUsers();
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
  
  window.editUser = (id) => {
    const user = currentUsers.find(u => u.id === id);
    if (!user) return;
    
    document.getElementById('user-modal-title').textContent = 'Edit User';
    document.getElementById('usr-id').value = user.id;
    document.getElementById('usr-name').value = user.name;
    document.getElementById('usr-email').value = user.email;
    document.getElementById('usr-wa').value = user.whatsapp || user.wa || ''; // depending on API response
    document.getElementById('usr-role').value = user.role || 'customer';
    document.getElementById('usr-password').value = '';
    
    document.getElementById('usr-active').checked = user.status === 'active';
    // Ideally we should have verified status from API, assume true for existing if not provided
    document.getElementById('usr-verified').checked = user.verified !== false; 
    
    document.getElementById('user-modal').style.display = 'flex';
  };
  
  window.deleteUser = async (id) => {
    if (typeof Swal !== 'undefined') {
      const result = await Swal.fire({
        title: 'Suspend User?',
        text: `User dengan ID ${id} akan di-suspend.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Ya, Suspend'
      });
      
      if (result.isConfirmed) {
        try {
          const res = await APIClient.deleteAdminUser(AuthManager.getUserId(), id);
          if (res.success) {
            Swal.fire('Berhasil!', 'User telah di-suspend.', 'success');
            await loadUsers();
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

async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  // Show loading state in table
  tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 16px; display: block;"></i>
        Memuat data user...
      </td>
    </tr>
  `;

  try {
    const adminId = AuthManager.getUserId();
    const response = await APIClient.getAllUsers(adminId);
    if (response.success && response.data) {
      if (response.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Belum ada user.</td></tr>';
      } else {
        renderTable(response.data, tbody);
      }
    } else {
      throw new Error(response.message || 'Gagal memuat user');
    }
  } catch (error) {
    console.error('Failed to load users:', error);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--admin-danger);">Error: ${error.message}</td></tr>`;
  }
}

function renderTable(users, tbody) {
  tbody.innerHTML = '';
  currentUsers = users;
  
  users.forEach(user => {
    const statusColor = user.status === 'active' ? 'var(--admin-success)' : 'var(--admin-danger)';
    const statusBg = user.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    
    const roleColor = user.role === 'admin' ? 'var(--admin-primary)' : (user.role === 'support' ? 'var(--admin-warning)' : 'var(--admin-text-muted)');
    const rowOpacity = user.status === 'active' ? '1' : '0.6';
    
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--admin-border)';
    tr.style.opacity = rowOpacity;
    
    tr.innerHTML = `
      <td style="padding: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--admin-surface-hover); display: flex; align-items: center; justify-content: center; font-weight: bold; color: var(--admin-primary);">
            ${user.name.charAt(0)}
          </div>
          <div>
            <p style="margin: 0; font-weight: 600;">${user.name}</p>
            <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: var(--admin-text-muted);">${user.email}</p>
          </div>
        </div>
      </td>
      <td style="padding: 16px;">
        <span style="color: ${roleColor}; text-transform: capitalize; font-weight: 500;">
          ${user.role}
        </span>
      </td>
      <td style="padding: 16px;">
        <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; text-transform: capitalize;">
          ${user.status}
        </span>
      </td>
      <td style="padding: 16px; color: var(--admin-text-muted);">
        ${new Date(user.joined).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td style="padding: 16px; text-align: right;">
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="admin-btn" onclick="window.editUser('${user.id}')" style="background: rgba(59, 130, 246, 0.1); color: var(--admin-info); padding: 8px; border-radius: 6px;" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="admin-btn" onclick="window.deleteUser('${user.id}')" style="background: rgba(239, 68, 68, 0.1); color: var(--admin-danger); padding: 8px; border-radius: 6px;" title="Suspend">
            <i class="fas fa-ban"></i>
          </button>
        </div>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}
