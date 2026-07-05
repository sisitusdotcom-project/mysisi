import { AuthManager } from '/assets/js/modules/unified-auth.js';
import APIClient from '/assets/js/modules/unified-api.js';

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in as admin, redirect to dashboard
  if (AuthManager.isAdmin()) {
    window.location.href = '/admin/index.html';
    return;
  }

  const form = document.getElementById('admin-login-form');
  const errorBox = document.getElementById('error-box');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    errorBox.style.display = 'none';
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memverifikasi...';
    submitBtn.disabled = true;

    try {
      const response = await APIClient.loginUser(email, password);
      
      if (response.success && response.data) {
        AuthManager.saveSession(response.data);
        
        // Cek apakah benar-benar admin
        if (AuthManager.isAdmin()) {
          window.location.href = '/admin/index.html';
        } else {
          // Jika bukan admin, logout dan beri error
          AuthManager.clearSession();
          showError('Akses ditolak. Anda tidak memiliki izin Admin.');
        }
      } else {
        showError(response.message || 'Login gagal.');
      }
    } catch (error) {
      console.error('Login error:', error);
      showError(error.message || 'Terjadi kesalahan pada server.');
    } finally {
      submitBtn.innerHTML = 'Masuk ke Dashboard';
      submitBtn.disabled = false;
    }
  });

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }
});
