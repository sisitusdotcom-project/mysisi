/**
 * Profile Page Module
 * User account management, profile editing, password change
 */

import APIClient from '/assets/js/modules/unified-api.js';
import { showError, showSuccess, initPasswordToggle } from '/assets/js/modules/unified-utils.js';
import { DashboardAuth } from './auth.js';

export async function render(currentUser) {
  try {
    // Load user profile data
    const result = await APIClient.getUserProfile(currentUser.userId);
    let user = result.data || currentUser;

    // Defensive parsing for corrupt JSON displayName
    if (user.displayName && typeof user.displayName === 'string' && user.displayName.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(user.displayName);
        if (parsed.displayName) {
          user.displayName = parsed.displayName;
        }
        if (parsed.whatsapp) {
          user.whatsapp = parsed.whatsapp;
        }
      } catch (e) {
        console.warn('Failed to parse corrupt user displayName JSON:', e);
      }
    }

    // Setup form with current data
    const formEditProfile = document.getElementById('form-edit-profile');
    if (formEditProfile) {
      document.getElementById('input-name').value = user.displayName || '';
      const inputPhoto = document.getElementById('input-photo');
      if (inputPhoto) inputPhoto.value = user.photoURL || '';
      document.getElementById('input-whatsapp').value = user.whatsapp || '';

      formEditProfile.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleProfileUpdate(currentUser.userId);
      });
    }

    // Setup password change form
    const formChangePassword = document.getElementById('form-change-password');
    if (formChangePassword) {
      initPasswordToggle(formChangePassword);
      formChangePassword.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePasswordChange(currentUser.userId);
      });
      
      const newPwdInput = document.getElementById('input-new-password');
      if (newPwdInput) {
        newPwdInput.addEventListener('input', function() {
          const strengthDiv = document.getElementById('user-password-strength');
          const strengthBar = document.getElementById('user-strength-bar');
          const strengthText = document.getElementById('user-strength-text');
          
          if (!this.value) {
            strengthDiv.style.display = 'none';
            return;
          }
          
          strengthDiv.style.display = 'block';
          
          const checks = {
            length: this.value.length >= 8,
            hasLower: /[a-z]/.test(this.value),
            hasUpper: /[A-Z]/.test(this.value),
            hasNumber: /[0-9]/.test(this.value),
            hasSpecial: /[^A-Za-z0-9]/.test(this.value)
          };
          
          const strength = Object.values(checks).filter(Boolean).length;
          let text = '', className = '';
          
          if (strength <= 2) {
            text = 'Lemah';
            className = 'strength-weak';
            strengthBar.style.background = '#ef4444';
          } else if (strength === 3) {
            text = 'Sedang';
            className = 'strength-fair';
            strengthBar.style.background = '#f59e0b';
          } else if (strength === 4) {
            text = 'Kuat';
            className = 'strength-good';
            strengthBar.style.background = '#3b82f6';
          } else {
            text = 'Sangat Kuat';
            className = 'strength-strong';
            strengthBar.style.background = '#10b981';
          }
          
          strengthBar.className = `strength-bar ${className}`;
          strengthBar.style.width = (strength * 20) + '%';
          strengthText.textContent = text;
        });
      }
    }

  } catch (error) {
    console.error('Error rendering profile:', error);
    document.getElementById('content').innerHTML = `
      <div class="alert alert-error">
        ${error.message}
      </div>
    `;
  }
}

async function handleProfileUpdate(userId) {
  try {
    const displayName = document.getElementById('input-name').value.trim();
    const photoInput = document.getElementById('input-photo');
    const photoURL = photoInput ? photoInput.value.trim() : '';
    const whatsapp = document.getElementById('input-whatsapp').value.trim();

    if (!displayName || displayName.length < 3) {
      showError('Nama minimal 3 karakter');
      return;
    }

    const result = await APIClient.updateUserProfile(userId, displayName, whatsapp, photoURL);

    if (result.success) {
      // Update session
      const user = DashboardAuth.getCurrentUser();
      user.displayName = displayName;
      user.whatsapp = whatsapp;
      user.photoURL = photoURL;
      DashboardAuth.updateSession(user);

      showSuccess('Profil berhasil diperbarui');
    } else {
      throw new Error(result.message || 'Gagal memperbarui profil');
    }

  } catch (error) {
    showError('Error: ' + error.message);
  }
}

async function handlePasswordChange(userId) {
  try {
    const oldPassword = document.getElementById('input-old-password').value;
    const newPassword = document.getElementById('input-new-password').value;
    const confirmPassword = document.getElementById('input-confirm-password').value;

    if (!oldPassword || !newPassword || !confirmPassword) {
      showError('Semua field harus diisi');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Password baru tidak sesuai');
      return;
    }

    if (newPassword.length < 8) {
      showError('Password minimal 8 karakter');
      return;
    }

    const result = await APIClient.changePassword(userId, oldPassword, newPassword);

    if (result.success) {
      showSuccess('Password berhasil diubah');
      document.getElementById('form-change-password').reset();
    } else {
      throw new Error(result.message || 'Gagal mengubah password');
    }

  } catch (error) {
    showError('Error: ' + error.message);
  }
}
