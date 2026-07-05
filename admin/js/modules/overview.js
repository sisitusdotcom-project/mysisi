import APIClient from '/assets/js/modules/unified-api.js';
import { AuthManager } from '/assets/js/modules/unified-auth.js';

export async function render() {
  console.log('Admin Overview Module Loaded');

  const refreshBtn = document.getElementById('refresh-stats');
  
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';
      refreshBtn.disabled = true;
      
      await loadStats();
      
      refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
      refreshBtn.disabled = false;
      
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Data diperbarui',
          showConfirmButton: false,
          timer: 2000
        });
      }
    });
  }

  // Initial load
  await loadStats();
}

async function loadStats() {
  try {
    const adminId = AuthManager.getUserId();
    const response = await APIClient.getAdminStats(adminId);
    
    if (response.success && response.data) {
      const stats = response.data;
      
      const usersEl = document.getElementById('stat-users');
      const revenueEl = document.getElementById('stat-revenue');
      const subsEl = document.getElementById('stat-subs');
      const ticketsEl = document.getElementById('stat-tickets');

      if (usersEl) usersEl.textContent = stats.users;
      if (revenueEl) revenueEl.textContent = stats.revenue;
      if (subsEl) subsEl.textContent = stats.subscriptions;
      if (ticketsEl) ticketsEl.textContent = stats.tickets;
      
      const activitiesEl = document.getElementById('recent-activities');
      if (activitiesEl && stats.recentActivities) {
        if (stats.recentActivities.length === 0) {
           activitiesEl.innerHTML = '<p style="color: var(--admin-text-muted); text-align: center; padding: 20px 0;">Belum ada aktivitas.</p>';
        } else {
           activitiesEl.innerHTML = stats.recentActivities.map((act, index) => {
             const isLast = index === stats.recentActivities.length - 1;
             const borderStyle = isLast ? '' : 'border-bottom: 1px solid var(--admin-border); padding-bottom: 12px;';
             
             let iconStr = '';
             let bgStyle = '';
             let colorStyle = '';
             
             if (act.type === 'transaction') {
               iconStr = '<i class="fas fa-check"></i>';
               bgStyle = 'rgba(16, 185, 129, 0.2)';
               colorStyle = 'var(--admin-success)';
             } else if (act.type === 'user') {
               iconStr = '<i class="fas fa-user-plus"></i>';
               bgStyle = 'rgba(59, 130, 246, 0.2)';
               colorStyle = 'var(--admin-info)';
             } else {
               iconStr = '<i class="fas fa-ticket-alt"></i>';
               bgStyle = 'rgba(245, 158, 11, 0.2)';
               colorStyle = 'var(--admin-warning)';
             }
             
             // Format relative time if possible, else just use timeStr
             let timeText = act.timeStr;
             try {
               const dateObj = new Date(act.timeStr);
               if (!isNaN(dateObj.getTime())) {
                 const diffMinutes = Math.floor((Date.now() - dateObj.getTime()) / 60000);
                 if (diffMinutes < 1) timeText = 'Baru saja';
                 else if (diffMinutes < 60) timeText = `${diffMinutes} menit lalu`;
                 else if (diffMinutes < 1440) timeText = `${Math.floor(diffMinutes/60)} jam lalu`;
                 else timeText = dateObj.toLocaleDateString('id-ID', {day: 'numeric', month: 'short'});
               }
             } catch(e) {}

             return `
              <div style="display: flex; gap: 12px; ${borderStyle}">
                  <div style="width: 36px; height: 36px; border-radius: 50%; background: ${bgStyle}; color: ${colorStyle}; display: flex; align-items: center; justify-content: center;">
                      ${iconStr}
                  </div>
                  <div>
                      <p style="margin: 0 0 4px 0; font-size: 0.9rem;">${act.title}</p>
                      <p style="margin: 0; font-size: 0.75rem; color: var(--admin-text-muted);">${timeText}</p>
                  </div>
              </div>
             `;
           }).join('');
        }
      }

      renderChart();
    } else {
      throw new Error(response.message || 'Gagal mengambil statistik');
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
    if (typeof Swal !== 'undefined') {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal mengambil data statistik' });
    }
  }
}

let registrationChart = null;

function renderChart() {
  const ctx = document.getElementById('registration-chart');
  if (!ctx) return;
  
  // Hancurkan chart lama jika ada, agar tidak double render saat ganti menu
  if (registrationChart) {
    registrationChart.destroy();
  }

  // Data dummy yang representatif untuk grafik 7 hari terakhir
  const labels = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const dataPoints = [12, 19, 15, 25, 22, 30, 28];

  registrationChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Pendaftaran Baru',
        data: dataPoints,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderWidth: 2,
        fill: true,
        tension: 0.4, // Membuat garis menjadi melengkung (smooth)
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#6366f1'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // Sembunyikan legend karena hanya ada 1 dataset
        },
        tooltip: {
          backgroundColor: 'rgba(15, 17, 26, 0.9)',
          titleColor: '#f8fafc',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10
        }
      },
      scales: {
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: '#94a3b8'
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#94a3b8',
            stepSize: 10
          },
          beginAtZero: true
        }
      }
    }
  });
}
