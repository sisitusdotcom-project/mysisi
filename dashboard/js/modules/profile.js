/**
 * Profile Page Module
 * User account management, profile editing, password change
 */

import APIClient from '/assets/js/modules/unified-api.js';
import { showError, showSuccess } from '/assets/js/modules/unified-utils.js';
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
      document.getElementById('input-whatsapp').value = user.whatsapp || '';

      formEditProfile.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleProfileUpdate(currentUser.userId);
      });
    }

    // Setup password change form
    const formChangePassword = document.getElementById('form-change-password');
    if (formChangePassword) {
      formChangePassword.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePasswordChange(currentUser.userId);
      });
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
    const whatsapp = document.getElementById('input-whatsapp').value.trim();

    if (!displayName || displayName.length < 3) {
      showError('Nama minimal 3 karakter');
      return;
    }

    const result = await APIClient.updateUserProfile(userId, displayName, whatsapp);

    if (result.success) {
      // Update session
      const user = DashboardAuth.getCurrentUser();
      user.displayName = displayName;
      user.whatsapp = whatsapp;
      DashboardAuth.updateSession(user);

      showSuccess('Profil berhasil diperbarui');
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
    }

  } catch (error) {
    showError('Error: ' + error.message);
  }
}
