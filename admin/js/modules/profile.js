import APIClient from '/assets/js/modules/unified-api.js';
import { AuthManager } from '/assets/js/modules/unified-auth.js';

export async function render() {
  try {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) throw new Error('Not logged in');

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
      formChangePassword.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePasswordChange(currentUser.userId);
      });
      
      // Setup toggle password visibility
      const toggleBtns = document.querySelectorAll('.toggle-password-btn');
      toggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
          const targetId = this.getAttribute('data-target');
          const input = document.getElementById(targetId);
          const icon = this.querySelector('i');
          
          if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
          } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
          }
        });
      });
      
      // Setup password strength indicator
      const newPwdInput = document.getElementById('input-new-password');
      if (newPwdInput) {
        newPwdInput.addEventListener('input', function() {
          updatePasswordStrength(this.value, 'admin-password-strength', 'admin-strength-bar', 'admin-strength-text');
        });
      }
    }

  } catch (error) {
    console.error('Error rendering profile:', error);
    Swal.fire('Error', error.message, 'error');
  }
}

async function handleProfileUpdate(userId) {
  try {
    const displayName = document.getElementById('input-name').value.trim();
    const photoInput = document.getElementById('input-photo');
    const photoURL = photoInput ? photoInput.value.trim() : '';
    const whatsapp = document.getElementById('input-whatsapp').value.trim();

    if (!displayName || displayName.length < 3) {
      Swal.fire('Error', 'Nama minimal 3 karakter', 'error');
      return;
    }

    // Show loading state (you could implement a spinner button)
    const btn = document.querySelector('#form-edit-profile button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    const result = await APIClient.updateUserProfile(userId, displayName, whatsapp, photoURL);

    if (result.success) {
      // Update session
      const user = AuthManager.getCurrentUser();
      user.displayName = displayName;
      user.whatsapp = whatsapp;
      user.photoURL = photoURL;
      AuthManager.updateUser(user);

      Swal.fire('Sukses', 'Profil berhasil diperbarui', 'success');
      
      // Update Navbar immediately
      const initials = displayName.charAt(0).toUpperCase();
      const profileBtn = document.getElementById('admin-profile-trigger');
      if (profileBtn) {
        const avatarEl = profileBtn.querySelector('.admin-avatar');
        if (avatarEl) avatarEl.textContent = initials;
        const nameEl = profileBtn.querySelector('span');
        if (nameEl) nameEl.textContent = displayName;
      }
    } else {
      throw new Error(result.message || 'Gagal memperbarui profil');
    }

  } catch (error) {
    Swal.fire('Error', error.message, 'error');
  } finally {
    const btn = document.querySelector('#form-edit-profile button[type="submit"]');
    if (btn) {
      btn.innerHTML = 'Simpan Profil';
      btn.disabled = false;
    }
  }
}

async function handlePasswordChange(userId) {
  try {
    const oldPassword = document.getElementById('input-old-password').value;
    const newPassword = document.getElementById('input-new-password').value;
    const confirmPassword = document.getElementById('input-confirm-password').value;

    if (!oldPassword || !newPassword || !confirmPassword) {
      Swal.fire('Error', 'Semua field harus diisi', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      Swal.fire('Error', 'Password baru tidak sesuai', 'error');
      return;
    }

    if (newPassword.length < 8) {
      Swal.fire('Error', 'Password minimal 8 karakter', 'error');
      return;
    }
    
    const btn = document.querySelector('#form-change-password button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    const result = await APIClient.changePassword(userId, oldPassword, newPassword);

    if (result.success) {
      Swal.fire('Sukses', 'Password berhasil diubah', 'success');
      document.getElementById('form-change-password').reset();
    } else {
      throw new Error(result.message || 'Gagal mengubah password');
    }

  } catch (error) {
    Swal.fire('Error', error.message, 'error');
  } finally {
    const btn = document.querySelector('#form-change-password button[type="submit"]');
    if (btn) {
      btn.innerHTML = 'Ubah Password';
      btn.disabled = false;
    }
  }
}

function updatePasswordStrength(password, strengthDivId, strengthBarId, strengthTextId) {
  const strengthDiv = document.getElementById(strengthDivId);
  const strengthBar = document.getElementById(strengthBarId);
  const strengthText = document.getElementById(strengthTextId);

  if (!strengthDiv || !strengthBar || !strengthText) return;

  if (!password) {
    strengthDiv.style.display = 'none';
    return;
  }

  strengthDiv.style.display = 'block';

  let strength = 0;
  let text = '';
  let className = '';

  const checks = {
    length: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password)
  };

  strength = Object.values(checks).filter(Boolean).length;

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
}
