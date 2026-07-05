import APIClient from '/assets/js/modules/unified-api.js';
import { AuthManager } from '/assets/js/modules/unified-auth.js';

let currentTickets = [];

export async function render() {
  console.log('Admin Support Tickets Module Loaded');
  setupEventListeners();
  await loadTickets();
}

function setupEventListeners() {
  const btnAdd = document.getElementById('btn-add-ticket');
  const btnClose = document.getElementById('btn-close-ticket');
  const modal = document.getElementById('ticket-modal');
  const form = document.getElementById('ticket-form');
  
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      form.reset();
      document.getElementById('tck-id').value = '';
      document.getElementById('ticket-modal-title').textContent = 'Buat Tiket Baru';
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
      
      const submitBtn = document.getElementById('btn-save-ticket');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
      submitBtn.disabled = true;
      
      const tckData = {
        id: document.getElementById('tck-id').value.trim(),
        subject: document.getElementById('tck-subject').value.trim(),
        user: document.getElementById('tck-user').value.trim(),
        priority: document.getElementById('tck-priority').value,
        status: document.getElementById('tck-status').value
      };
      
      try {
        const adminId = AuthManager.getUserId();
        const res = await APIClient.saveAdminTicket(adminId, tckData);
        if (res.success) {
          if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Tiket berhasil disimpan!' });
          }
          modal.style.display = 'none';
          await loadTickets();
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
  
  window.editTicket = (id, event) => {
    if(event) event.stopPropagation();
    const t = currentTickets.find(x => x.id === id);
    if (!t) return;
    
    document.getElementById('ticket-modal-title').textContent = 'Edit Tiket';
    document.getElementById('tck-id').value = t.id;
    document.getElementById('tck-subject').value = t.subject;
    document.getElementById('tck-user').value = t.user;
    document.getElementById('tck-priority').value = t.priority || 'medium';
    document.getElementById('tck-status').value = t.status || 'open';
    
    document.getElementById('ticket-modal').style.display = 'flex';
  };
  
  window.deleteTicket = async (id, event) => {
    if(event) event.stopPropagation();
    if (typeof Swal !== 'undefined') {
      const result = await Swal.fire({
        title: 'Tutup Tiket?',
        text: `Tiket ${id} akan ditutup.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Ya, Tutup'
      });
      
      if (result.isConfirmed) {
        try {
          const res = await APIClient.deleteAdminTicket(AuthManager.getUserId(), id);
          if (res.success) {
            Swal.fire('Berhasil!', 'Tiket telah ditutup.', 'success');
            await loadTickets();
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

async function loadTickets() {
  const listContainer = document.getElementById('ticket-list');
  if (!listContainer) return;

  listContainer.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--admin-text-muted);">
      <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 16px; display: block;"></i>
      Memuat tiket...
    </div>
  `;

  try {
    const adminId = AuthManager.getUserId();
    const response = await APIClient.getAdminTickets(adminId);
    
    if (response.success) {
      const tickets = response.data || [];
      if (tickets.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 20px;">Belum ada tiket support.</div>';
      } else {
        renderTickets(tickets, listContainer);
      }
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('Failed to load tickets:', error);
    listContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--admin-danger);">${error.message}</div>`;
  }
}

function renderTickets(tickets, listContainer) {
  listContainer.innerHTML = '';
  currentTickets = tickets;
  
  tickets.forEach((t, index) => {
    // Only select the first item for demonstration
    let isActive = index === 0;
    
    let statusColor = (t.status === 'Open' || t.status === 'open') ? 'var(--admin-warning)' : ((t.status === 'Closed' || t.status === 'closed') ? 'var(--admin-text-muted)' : 'var(--admin-success)');
    let priorityBadge = (t.priority === 'High' || t.priority === 'high') ? '<i class="fas fa-fire" style="color: var(--admin-danger);"></i>' : '';

    const div = document.createElement('div');
    div.style.padding = '16px';
    div.style.borderBottom = '1px solid var(--admin-border)';
    div.style.background = isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent';
    div.style.borderLeft = isActive ? '3px solid var(--admin-primary)' : '3px solid transparent';
    div.style.cursor = 'pointer';
    div.style.transition = 'background 0.2s';
    
    div.onmouseover = () => { if(!isActive) div.style.background = 'var(--admin-surface-hover)'; };
    div.onmouseout = () => { if(!isActive) div.style.background = 'transparent'; };

    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <h4 style="margin: 0; color: var(--admin-text-main); font-size: 0.95rem; word-break: break-all;">
          ${priorityBadge} ${t.subject}
        </h4>
        <span style="font-size: 0.8rem; color: var(--admin-text-muted); min-width: 70px; text-align: right;">${new Date(t.time).toLocaleDateString()}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.85rem; color: var(--admin-text-muted);"><i class="fas fa-user" style="margin-right: 4px;"></i> ${t.user}</span>
        <span style="font-size: 0.8rem; font-weight: 600; color: ${statusColor}; text-transform: capitalize;">${t.status}</span>
      </div>
      <div style="margin-top: 12px; display: flex; gap: 8px;">
         <button class="admin-btn" onclick="window.editTicket('${t.id}', event)" style="background: rgba(59, 130, 246, 0.1); color: var(--admin-info); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;" title="Edit">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="admin-btn" onclick="window.deleteTicket('${t.id}', event)" style="background: rgba(239, 68, 68, 0.1); color: var(--admin-danger); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;" title="Tutup">
            <i class="fas fa-times"></i> Tutup
          </button>
      </div>
    `;
    listContainer.appendChild(div);
  });
}
