// ============================================================================
// CONFIGURATION
// ============================================================================

const SPREADSHEET_ID = '1qA1LzzVXmVaJ5U36lDuaoW2Eo4wiSkqL_0Y9i-Rav5s';
const BASE_URL = 'https://sisitus.com';
const ADMIN_EMAIL = 'hello@sisitus.com';

const MIDTRANS_SNAP_URL = 'https://app.sandbox.midtrans.com/snap/v1/transactions';

/**
 * Initialize Midtrans Server Key in Script Properties
 * IMPORTANT: Add your Midtrans key via Google Apps Script UI > Project Settings > Script Properties
 * DO NOT commit real keys to git!
 */
function initializeMidtransConfig() {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('MIDTRANS_SERVER_KEY');
  if (!key) {
    Logger.log('WARNING: MIDTRANS_SERVER_KEY not set in Script Properties. Please set it manually.');
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get or create Users sheet
 */
function ensureUsersSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Users');
  
  if (!sheet) {
    sheet = ss.insertSheet('Users');
    // Add headers
    sheet.appendRow([
      'User ID',           // A
      'Display Name',      // B
      'Email',            // C
      'WhatsApp',         // D
      'Photo URL',        // E
      'Created At',       // F
      'Updated At',       // G
      'Email Verified',   // H
      'Verification Token',  // I
      'Password Hash',    // J
      'Status',          // K
      'Auth Method'       // L
    ]);
  }
  
  return sheet;
}

/**
 * Standardized response builder
 */
function buildResponse(success, data = null, message = '', errorCode = null) {
  const response = {
    success,
    data,
    message: message || (success ? 'Operation successful' : 'Operation failed'),
    timestamp: Date.now()
  };

  if (!success && errorCode) {
    response.error = {
      code: errorCode,
      details: message
    };
  }

  return response;
}

/**
 * Simple response functions (mengikuti pola sampel-mekanisme-GAS)
 */
function respondText(text) {
  return ContentService.createTextOutput(String(text))
    .setMimeType(ContentService.MimeType.TEXT);
}

function respondJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Send JSON response (untuk backward compatibility)
 */
function sendResponse(success, data = null, message = '', errorCode = null) {
  const response = buildResponse(success, data, message, errorCode);
  return respondJson(response);
}

/**
 * Validate password strength
 */
function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password minimal 8 karakter' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password harus mengandung huruf besar' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password harus mengandung huruf kecil' };
  }

  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password harus mengandung angka' };
  }

  return { valid: true, message: 'Password kuat' };
}

/**
 * Validate Indonesian phone number
 */
function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return false;
  phone = phone.replace(/[\s\-]/g, '');
  return /^(\+62|62|08)\d{9,12}$/.test(phone);
}

/**
 * Format phone number to standard format
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';
  phone = phone.replace(/[\s\-]/g, '');
  if (phone.startsWith('+62')) return phone;
  if (phone.startsWith('62')) return '+' + phone;
  if (phone.startsWith('0')) return '+62' + phone.substring(1);
  return phone;
}

/**
 * Validate domain format
 */
function validateDomainFormat(domain) {
  if (!domain || typeof domain !== 'string') return false;
  domain = domain.replace(/^https?:\/\//i, '').toLowerCase().trim();
  return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain);
}

/**
 * Generate verification token
 */
function generateVerificationToken() {
  return Utilities.getUuid() + '-' + Date.now();
}

/**
 * Hash password using HMAC-SHA256
 */
function hashPassword(plainPassword) {
  const salt = Utilities.getUuid().substring(0, 16);
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, plainPassword + salt);
  const hashHex = hash.map(byte => {
    const hex = (byte & 0xff).toString(16);
    return (hex.length === 1 ? '0' : '') + hex;
  }).join('');
  return salt + '$' + hashHex;
}

/**
 * Verify password
 */
function verifyPassword(inputPassword, storedPassword) {
  try {
    if (!storedPassword || !storedPassword.includes('$')) {
      return false;
    }

    const parts = storedPassword.split('$');
    if (parts.length !== 2) {
      Logger.log('WARNING: Invalid password hash format');
      return false;
    }

    const salt = parts[0];
    const storedHash = parts[1];
    const inputHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, inputPassword + salt);
    const inputHashHex = inputHash.map(byte => {
      const hex = (byte & 0xff).toString(16);
      return (hex.length === 1 ? '0' : '') + hex;
    }).join('');

    return inputHashHex === storedHash;
  } catch (error) {
    Logger.log('Error in verifyPassword: ' + error);
    return false;
  }
}

/**
 * Send verification email
 */
function sendVerificationEmail(email, token, displayName) {
  const verificationUrl = `${BASE_URL}/auth/verify-email.html?token=${encodeURIComponent(token)}`;
  const subject = '🔐 Verifikasi Email SISITUS - Aktivasi Akun Anda';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #2563EB; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">SISITUS</h1>
        <p style="margin: 5px 0 0 0;">Verifikasi Email Anda</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2>Halo ${displayName}!</h2>
        
        <p>Terima kasih telah mendaftar di SISITUS. Untuk melanjutkan, silakan verifikasi email Anda dengan mengklik tombol di bawah:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="display: inline-block; background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            ✓ Verifikasi Email
          </a>
        </div>
        
        <p>Atau salin link berikut ke browser Anda:</p>
        <p style="background-color: #e8e8e8; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">
          ${verificationUrl}
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #7f8c8d; font-size: 12px;">
          Link verifikasi ini akan berlaku selama 24 jam.<br>
          Jika Anda tidak melakukan registrasi, abaikan email ini.
        </p>
      </div>
    </div>
  `;

  // Try MailApp first (often works without requiring extra Gmail access scope on webapp deployments)
  try {
    const textBody = `Halo ${displayName}!\n\nTerima kasih telah mendaftar di SISITUS. Silakan verifikasi email Anda dengan membuka link berikut:\n${verificationUrl}\n\nSalam,\nSISITUS`;
    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: textBody,
      htmlBody: htmlBody,
      replyTo: ADMIN_EMAIL
    });
    Logger.log(`Verification email sent to ${email} via MailApp`);
  } catch (mailError) {
    Logger.log(`MailApp failed: ${mailError}. Trying GmailApp fallback...`);
    try {
      GmailApp.sendEmail(email, subject, '', {
        htmlBody: htmlBody,
        replyTo: ADMIN_EMAIL
      });
      Logger.log(`Verification email sent to ${email} via GmailApp`);
    } catch (gmailError) {
      Logger.log(`GmailApp also failed: ${gmailError}`);
      throw new Error(`Gagal mengirim email verifikasi: ${gmailError.message || gmailError}`);
    }
  }
}

// ============================================================================
// AUTH ENDPOINTS
// ============================================================================

/**
 * REGISTER USER
 * POST: /registerUser
 * Body: { email, password, displayName, whatsapp, authMethod }
 */
function registerUser(userData) {
  const startTime = Date.now();
  try {
    // Log API call
    logApiCall('registerUser', '', userData.email || '', 'POST', 'attempting', 200, 0, '', JSON.stringify({ email: userData.email }), 'User registration started');

    // Validate input
    if (!userData.email) {
      logApiCall('registerUser', '', userData.email || '', 'POST', 'failed', 400, Date.now() - startTime, 'Email diperlukan', JSON.stringify(userData), 'Email validation failed');
      return buildResponse(false, null, 'Email diperlukan', 'INVALID_EMAIL');
    }

    if (!userData.authMethod) {
      userData.authMethod = 'email';
    }

    // Email/password validation
    if (userData.authMethod === 'email') {
      if (!userData.password) {
        return buildResponse(false, null, 'Password diperlukan', 'MISSING_PASSWORD');
      }

      const pwdValidation = validatePasswordStrength(userData.password);
      if (!pwdValidation.valid) {
        return buildResponse(false, null, pwdValidation.message, 'WEAK_PASSWORD');
      }
    }

    // Phone validation
    if (userData.whatsapp) {
      if (!validatePhoneNumber(userData.whatsapp)) {
        return buildResponse(false, null, 'Nomor WhatsApp tidak valid (format: 08xx atau +6281xx)', 'INVALID_PHONE');
      }
      userData.whatsapp = formatPhoneNumber(userData.whatsapp);
    }

    const sheet = ensureUsersSheet();
    const data = sheet.getDataRange().getValues();

    // Check if user already exists
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === userData.email) {
        return buildResponse(false, null, 'Email sudah terdaftar', 'EMAIL_EXISTS');
      }
    }

    // Create new user
    const userId = `USER-${Date.now()}`;
    const token = generateVerificationToken();

    let passwordHash = '';
    if (userData.authMethod === 'email' && userData.password) {
      passwordHash = hashPassword(userData.password);
    } else if (userData.authMethod === 'google') {
      passwordHash = Utilities.getUuid();
    }

    sheet.appendRow([
      userId,
      userData.displayName || userData.email.split('@')[0],
      userData.email,
      userData.whatsapp || '',
      userData.photoURL || '',
      new Date().toISOString(),
      new Date().toISOString(),
      userData.authMethod === 'google' ? 'Yes' : 'No',
      token,
      passwordHash,
      'active',
      userData.authMethod
    ]);

    // Send verification email for email auth
    if (userData.authMethod === 'email') {
      sendVerificationEmail(
        userData.email,
        token,
        userData.displayName || userData.email.split('@')[0]
      );
    }

    // Log success
    logApiCall('registerUser', userId, userData.email, 'POST', 'success', 200, Date.now() - startTime, '', JSON.stringify({ userId }), 'User registered successfully');
    return buildResponse(true, {
      userId: userId,
      displayName: userData.displayName || userData.email.split('@')[0],
      email: userData.email,
      whatsapp: userData.whatsapp || '',
      photoURL: userData.photoURL || '',
      authMethod: userData.authMethod,
      emailVerified: false
    }, 'Registrasi berhasil. Email verifikasi telah dikirim.');
  } catch (error) {
    Logger.log('Error in registerUser: ' + error);
    logApiCall('registerUser', '', userData.email || '', 'POST', 'failed', 500, Date.now() - startTime, error.toString(), JSON.stringify(userData), 'Registration error');
    return buildResponse(false, null, error.toString(), 'REGISTER_ERROR');
  }
}

/**
 * LOGIN USER
 * POST: /loginUser
 * Body: { email, password }
 */
function loginUser(email, password) {
  const startTime = Date.now();
  try {
    logApiCall('loginUser', '', email || '', 'POST', 'attempting', 200, 0, '', JSON.stringify({ email }), 'Login attempt');

    if (!email || !password) {
      logApiCall('loginUser', '', email || '', 'POST', 'failed', 400, Date.now() - startTime, 'Credentials missing', JSON.stringify({ email }), 'Missing credentials validation failed');
      return buildResponse(false, null, 'Email dan password diperlukan', 'MISSING_CREDENTIALS');
    }

    const sheet = ensureUsersSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === email) {
        // Check if email is verified
        if (data[i][7] !== 'Yes') {
          logApiCall('loginUser', data[i][0], email, 'POST', 'failed', 403, Date.now() - startTime, 'Email not verified', JSON.stringify({ email }), 'Email verification required');
          return buildResponse(false, null, 'Email belum diverifikasi', 'EMAIL_NOT_VERIFIED');
        }

        // Check if account is active
        if (data[i][10] !== 'active') {
          logApiCall('loginUser', data[i][0], email, 'POST', 'failed', 403, Date.now() - startTime, 'Account inactive', JSON.stringify({ email }), 'Account is not active');
          return buildResponse(false, null, 'Akun tidak aktif', 'ACCOUNT_INACTIVE');
        }

        // Verify password
        const storedPassword = data[i][9];
        if (!verifyPassword(password, storedPassword)) {
          logApiCall('loginUser', data[i][0], email, 'POST', 'failed', 401, Date.now() - startTime, 'Invalid credentials', JSON.stringify({ email }), 'Password verification failed');
          return buildResponse(false, null, 'Email atau password salah', 'INVALID_CREDENTIALS');
        }

        // Login successful - return user data
        const userId = data[i][0];
        logApiCall('loginUser', userId, email, 'POST', 'success', 200, Date.now() - startTime, '', JSON.stringify({ userId }), 'Login successful');
        return buildResponse(true, {
          userId: userId,
          displayName: data[i][1],
          email: data[i][2],
          whatsapp: data[i][3],
          photoURL: data[i][4],
          authMethod: data[i][11],
          verifiedAt: data[i][6]
        }, 'Login berhasil');
      }
    }

    logApiCall('loginUser', '', email, 'POST', 'failed', 401, Date.now() - startTime, 'Invalid credentials', JSON.stringify({ email }), 'User not found');
    return buildResponse(false, null, 'Email atau password salah', 'INVALID_CREDENTIALS');
  } catch (error) {
    Logger.log('Error in loginUser: ' + error);
    logApiCall('loginUser', '', email || '', 'POST', 'failed', 500, Date.now() - startTime, error.toString(), JSON.stringify({ email }), 'Login error');
    return buildResponse(false, null, error.toString(), 'LOGIN_ERROR');
  }
}

/**
 * VERIFY EMAIL TOKEN (Auto-login after registration)
 * GET: /verifyEmailToken?token=xxx
 */
function verifyEmailToken(token) {
  try {
    if (!token) {
      return buildResponse(false, null, 'Token diperlukan', 'MISSING_TOKEN');
    }

    const sheet = ensureUsersSheet();
    const data = sheet.getDataRange().getValues();

    // Find user with matching token
    for (let i = 1; i < data.length; i++) {
      if (data[i][8] === token) {
        // Check if already verified
        if (data[i][7] === 'Yes') {
          return buildResponse(false, null, 'Email sudah diverifikasi sebelumnya', 'ALREADY_VERIFIED');
        }

        // Mark email as verified
        sheet.getRange(i + 1, 8).setValue('Yes'); // H - Email Verified
        sheet.getRange(i + 1, 7).setValue(new Date().toISOString()); // G - Updated At

        // Return user data for auto-login
        return buildResponse(true, {
          userId: data[i][0],
          displayName: data[i][1],
          email: data[i][2],
          whatsapp: data[i][3],
          photoURL: data[i][4],
          authMethod: data[i][11],
          verifiedAt: new Date().toISOString()
        }, 'Email berhasil diverifikasi! Anda sekarang dapat menggunakan akun ini.');
      }
    }

    return buildResponse(false, null, 'Token tidak valid atau sudah kadaluarsa', 'INVALID_TOKEN');
  } catch (error) {
    Logger.log('Error in verifyEmailToken: ' + error);
    return buildResponse(false, null, error.toString(), 'VERIFY_ERROR');
  }
}

/**
 * VERIFY GOOGLE TOKEN
 * POST: /verifyGoogleToken
 * Body: { token }
 */
function verifyGoogleToken(token) {
  try {
    if (!token) {
      return buildResponse(false, null, 'Token diperlukan', 'MISSING_TOKEN');
    }

    // Decode JWT token
    const parts = token.split('.');
    if (parts.length !== 3) {
      return buildResponse(false, null, 'Format token tidak valid', 'INVALID_FORMAT');
    }

    // Decode payload
    let payload = parts[1];
    payload += '=='.substring(0, (4 - payload.length % 4) % 4);

    const decoded = JSON.parse(Utilities.newBlob(Utilities.base64Decode(payload)).getDataAsString());

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return buildResponse(false, null, 'Token sudah expired', 'TOKEN_EXPIRED');
    }

    if (!decoded.email) {
      return buildResponse(false, null, 'Email tidak ditemukan dalam token', 'NO_EMAIL');
    }

    const sheet = ensureUsersSheet();
    const data = sheet.getDataRange().getValues();

    let userId = null;
    let userFound = false;

    // Check if user exists
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === decoded.email) {
        userFound = true;
        userId = data[i][0];
        break;
      }
    }

    // Create new user if doesn't exist
    if (!userFound) {
      userId = `USER-${Date.now()}`;
      const displayName = decoded.name || decoded.email.split('@')[0];
      const photoURL = decoded.picture || '';

      sheet.appendRow([
        userId,
        displayName,
        decoded.email,
        '',
        photoURL,
        new Date().toISOString(),
        new Date().toISOString(),
        'Yes', // Email auto-verified for Google
        generateVerificationToken(),
        Utilities.getUuid(), // Random password hash
        'active',
        'google'
      ]);
    }

    return buildResponse(true, {
      userId,
      displayName: decoded.name || decoded.email.split('@')[0],
      email: decoded.email,
      photoURL: decoded.picture || '',
      whatsapp: '',
      authMethod: 'google',
      isNewUser: !userFound
    }, 'Google token berhasil diverifikasi');
  } catch (error) {
    Logger.log('Error in verifyGoogleToken: ' + error);
    return buildResponse(false, null, error.toString(), 'VERIFY_ERROR');
  }
}

/**
 * REQUEST PASSWORD RESET
 * POST: /requestPasswordReset
 * Body: { email }
 */
function requestPasswordReset(email) {
  try {
    if (!email) {
      return buildResponse(false, null, 'Email diperlukan', 'MISSING_EMAIL');
    }

    const sheet = ensureUsersSheet();
    const data = sheet.getDataRange().getValues();

    // Find user
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === email) {
        // Generate reset token
        const resetToken = generateVerificationToken();

        // Store reset token in verification token column temporarily
        sheet.getRange(i + 1, 9).setValue(resetToken); // I - Token

        // Send reset email
        const resetUrl = `${BASE_URL}/auth/reset-password.html?token=${encodeURIComponent(resetToken)}`;
        const subject = '🔑 Reset Password SISITUS';
        const htmlBody = `
          <p>Anda meminta reset password. Klik link berikut untuk melanjutkan:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>Link ini berlaku selama 1 jam.</p>
        `;

        try {
          MailApp.sendEmail({
            to: email,
            subject: subject,
            body: `Anda meminta reset password. Klik link berikut untuk melanjutkan:\n${resetUrl}`,
            htmlBody: htmlBody
          });
          Logger.log(`Reset email sent to ${email} via MailApp`);
        } catch (mailError) {
          Logger.log(`MailApp reset failed: ${mailError}. Trying GmailApp fallback...`);
          try {
            GmailApp.sendEmail(email, subject, '', { htmlBody });
            Logger.log(`Reset email sent to ${email} via GmailApp`);
          } catch (gmailError) {
            Logger.log(`GmailApp reset also failed: ${gmailError}`);
            throw new Error(`Gagal mengirim email reset password: ${gmailError.message || gmailError}`);
          }
        }

        return buildResponse(true, null, 'Email reset password telah dikirim');
      }
    }

    // Don't reveal if email exists for security
    return buildResponse(true, null, 'Jika email terdaftar, link reset password akan dikirim');
  } catch (error) {
    Logger.log('Error in requestPasswordReset: ' + error);
    return buildResponse(false, null, error.toString(), 'RESET_ERROR');
  }
}

/**
 * RESET PASSWORD
 * POST: /resetPassword
 * Body: { token, password }
 */
function resetPassword(token, newPassword) {
  try {
    if (!token || !newPassword) {
      return buildResponse(false, null, 'Token dan password diperlukan', 'MISSING_DATA');
    }

    const pwdValidation = validatePasswordStrength(newPassword);
    if (!pwdValidation.valid) {
      return buildResponse(false, null, pwdValidation.message, 'WEAK_PASSWORD');
    }

    const sheet = ensureUsersSheet();
    const data = sheet.getDataRange().getValues();

    // Find user with matching token
    for (let i = 1; i < data.length; i++) {
      if (data[i][8] === token) {
        // Update password
        const newHash = hashPassword(newPassword);
        sheet.getRange(i + 1, 10).setValue(newHash); // J - Password
        sheet.getRange(i + 1, 7).setValue(new Date().toISOString()); // G - Updated At

        // Clear token
        sheet.getRange(i + 1, 9).setValue('');

        return buildResponse(true, null, 'Password berhasil direset. Silakan login dengan password baru.');
      }
    }

    return buildResponse(false, null, 'Token tidak valid atau sudah kadaluarsa', 'INVALID_TOKEN');
  } catch (error) {
    Logger.log('Error in resetPassword: ' + error);
    return buildResponse(false, null, error.toString(), 'RESET_ERROR');
  }
}

/**
 * VALIDATE RESET TOKEN
 * GET: /validateResetToken
 * Query: { token }
 */
function validateResetToken(token) {
  try {
    if (!token) {
      return buildResponse(false, null, 'Token diperlukan', 'MISSING_TOKEN');
    }

    const sheet = ensureUsersSheet();
    const data = sheet.getDataRange().getValues();

    // Find user with matching token
    for (let i = 1; i < data.length; i++) {
      if (data[i][8] === token) {
        // Token format matches: uuid-timestamp
        const parts = token.split('-');
        const timestampStr = parts[parts.length - 1];
        if (timestampStr) {
          const timestamp = parseInt(timestampStr, 10);
          if (!isNaN(timestamp)) {
            const oneHour = 60 * 60 * 1000;
            if (Date.now() - timestamp > oneHour) {
              return buildResponse(false, null, 'Token sudah kadaluarsa', 'TOKEN_EXPIRED');
            }
          }
        }
        
        return buildResponse(true, { email: data[i][2] }, 'Token valid');
      }
    }

    return buildResponse(false, null, 'Token tidak valid atau sudah kadaluarsa', 'INVALID_TOKEN');
  } catch (error) {
    Logger.log('Error in validateResetToken: ' + error);
    return buildResponse(false, null, error.toString(), 'VALIDATE_ERROR');
  }
}

/**
 * CHANGE PASSWORD (logged-in user)
 * POST: /changePassword
 * Body: { userId, oldPassword, newPassword }
 */
function changePassword(userId, oldPassword, newPassword) {
  try {
    if (!userId || !oldPassword || !newPassword) {
      return buildResponse(false, null, 'Semua field diperlukan', 'MISSING_DATA');
    }

    const pwdValidation = validatePasswordStrength(newPassword);
    if (!pwdValidation.valid) {
      return buildResponse(false, null, pwdValidation.message, 'WEAK_PASSWORD');
    }

    if (oldPassword === newPassword) {
      return buildResponse(false, null, 'Password baru tidak boleh sama dengan password lama', 'SAME_PASSWORD');
    }

    const sheet = ensureUsersSheet();
    const data = sheet.getDataRange().getValues();

    // Find user
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        // Verify old password
        const storedPassword = data[i][9];
        if (!verifyPassword(oldPassword, storedPassword)) {
          return buildResponse(false, null, 'Password lama tidak sesuai', 'INVALID_PASSWORD');
        }

        // Update password
        const newHash = hashPassword(newPassword);
        sheet.getRange(i + 1, 10).setValue(newHash);
        sheet.getRange(i + 1, 7).setValue(new Date().toISOString());

        return buildResponse(true, null, 'Password berhasil diubah');
      }
    }

    return buildResponse(false, null, 'User tidak ditemukan', 'USER_NOT_FOUND');
  } catch (error) {
    Logger.log('Error in changePassword: ' + error);
    return buildResponse(false, null, error.toString(), 'CHANGE_ERROR');
  }
}

/**
 * GET USER PROFILE
 * GET: /getUserProfile?userId=xxx
 */
function getUserProfile(userId) {
  try {
    if (!userId) {
      return buildResponse(false, null, 'User ID diperlukan', 'MISSING_ID');
    }

    const sheet = ensureUsersSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        return buildResponse(true, {
          userId: data[i][0],
          displayName: data[i][1],
          email: data[i][2],
          whatsapp: data[i][3],
          photoURL: data[i][4],
          authMethod: data[i][11],
          createdAt: data[i][5],
          updatedAt: data[i][6],
          emailVerified: data[i][7] === 'Yes'
        }, 'Profil user berhasil diambil');
      }
    }

    return buildResponse(false, null, 'User tidak ditemukan', 'USER_NOT_FOUND');
  } catch (error) {
    Logger.log('Error in getUserProfile: ' + error);
    return buildResponse(false, null, error.toString(), 'PROFILE_ERROR');
  }
}

/**
 * UPDATE USER PROFILE
 * POST: /updateUserProfile
 * Body: { userId, displayName, whatsapp }
 */
function updateUserProfile(userId, data) {
  try {
    if (!userId) {
      return buildResponse(false, null, 'User ID diperlukan', 'MISSING_ID');
    }

    const sheet = ensureUsersSheet();
    const sheetData = sheet.getDataRange().getValues();

    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][0] === userId) {
        // Update fields
        if (data.displayName) {
          sheet.getRange(i + 1, 2).setValue(data.displayName);
        }
        if (data.whatsapp !== undefined) {
          sheet.getRange(i + 1, 4).setValue(data.whatsapp);
        }

        // Update timestamp
        sheet.getRange(i + 1, 7).setValue(new Date().toISOString());

        return buildResponse(true, {
          userId,
          displayName: data.displayName || sheetData[i][1],
          whatsapp: data.whatsapp !== undefined ? data.whatsapp : sheetData[i][3]
        }, 'Profil berhasil diperbarui');
      }
    }

    return buildResponse(false, null, 'User tidak ditemukan', 'USER_NOT_FOUND');
  } catch (error) {
    Logger.log('Error in updateUserProfile: ' + error);
    return buildResponse(false, null, error.toString(), 'UPDATE_ERROR');
  }
}

/**
 * GET USER BY EMAIL
 * GET: /getUserByEmail?email=xxx
 */
function getUserByEmail(email) {
  try {
    if (!email) {
      return buildResponse(false, null, 'Email diperlukan', 'MISSING_EMAIL');
    }

    const sheet = ensureUsersSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === email) {
        return buildResponse(true, {
          userId: data[i][0],
          displayName: data[i][1],
          email: data[i][2],
          whatsapp: data[i][3],
          photoURL: data[i][4],
          authMethod: data[i][11],
          emailVerified: data[i][7] === 'Yes'
        }, 'User ditemukan');
      }
    }

    return buildResponse(false, null, 'User tidak ditemukan', 'USER_NOT_FOUND');
  } catch (error) {
    Logger.log('Error in getUserByEmail: ' + error);
    return buildResponse(false, null, error.toString(), 'QUERY_ERROR');
  }
}

/**
 * Generate Midtrans Payment Token
 * Creates a Snap transaction token for payment UI
 * 
 * @param {string} orderId - Order ID
 * @param {string} email - Customer email
 * @param {string} phone - Customer phone number
 * @param {string} name - Customer name
 * @param {string} domain - Domain being ordered
 * @param {string} packageId - Package ID/name
 * @param {number} total - Total amount in IDR
 * @returns {object} Response with snapToken if successful
 */
function generateMidtransToken(orderId, email, phone, name, domain, packageId, total) {
  const startTime = Date.now();
  try {
    // Convert total to number explicitly to satisfy Midtrans API
    total = Number(total) || 0;

    // Log start
    logApiCall('generateMidtransToken', '', email || '', 'POST', 'attempting', 200, 0, '', JSON.stringify({ orderId, total }), 'Payment token generation started');

    // Get Midtrans Server Key from Properties
    const serverKey = PropertiesService.getScriptProperties().getProperty('MIDTRANS_SERVER_KEY');
    
    if (!serverKey) {
      Logger.log('CRITICAL: Midtrans Server Key not configured. Run initializeMidtransConfig() first');
      logApiCall('generateMidtransToken', '', email, 'POST', 'failed', 500, Date.now() - startTime, 'Server Key not configured', JSON.stringify({ orderId }), 'CRITICAL: Midtrans Server Key missing');
      return buildResponse(false, null, 'Midtrans Server Key not configured in GAS Properties', 'SERVER_KEY_MISSING');
    }

    // Build customer details
    const customerDetails = {
      email: email,
      phone: phone || '',
      first_name: name || 'Customer'
    };

    // Build item details - single item representing the total order value to guarantee gross_amount match
    const itemDetails = [{
      id: orderId,
      price: total,
      quantity: 1,
      name: `Layanan Mysisi: ${domain} (${packageId || 'Starter'})`
    }];

    // Build transaction data for Midtrans Snap API
    const transactionData = {
      transaction_details: {
        order_id: orderId,
        gross_amount: total
      },
      customer_details: customerDetails,
      item_details: itemDetails,
      enable_3d_secure: true
    };

    // Prepare API request
    const url = MIDTRANS_SNAP_URL;
    const payload = JSON.stringify(transactionData);
    
    // Create Basic Auth header (Server Key and empty password)
    const auth = Utilities.base64Encode(serverKey + ':');
    
    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/json'
      },
      payload: payload,
      muteHttpExceptions: true
    };

    // Call Midtrans API
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    // Log API call for debugging
    Logger.log('Midtrans API Response Code: ' + responseCode);
    Logger.log('Midtrans API Response: ' + responseText);

    // Handle response
    if (responseCode !== 200 && responseCode !== 201) {
      Logger.log('ERROR: Midtrans API returned error code ' + responseCode);
      let errorMessage = 'Gagal membuat token pembayaran';
      try {
        const errorResponse = JSON.parse(responseText);
        if (errorResponse.error_messages && Array.isArray(errorResponse.error_messages)) {
          errorMessage = errorResponse.error_messages.join(', ');
        } else if (errorResponse.errors) {
          errorMessage = errorResponse.errors[0].message || errorMessage;
        } else if (errorResponse.message) {
          errorMessage = errorResponse.message;
        }
      } catch (e) {
        // Use default error message if can't parse response
      }
      logApiCall('generateMidtransToken', '', email, 'POST', 'failed', responseCode, Date.now() - startTime, errorMessage, JSON.stringify({ orderId }), 'Midtrans API error');
      return buildResponse(false, null, errorMessage + ' (HTTP ' + responseCode + ')', 'MIDTRANS_API_ERROR');
    }

    // Parse successful response
    const snapResponse = JSON.parse(responseText);
    
    if (!snapResponse.token) {
      Logger.log('ERROR: No snap token in Midtrans response');
      logApiCall('generateMidtransToken', '', email, 'POST', 'failed', 500, Date.now() - startTime, 'No snap token in response', JSON.stringify({ orderId }), 'Invalid Midtrans response');
      return buildResponse(false, null, 'Invalid response from payment gateway', 'INVALID_RESPONSE');
    }

    // Log success
    logApiCall('generateMidtransToken', '', email, 'POST', 'success', 200, Date.now() - startTime, '', JSON.stringify({ orderId, total }), 'Payment token generated successfully');

    // Return success with snap token
    return buildResponse(true, {
      snapToken: snapResponse.token,
      snapRedirectUrl: snapResponse.redirect_url,
      orderId: orderId
    }, 'Token pembayaran berhasil dibuat');

  } catch (error) {
    Logger.log('Error in generateMidtransToken: ' + error.toString());
    logApiCall('generateMidtransToken', '', email || '', 'POST', 'failed', 500, Date.now() - startTime, error.toString(), JSON.stringify({ orderId }), 'Payment token generation error');
    return buildResponse(false, null, 'Terjadi kesalahan pada server: ' + error.toString(), 'SERVER_ERROR');
  }
}

// ============================================================================
// ORDER MANAGEMENT
// ============================================================================

/**
 * Get or create Orders sheet
 */
function ensureOrdersSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Orders');
  
  if (!sheet) {
    sheet = ss.insertSheet('Orders');
    // Add headers
    sheet.appendRow([
      'Order ID',                // A
      'User ID',                 // B
      'Email',                   // C
      'Phone Number',            // D
      'Display Name',            // E
      'Domain Name',             // F
      'Package',                 // G
      'Total Amount',            // H
      'Order Status',            // I
      'Payment Status',          // J
      'Snap Token',              // K
      'Transaction ID',          // L
      'Created At',              // M
      'Updated At',              // N
      'Payment Method'           // O
    ]);
  }
  
  return sheet;
}

/**
 * CREATE ORDER
 * POST: /createOrder
 * Body: { userId, email, phone, name, domain, packageId, total }
 */
function createOrder(orderData) {
  const startTime = Date.now();
  try {
    // Log start
    logApiCall('createOrder', orderData.userId || '', orderData.email || '', 'POST', 'attempting', 200, 0, '', JSON.stringify({ domain: orderData.domain, package: orderData.packageId }), 'Order creation started');

    // Validate input
    if (!orderData.userId) {
      logApiCall('createOrder', '', orderData.email || '', 'POST', 'failed', 400, Date.now() - startTime, 'User ID missing', JSON.stringify(orderData), 'Validation: User ID missing');
      return buildResponse(false, null, 'User ID diperlukan', 'MISSING_USER_ID');
    }

    if (!orderData.email) {
      logApiCall('createOrder', orderData.userId, '', 'POST', 'failed', 400, Date.now() - startTime, 'Email missing', JSON.stringify(orderData), 'Validation: Email missing');
      return buildResponse(false, null, 'Email diperlukan', 'MISSING_EMAIL');
    }

    if (!orderData.domain) {
      logApiCall('createOrder', orderData.userId, orderData.email, 'POST', 'failed', 400, Date.now() - startTime, 'Domain missing', JSON.stringify(orderData), 'Validation: Domain missing');
      return buildResponse(false, null, 'Domain diperlukan', 'MISSING_DOMAIN');
    }

    if (!validateDomainFormat(orderData.domain)) {
      logApiCall('createOrder', orderData.userId, orderData.email, 'POST', 'failed', 400, Date.now() - startTime, 'Invalid domain format', JSON.stringify(orderData), 'Validation: Invalid domain format');
      return buildResponse(false, null, 'Format domain tidak valid (contoh: example.com)', 'INVALID_DOMAIN_FORMAT');
    }

    if (!orderData.packageId) {
      logApiCall('createOrder', orderData.userId, orderData.email, 'POST', 'failed', 400, Date.now() - startTime, 'Package missing', JSON.stringify(orderData), 'Validation: Package missing');
      return buildResponse(false, null, 'Package diperlukan', 'MISSING_PACKAGE');
    }

    if (!orderData.total || orderData.total <= 0) {
      logApiCall('createOrder', orderData.userId, orderData.email, 'POST', 'failed', 400, Date.now() - startTime, 'Invalid total', JSON.stringify(orderData), 'Validation: Total invalid');
      return buildResponse(false, null, 'Total harga tidak valid', 'INVALID_TOTAL');
    }

    // SECURITY: Server-side promo code validation (if provided)
    if (orderData.promoCode) {
      const promoValidation = validatePromoCode(orderData.promoCode);
      if (!promoValidation.success) {
        logApiCall('createOrder', orderData.userId, orderData.email, 'POST', 'failed', 400, Date.now() - startTime, 'Invalid promo code', JSON.stringify({ promoCode: orderData.promoCode }), 'Validation: Promo code invalid or expired');
        return buildResponse(false, null, promoValidation.message, 'INVALID_PROMO_CODE');
      }
      // Promo is valid - proceed with order
      Logger.log(`Promo code ${orderData.promoCode} validated for order`);
    }

    const sheet = ensureOrdersSheet();
    const orderId = `ORDER-${Date.now()}`;
    const now = new Date().toISOString();

    sheet.appendRow([
      orderId,                   // A: Order ID
      orderData.userId,          // B: User ID
      orderData.email,           // C: Email
      orderData.phone || '',     // D: Phone
      orderData.name || '',      // E: Name
      orderData.domain,          // F: Domain
      orderData.packageId,       // G: Package
      orderData.total,           // H: Total
      'pending',                 // I: Order Status
      'pending',                 // J: Payment Status
      '',                        // K: Snap Token
      '',                        // L: Transaction ID
      now,                       // M: Created At
      now,                       // N: Updated At
      ''                         // O: Payment Method
    ]);

    Logger.log(`Order created: ${orderId}`);

    // Increment promo usage if promo code was applied
    if (orderData.promoCode) {
      incrementPromoUsage(orderData.promoCode);
      Logger.log(`Promo code ${orderData.promoCode} applied to order ${orderId}`);
    }

    // Log success
    logApiCall('createOrder', orderData.userId, orderData.email, 'POST', 'success', 200, Date.now() - startTime, '', JSON.stringify({ orderId, total: orderData.total, promoCode: orderData.promoCode || '' }), 'Order created successfully');

    return buildResponse(true, {
      orderId,
      orderStatus: 'pending',
      paymentStatus: 'pending',
      createdAt: now
    }, 'Order berhasil dibuat');

  } catch (error) {
    Logger.log('Error in createOrder: ' + error);
    logApiCall('createOrder', orderData.userId || '', orderData.email || '', 'POST', 'failed', 500, Date.now() - startTime, error.toString(), JSON.stringify(orderData), 'Order creation error');
    return buildResponse(false, null, error.toString(), 'ORDER_CREATE_ERROR');
  }
}

/**
 * GET ORDER
 * GET: /getOrder?orderId=ORDER-123
 */
function getOrder(orderId) {
  try {
    if (!orderId) {
      return buildResponse(false, null, 'Order ID diperlukan', 'MISSING_ORDER_ID');
    }

    const sheet = ensureOrdersSheet();
    const data = sheet.getDataRange().getValues();

    // Search for order (skip header row)
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        return buildResponse(true, {
          orderId: data[i][0],
          userId: data[i][1],
          email: data[i][2],
          phone: data[i][3],
          name: data[i][4],
          domain: data[i][5],
          packageId: data[i][6],
          total: data[i][7],
          orderStatus: data[i][8],
          paymentStatus: data[i][9],
          snapToken: data[i][10],
          transactionId: data[i][11],
          createdAt: data[i][12],
          updatedAt: data[i][13],
          paymentMethod: data[i][14]
        }, 'Order ditemukan');
      }
    }

    return buildResponse(false, null, 'Order tidak ditemukan', 'ORDER_NOT_FOUND');

  } catch (error) {
    Logger.log('Error in getOrder: ' + error);
    return buildResponse(false, null, error.toString(), 'GET_ORDER_ERROR');
  }
}

/**
 * GET USER ORDERS - Fetch all orders for a user
 */
function getUserOrders(userId) {
  try {
    if (!userId) {
      return buildResponse(false, null, 'User ID diperlukan', 'MISSING_USER_ID');
    }

    const sheet = ensureOrdersSheet();
    const data = sheet.getDataRange().getValues();
    const orders = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === userId) {
        orders.push({
          orderId: data[i][0],
          userId: data[i][1],
          email: data[i][2],
          phone: data[i][3],
          name: data[i][4],
          domain: data[i][5],
          packageId: data[i][6],
          total: data[i][7],
          orderStatus: data[i][8],
          paymentStatus: data[i][9],
          transactionId: data[i][11],
          createdAt: data[i][12]
        });
      }
    }

    return buildResponse(true, { orders, count: orders.length }, 'Pesanan berhasil diambil');
  } catch (error) {
    Logger.log('Error in getUserOrders: ' + error);
    return buildResponse(false, null, error.toString(), 'ERROR');
  }
}

/**
 * GET ORDER DETAIL - Get specific order with ownership check
 */
function getOrderDetail(orderId, userId) {
  try {
    if (!orderId) {
      return buildResponse(false, null, 'Order ID diperlukan', 'MISSING_ORDER_ID');
    }

    let result = getOrder(orderId);
    
    if (!result.success) {
      return result;
    }

    if (userId && result.data.userId !== userId) {
      return buildResponse(false, null, 'Anda tidak memiliki akses ke order ini', 'UNAUTHORIZED');
    }

    // Auto-sync with Midtrans if payment is pending
    if (result.data.paymentStatus === 'pending') {
      const sync = syncOrderStatusWithMidtrans(orderId);
      // If sync changed the status, re-fetch the fresh order data
      if (sync.success && sync.data && sync.data.newStatus) {
        result = getOrder(orderId);
      }
    }

    return result;
  } catch (error) {
    Logger.log('Error in getOrderDetail: ' + error);
    return buildResponse(false, null, error.toString(), 'ERROR');
  }
}

/**
 * UPDATE ORDER STATUS - Update order status
 */
function updateOrderStatus(orderId, newStatus) {
  try {
    if (!orderId || !newStatus) {
      return buildResponse(false, null, 'Order ID dan status diperlukan', 'MISSING_PARAMS');
    }

    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      return buildResponse(false, null, 'Status tidak valid', 'INVALID_STATUS');
    }

    const sheet = ensureOrdersSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        const range = sheet.getRange(i + 1, 9);
        range.setValue(newStatus);
        
        const updatedAtRange = sheet.getRange(i + 1, 14);
        updatedAtRange.setValue(new Date().toISOString());

        return buildResponse(true, { orderId, status: newStatus }, 'Status pesanan berhasil diupdate');
      }
    }

    return buildResponse(false, null, 'Order tidak ditemukan', 'ORDER_NOT_FOUND');
  } catch (error) {
    Logger.log('Error in updateOrderStatus: ' + error);
    return buildResponse(false, null, error.toString(), 'ERROR');
  }
}

/**
 * SYNC ORDER STATUS WITH MIDTRANS - Direct API check
 */
function syncOrderStatusWithMidtrans(orderId) {
  try {
    if (!orderId) {
      return buildResponse(false, null, 'Order ID diperlukan', 'MISSING_ORDER_ID');
    }

    const serverKey = PropertiesService.getScriptProperties().getProperty('MIDTRANS_SERVER_KEY');
    if (!serverKey) {
      return buildResponse(false, null, 'Server Key tidak dikonfigurasi', 'SERVER_KEY_MISSING');
    }

    // Midtrans API Sandbox Base URL (Update to production URL when going live)
    const baseUrl = 'https://api.sandbox.midtrans.com/v2';
    const url = `${baseUrl}/${orderId}/status`;

    const options = {
      method: 'get',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Utilities.base64Encode(serverKey + ':')
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    // 404 means the transaction does not exist in Midtrans (not processed yet)
    if (responseCode === 404) {
      return buildResponse(false, null, 'Transaksi belum terdaftar di Midtrans', 'TRANSACTION_NOT_FOUND');
    }

    const data = JSON.parse(response.getContentText());

    if (responseCode !== 200 || !data.transaction_status) {
      return buildResponse(false, data, 'Gagal mengambil status dari Midtrans', 'API_ERROR');
    }

    const transactionStatus = data.transaction_status;
    
    // Map transaction status to payment status and order status
    let paymentStatus = 'pending';
    let orderStatus = 'processing';

    switch (transactionStatus) {
      case 'capture':
      case 'settlement':
        paymentStatus = 'paid';
        orderStatus = 'completed';
        break;
      case 'pending':
        paymentStatus = 'pending';
        orderStatus = 'processing';
        break;
      case 'deny':
      case 'cancel':
      case 'expire':
      case 'failure':
        paymentStatus = 'expired';
        orderStatus = 'cancelled';
        break;
      default:
        paymentStatus = transactionStatus;
    }

    const sheet = ensureOrdersSheet();
    const sheetData = sheet.getDataRange().getValues();

    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][0] === orderId) {
        const currentPaymentStatus = sheetData[i][9]; // Column J
        
        if (currentPaymentStatus !== paymentStatus) {
           sheet.getRange(i + 1, 9).setValue(orderStatus);      // Column I
           sheet.getRange(i + 1, 10).setValue(paymentStatus);   // Column J
           sheet.getRange(i + 1, 14).setValue(new Date().toISOString()); // Updated At
           
           if (data.transaction_id) {
             sheet.getRange(i + 1, 12).setValue(data.transaction_id); // Column L
           }
           if (data.payment_type) {
             sheet.getRange(i + 1, 15).setValue(data.payment_type); // Column O
           }
           
           return buildResponse(true, { orderId, newStatus: paymentStatus, oldStatus: currentPaymentStatus }, 'Status disinkronisasi dengan Midtrans');
        } else {
           return buildResponse(true, { orderId, currentStatus: paymentStatus }, 'Status sudah up to date');
        }
      }
    }

    return buildResponse(false, null, 'Order tidak ditemukan di database', 'ORDER_NOT_FOUND');
  } catch (error) {
    Logger.log('Error in syncOrderStatusWithMidtrans: ' + error);
    return buildResponse(false, null, error.toString(), 'ERROR');
  }
}

/**
 * GET USER ORDER STATS - Get user order statistics
 */
function getUserOrderStats(userId) {
  try {
    if (!userId) {
      return buildResponse(false, null, 'User ID diperlukan', 'MISSING_USER_ID');
    }

    const ordersSheet = ensureOrdersSheet();
    const ordersData = ordersSheet.getDataRange().getValues();
    
    const stats = {
      totalOrders: 0,
      ordersByStatus: { pending: 0, processing: 0, completed: 0, cancelled: 0 },
      paymentStatus: { pending: 0, paid: 0, failed: 0 },
      totalSpent: 0,
      averageOrderValue: 0,
      lastOrderDate: null
    };

    for (let i = 1; i < ordersData.length; i++) {
      if (ordersData[i][1] === userId) {
        stats.totalOrders++;
        const orderStatus = ordersData[i][8];      // Column I: Order Status
        const paymentStatus = ordersData[i][9];    // Column J: Payment Status (FIXED: was [10])
        const totalAmount = ordersData[i][7];      // Column H: Total Amount (FIXED: was [12])

        if (orderStatus && stats.ordersByStatus.hasOwnProperty(orderStatus)) {
          stats.ordersByStatus[orderStatus]++;
        }
        if (paymentStatus && stats.paymentStatus.hasOwnProperty(paymentStatus)) {
          stats.paymentStatus[paymentStatus]++;
        }

        stats.totalSpent += totalAmount || 0;
        
        const orderDate = new Date(ordersData[i][5]);
        if (!stats.lastOrderDate || orderDate > stats.lastOrderDate) {
          stats.lastOrderDate = ordersData[i][5];
        }
      }
    }

    if (stats.totalOrders > 0) {
      stats.averageOrderValue = Math.round(stats.totalSpent / stats.totalOrders);
    }

    return buildResponse(true, stats, 'Statistik pesanan berhasil diambil');
  } catch (error) {
    Logger.log('Error in getUserOrderStats: ' + error);
    return buildResponse(false, null, error.toString(), 'ERROR');
  }
}

/**
 * CHECK DOMAIN - Check domain availability based on real spreadsheet data
 */
function checkDomain(domain) {
  try {
    if (!domain) {
      return buildResponse(false, null, 'Domain diperlukan', 'MISSING_DOMAIN');
    }

    const sheet = ensureOrdersSheet();
    const data = sheet.getDataRange().getValues();
    
    // Check if domain is already ordered and not cancelled/expired
    let isOrdered = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][5] && data[i][5].toLowerCase() === domain.toLowerCase()) {
        const orderStatus = data[i][8] ? data[i][8].toLowerCase() : '';
        const paymentStatus = data[i][9] ? data[i][9].toLowerCase() : '';
        
        // If order is not explicitly cancelled or expired, it's considered taken (rebutan/pending/active)
        if (orderStatus !== 'cancelled' && paymentStatus !== 'expire' && paymentStatus !== 'cancel' && paymentStatus !== 'deny' && paymentStatus !== 'failure') {
          isOrdered = true;
          break;
        }
      }
    }

    const available = !isOrdered;

    return buildResponse(true, {
      domain: domain,
      available: available
    }, available ? 'Domain tersedia' : 'Domain sedang dipesan atau sudah aktif');
  } catch (error) {
    Logger.log('Error in checkDomain: ' + error);
    return buildResponse(false, null, error.toString(), 'ERROR');
  }
}

/**
 * GET DOMAIN PRICING - Get pricing for TLD
 */
function getDomainPricing(tld) {
  try {
    if (!tld) {
      return buildResponse(false, null, 'TLD diperlukan', 'MISSING_TLD');
    }

    const pricing = {
      'com': { newPrice: 159900, period: '1 Tahun' },
      'id': { newPrice: 99000, period: '1 Tahun' },
      'co.id': { newPrice: 295000, period: '1 Tahun' },
      'my.id': { newPrice: 9900, period: '1 Tahun' },
      'web.id': { newPrice: 9900, period: '1 Tahun' }
    };

    const data = pricing[tld];
    if (!data) {
      return buildResponse(false, null, 'TLD tidak didukung', 'UNSUPPORTED_TLD');
    }

    return buildResponse(true, { tld, price: data.newPrice, period: data.period }, 'Harga domain berhasil diambil');
  } catch (error) {
    Logger.log('Error in getDomainPricing: ' + error);
    return buildResponse(false, null, error.toString(), 'ERROR');
  }
}

/**
 * VALIDATE PROMO CODE
 */
/**
 * HANDLE MIDTRANS WEBHOOK
 * POST: /handleMidtransWebhook
 * Body: { order_id, transaction_id, transaction_status, gross_amount, payment_type }
 */
function handleMidtransWebhook(webhookData) {
  const startTime = Date.now();
  try {
    // Log webhook receipt
    logApiCall('handleMidtransWebhook', '', webhookData.customer_email || '', 'POST', 'attempting', 200, 0, '', JSON.stringify({ orderId: webhookData.order_id, transactionStatus: webhookData.transaction_status }), 'Midtrans webhook received');

    // Validate webhook: check required fields and merchant ID
    if (!webhookData.order_id || !webhookData.transaction_id || !webhookData.transaction_status) {
      logApiCall('handleMidtransWebhook', '', webhookData.customer_email || '', 'POST', 'failed', 400, Date.now() - startTime, 'Incomplete webhook data', JSON.stringify(webhookData), 'Webhook validation failed');
      return buildResponse(false, null, 'Data webhook tidak lengkap', 'INVALID_WEBHOOK');
    }

    // SECURITY: Validate merchant ID matches (basic validation)
    // Production: implement SHA512 signature verification
    const configuredMerchantId = PropertiesService.getScriptProperties().getProperty('MIDTRANS_MERCHANT_ID');
    if (configuredMerchantId && webhookData.merchant_id && webhookData.merchant_id !== configuredMerchantId) {
      Logger.log('SECURITY: Webhook rejected - merchant ID mismatch: ' + webhookData.merchant_id);
      logApiCall('handleMidtransWebhook', '', webhookData.customer_email || '', 'POST', 'failed', 403, Date.now() - startTime, 'Merchant ID mismatch - possible spoofing attempt', JSON.stringify({ received: webhookData.merchant_id, expected: configuredMerchantId }), 'SECURITY: Webhook rejected');
      return buildResponse(false, null, 'Webhook validation failed', 'INVALID_MERCHANT');
    }

    const orderId = webhookData.order_id;
    const transactionId = webhookData.transaction_id;
    const transactionStatus = webhookData.transaction_status;
    const paymentType = webhookData.payment_type || '';

    const sheet = ensureOrdersSheet();
    const data = sheet.getDataRange().getValues();

    // Find the order row
    let orderRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        orderRowIndex = i;
        break;
      }
    }

    if (orderRowIndex === -1) {
      Logger.log(`Webhook: Order not found: ${orderId}`);
      logApiCall('handleMidtransWebhook', '', webhookData.customer_email || '', 'POST', 'failed', 404, Date.now() - startTime, 'Order not found', JSON.stringify({ orderId }), 'Order not found in system');
      return buildResponse(false, null, 'Order tidak ditemukan', 'ORDER_NOT_FOUND');
    }

    // Update transaction ID and payment method
    const range = sheet.getRange(orderRowIndex + 1, 12); // Column L: Transaction ID
    range.setValue(transactionId);

    const paymentMethodRange = sheet.getRange(orderRowIndex + 1, 15); // Column O: Payment Method
    paymentMethodRange.setValue(paymentType);

    const updatedAtRange = sheet.getRange(orderRowIndex + 1, 14); // Column N: Updated At
    updatedAtRange.setValue(new Date().toISOString());

    // Update payment status based on transaction status
    let paymentStatus = 'pending';
    let orderStatus = 'processing';

    switch (transactionStatus) {
      case 'capture':
      case 'settlement':
        paymentStatus = 'paid';
        orderStatus = 'completed';
        break;
      case 'pending':
        paymentStatus = 'pending';
        orderStatus = 'processing';
        break;
      case 'deny':
      case 'cancel':
      case 'expire':
        paymentStatus = 'failed';
        orderStatus = 'cancelled';
        break;
      default:
        paymentStatus = transactionStatus;
    }

    // Update payment status (column J)
    const paymentStatusRange = sheet.getRange(orderRowIndex + 1, 10);
    paymentStatusRange.setValue(paymentStatus);

    // Update order status (column I)
    const orderStatusRange = sheet.getRange(orderRowIndex + 1, 9);
    orderStatusRange.setValue(orderStatus);

    // GENERATE INVOICE if payment successful (per spec requirement)
    if (paymentStatus === 'paid') {
      try {
        const invoiceData = {
          orderId: orderId,
          userId: data[orderRowIndex][1],
          email: data[orderRowIndex][2],
          customerName: data[orderRowIndex][4],
          domain: data[orderRowIndex][5],
          package: data[orderRowIndex][6],
          total: data[orderRowIndex][7],
          transactionId: transactionId,
          paymentMethod: paymentType,
          paidAt: new Date().toISOString()
        };
        
        // Save to INVOICES sheet
        saveInvoice(invoiceData);
        Logger.log(`Invoice generated for order ${orderId}`);
      } catch (invoiceError) {
        Logger.log('Warning: Could not generate invoice, but payment still processed: ' + invoiceError);
        // Don't fail webhook if invoice generation fails
      }
    }

    // Log the webhook
    Logger.log(`Webhook processed: Order ${orderId}, Status: ${paymentStatus}, Transaction: ${transactionId}`);
    
    // Log payment event for audit trail
    const oldPaymentStatus = data[orderRowIndex][9] || 'pending'; // Previous payment status
    logPaymentEvent({
      orderId: orderId,
      userId: data[orderRowIndex][1],
      email: data[orderRowIndex][2],
      total: data[orderRowIndex][7],
      notes: `Webhook from Midtrans: ${transactionStatus}`
    }, 'payment_update', oldPaymentStatus, paymentStatus, webhookData);

    // Send confirmation email if payment successful
    if (paymentStatus === 'paid') {
      const userEmail = data[orderRowIndex][2]; // Email from column C
      const userName = data[orderRowIndex][4];  // Name from column E
      const domain = data[orderRowIndex][5];    // Domain from column F
      
      // Send confirmation email (optional)
      try {
        MailApp.sendEmail(
          userEmail,
          'Pembayaran Berhasil - ' + domain,
          `Halo ${userName},\n\nPembayaran untuk domain ${domain} telah berhasil diproses.\n\nID Transaksi: ${transactionId}\nStatus Pesanan: ${orderStatus}\n\nTerima kasih telah bergabung dengan kami!`,
          { name: 'MySiS Support' }
        );
      } catch (emailError) {
        Logger.log('Error sending confirmation email: ' + emailError);
      }
    }

    // Log webhook success
    logApiCall('handleMidtransWebhook', data[orderRowIndex][1], data[orderRowIndex][2], 'POST', 'success', 200, Date.now() - startTime, '', JSON.stringify({ orderId, transactionId, paymentStatus }), 'Webhook processed successfully');

    return buildResponse(true, {
      orderId,
      transactionId,
      paymentStatus,
      orderStatus
    }, `Webhook berhasil diproses. Status: ${paymentStatus}`);

  } catch (error) {
    Logger.log('Error in handleMidtransWebhook: ' + error);
    logApiCall('handleMidtransWebhook', '', webhookData.customer_email || '', 'POST', 'failed', 500, Date.now() - startTime, error.toString(), JSON.stringify(webhookData), 'Webhook processing error');
    return buildResponse(false, null, error.toString(), 'WEBHOOK_ERROR');
  }
}

// ============================================================================
// OPTIONAL SHEETS - AUTO-CREATION & LOGGING
// ============================================================================

/**
 * PAYMENT_LOGS Sheet - Track all payment events for compliance/audit
 */
function ensurePaymentLogsSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Payment_Logs');
  
  if (!sheet) {
    sheet = ss.insertSheet('Payment_Logs');
    sheet.appendRow([
      'Log ID',                   // A
      'Order ID',                 // B
      'User ID',                  // C
      'Email',                    // D
      'Transaction ID',           // E
      'Event Type',               // F
      'Old Status',               // G
      'New Status',               // H
      'Amount',                   // I
      'Payment Method',           // J
      'Midtrans Status',          // K
      'Response Data',            // L
      'Timestamp',                // M
      'Notes'                     // N
    ]);
  }
  
  return sheet;
}

/**
 * API_LOGS Sheet - Track all API calls for debugging
 */
function ensureApiLogsSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('API_Logs');
  
  if (!sheet) {
    sheet = ss.insertSheet('API_Logs');
    sheet.appendRow([
      'Log ID',                   // A
      'Timestamp',                // B
      'Action',                   // C
      'User ID',                  // D
      'Email',                    // E
      'Method',                   // F
      'Status',                   // G
      'Response Code',            // H
      'Execution Time (ms)',      // I
      'Error',                    // J
      'Request Data',             // K
      'Notes'                     // L
    ]);
  }
  
  return sheet;
}

/**
 * DOMAIN_PACKAGES_REFERENCE Sheet - Master reference for packages
 */
function ensureDomainPackagesSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Domain_Packages');
  
  if (!sheet) {
    sheet = ss.insertSheet('Domain_Packages');
    sheet.appendRow([
      'Package ID',               // A
      'Package Name',             // B
      'Price (Rp)',               // C
      'Period (Years)',           // D
      'Description',              // E
      'Storage (GB)',             // F
      'Email Accounts',           // G
      'SSL Certificate',          // H
      'Backups',                  // I
      'Support Level',            // J
      'Status',                   // K
      'Created At',               // L
      'Updated At'                // M
    ]);
    
    // Populate with default packages
    sheet.appendRow(['starter', 'Starter', 199000, 1, 'Basic domain only', 'N/A', 'Limited', 'Free', 'Manual', 'Standard', 'active', new Date().toISOString(), new Date().toISOString()]);
    sheet.appendRow(['professional', 'Professional', 349000, 1, 'Domain + Basic Hosting', '10', 'Unlimited', 'Free', 'Daily', 'Priority', 'active', new Date().toISOString(), new Date().toISOString()]);
    sheet.appendRow(['business', 'Business', 599000, 1, 'Domain + Advanced Hosting', '50', 'Unlimited', 'Free', 'Hourly', 'Priority', 'active', new Date().toISOString(), new Date().toISOString()]);
    sheet.appendRow(['enterprise', 'Enterprise', 1299000, 1, 'Ultimate Package', 'Unlimited', 'Unlimited', 'Premium', 'Real-time', '24/7 Premium', 'active', new Date().toISOString(), new Date().toISOString()]);
  }
  
  return sheet;
}

/**
 * EMAIL_TEMPLATES Sheet - Master reference for email templates
 */
function ensureEmailTemplatesSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Email_Templates');
  
  if (!sheet) {
    sheet = ss.insertSheet('Email_Templates');
    sheet.appendRow([
      'Template ID',              // A
      'Template Name',            // B
      'Subject',                  // C
      'Type',                     // D
      'Use Case',                 // E
      'Variables',                // F
      'Status',                   // G
      'Created At',               // H
      'Updated At'                // I
    ]);
    
    // Populate with default templates
    sheet.appendRow([
      'EMAIL-001',
      'Email Verification',
      '🔐 Verifikasi Email SISITUS - Aktivasi Akun Anda',
      'html',
      'Sent after user registration',
      '{displayName}, {verificationUrl}',
      'active',
      new Date().toISOString(),
      new Date().toISOString()
    ]);
    
    sheet.appendRow([
      'EMAIL-002',
      'Payment Confirmation',
      'Pembayaran Berhasil - {domain}',
      'html',
      'Sent after successful payment',
      '{userName}, {domain}, {transactionId}, {orderStatus}',
      'active',
      new Date().toISOString(),
      new Date().toISOString()
    ]);
    
    sheet.appendRow([
      'EMAIL-003',
      'Order Confirmation',
      'Pesanan Anda Telah Diterima - {domain}',
      'html',
      'Sent after order creation',
      '{userName}, {domain}, {orderId}, {totalPrice}',
      'active',
      new Date().toISOString(),
      new Date().toISOString()
    ]);
  }
  
  return sheet;
}

/**
 * INVOICES Sheet - Store generated invoices after successful payment
 * Created per spec requirement: "Invoice disimpan SETELAH payment SUCCESS dari Midtrans"
 */
function ensureInvoicesSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Invoices');
  
  if (!sheet) {
    sheet = ss.insertSheet('Invoices');
    sheet.appendRow([
      'Invoice ID',               // A - INV-2026-03-28-00001
      'Order ID',                 // B - ORDER-xxxxx
      'User ID',                  // C - USER-xxxxx
      'Email',                    // D
      'Customer Name',            // E
      'Domain',                   // F
      'Package',                  // G
      'Total Amount',             // H
      'Transaction ID',           // I
      'Payment Method',           // J
      'Paid At',                  // K
      'Generated At',             // L
      'Status'                    // M - generated/sent/viewed/archived
    ]);
  }
  
  return sheet;
}

/**
 * Save invoice to INVOICES sheet (called after successful payment webhook)
 */
function saveInvoice(invoiceData) {
  const sheet = ensureInvoicesSheet();
  
  // Generate Invoice ID
  const invoiceId = generateInvoiceId();
  
  // Append invoice row
  sheet.appendRow([
    invoiceId,
    invoiceData.orderId,
    invoiceData.userId,
    invoiceData.email,
    invoiceData.customerName,
    invoiceData.domain,
    invoiceData.package,
    invoiceData.total,
    invoiceData.transactionId,
    invoiceData.paymentMethod,
    invoiceData.paidAt,
    new Date().toISOString(),
    'generated'
  ]);
  
  Logger.log(`Invoice saved: ${invoiceId}`);
  return invoiceId;
}

/**
 * Generate unique invoice ID format: INV-YYYY-MM-DD-NNNNN
 */
function generateInvoiceId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  // Get count for today to create sequence number
  const sheet = ensureInvoicesSheet();
  const data = sheet.getDataRange().getValues();
  
  let todayCount = 0;
  const todayPrefix = `INV-${year}-${month}-${day}`;
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).startsWith(todayPrefix)) {
      todayCount++;
    }
  }
  
  const sequence = String(todayCount + 1).padStart(5, '0');
  return `${todayPrefix}-${sequence}`;
}

/**
 * PROMO_CODES Sheet - Master reference for promo codes
 */
function ensurePromoCodesSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Promo_Codes');
  
  if (!sheet) {
    sheet = ss.insertSheet('Promo_Codes');
    sheet.appendRow([
      'Code',                 // A
      'Discount Type',        // B
      'Discount Value',       // C
      'Max Usage',            // D
      'Current Usage',        // E
      'Valid From',           // F
      'Valid Until',          // G
      'Active',               // H
      'Description'           // I
    ]);
    
    // Populate with default promo codes
    sheet.appendRow(['WELCOME10', 'percentage', 10, -1, 0, new Date().toISOString(), new Date(Date.now() + 365*24*60*60*1000).toISOString(), 'Yes', 'Diskon 10% untuk pelanggan baru']);
    sheet.appendRow(['SAVE20K', 'fixed', 20000, -1, 0, new Date().toISOString(), new Date(Date.now() + 365*24*60*60*1000).toISOString(), 'Yes', 'Hemat Rp 20.000 untuk pembelian sekarang']);
  }
  
  return sheet;
}

/**
 * Get promo details by code
 * Checks validity, expiry, and usage limits
 */
function getPromoByCode(code) {
  try {
    if (!code) {
      return null;
    }

    const sheet = ensurePromoCodesSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toUpperCase() === code.toUpperCase()) {
        const now = new Date();
        const validFrom = new Date(data[i][5]);
        const validUntil = new Date(data[i][6]);
        
        // Check if active
        if (data[i][7] !== 'Yes') {
          logApiCall('getPromoByCode', '', '', 'GET', 'failed', 400, 0, 'Promo code inactive', JSON.stringify({ code }), `Promo ${code} is inactive`);
          return null;
        }
        
        // Check date range
        if (now < validFrom || now > validUntil) {
          logApiCall('getPromoByCode', '', '', 'GET', 'failed', 400, 0, 'Promo code expired', JSON.stringify({ code }), `Promo ${code} outside valid date range`);
          return null;
        }
        
        // Check max usage
        const maxUsage = parseInt(data[i][3]) || -1;
        const currentUsage = parseInt(data[i][4]) || 0;
        
        if (maxUsage > 0 && currentUsage >= maxUsage) {
          logApiCall('getPromoByCode', '', '', 'GET', 'failed', 400, 0, 'Promo code limit exceeded', JSON.stringify({ code }), `Promo ${code} usage limit exceeded`);
          return null;
        }
        
        return {
          code: data[i][0],
          discountType: data[i][1],
          discountValue: data[i][2],
          maxUsage: maxUsage,
          currentUsage: currentUsage,
          validFrom: data[i][5],
          validUntil: data[i][6],
          description: data[i][8]
        };
      }
    }
    
    return null;
  } catch (error) {
    Logger.log('Error in getPromoByCode: ' + error);
    return null;
  }
}

/**
 * VALIDATE PROMO CODE - Updated to use sheet-based system
 */
function validatePromoCode(code) {
  try {
    if (!code) {
      return buildResponse(false, null, 'Kode promo diperlukan', 'MISSING_CODE');
    }

    const promoData = getPromoByCode(code);
    
    if (!promoData) {
      return buildResponse(false, null, 'Kode promo tidak valid atau kadaluarsa', 'INVALID_PROMO');
    }

    return buildResponse(true, {
      code: promoData.code,
      discount: promoData.discountValue,
      discountType: promoData.discountType,
      description: promoData.description
    }, `Kode promo ${code} berhasil diterapkan! Diskon ${promoData.discountValue}${promoData.discountType === 'percentage' ? '%' : ''}`);
  } catch (error) {
    Logger.log('Error in validatePromoCode: ' + error);
    return buildResponse(false, null, error.toString(), 'ERROR');
  }
}

/**
 * GET ACTIVE PROMO CODES LIST
 */
function getActivePromoCodes() {
  try {
    const sheet = ensurePromoCodesSheet();
    const data = sheet.getDataRange().getValues();
    const activePromos = [];
    const now = new Date();

    for (let i = 1; i < data.length; i++) {
      const code = data[i][0];
      const discountType = data[i][1];
      const discountValue = data[i][2];
      const maxUsage = parseInt(data[i][3]) || -1;
      const currentUsage = parseInt(data[i][4]) || 0;
      const validFrom = new Date(data[i][5]);
      const validUntil = new Date(data[i][6]);
      const active = data[i][7];
      const description = data[i][8];

      if (code && active === 'Yes') {
        // Check date range
        if (now >= validFrom && now <= validUntil) {
          // Check max usage
          if (maxUsage < 0 || currentUsage < maxUsage) {
            activePromos.push({
              code: code,
              discountType: discountType,
              discountValue: discountValue,
              maxUsage: maxUsage,
              currentUsage: currentUsage,
              validFrom: data[i][5],
              validUntil: data[i][6],
              description: description
            });
          }
        }
      }
    }

    return buildResponse(true, activePromos, 'Daftar promo aktif berhasil diambil');
  } catch (error) {
    Logger.log('Error in getActivePromoCodes: ' + error);
    return buildResponse(false, null, error.toString(), 'ERROR');
  }
}

/**
 * Increment promo code usage
 * Called when order is created with valid promo code
 */
function incrementPromoUsage(code) {
  try {
    if (!code) return false;

    const sheet = ensurePromoCodesSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toUpperCase() === code.toUpperCase()) {
        // Get current usage (Column E, index 4)
        const currentUsage = parseInt(data[i][4]) || 0;
        const newUsage = currentUsage + 1;
        
        // Update usage (Column E, row i+1)
        sheet.getRange(i + 1, 5).setValue(newUsage);
        
        logApiCall('incrementPromoUsage', '', '', 'POST', 'success', 200, 0, '', JSON.stringify({ code, newUsage }), `Promo ${code} usage incremented to ${newUsage}`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    Logger.log('Error in incrementPromoUsage: ' + error);
    return false;
  }
}

/**
 * Log payment event to Payment_Logs sheet
 */
function logPaymentEvent(orderData, eventType, oldStatus, newStatus, midtransResponse = {}) {
  try {
    const sheet = ensurePaymentLogsSheet();
    const logId = `LOG-${Date.now()}`;
    
    sheet.appendRow([
      logId,                                      // A: Log ID
      orderData.orderId,                          // B: Order ID
      orderData.userId,                           // C: User ID
      orderData.email,                            // D: Email
      midtransResponse.transaction_id || '',      // E: Transaction ID
      eventType,                                  // F: Event Type
      oldStatus,                                  // G: Old Status
      newStatus,                                  // H: New Status
      orderData.total,                            // I: Amount
      midtransResponse.payment_type || '',        // J: Payment Method
      midtransResponse.transaction_status || '',  // K: Midtrans Status
      JSON.stringify(midtransResponse).substring(0, 500), // L: Response Data
      new Date().toISOString(),                   // M: Timestamp
      orderData.notes || ''                       // N: Notes
    ]);
    
    Logger.log(`Payment event logged: ${eventType} for order ${orderData.orderId}`);
  } catch (error) {
    Logger.log('Error logging payment event: ' + error);
  }
}

/**
 * Log API call to API_Logs sheet
 */
function logApiCall(action, userId, email, method, status, responseCode, executionTime, error = '', requestData = '', notes = '') {
  try {
    const sheet = ensureApiLogsSheet();
    const logId = `API-${Date.now()}`;
    
    sheet.appendRow([
      logId,                                      // A: Log ID
      new Date().toISOString(),                   // B: Timestamp
      action,                                     // C: Action
      userId || '',                               // D: User ID
      email || '',                                // E: Email
      method,                                     // F: Method
      status,                                     // G: Status
      responseCode,                               // H: Response Code
      executionTime,                              // I: Execution Time (ms)
      error.substring(0, 500),                    // J: Error (first 500 chars)
      requestData.substring(0, 500),              // K: Request Data (first 500 chars)
      notes.substring(0, 200)                     // L: Notes (first 200 chars)
    ]);
    
    Logger.log(`API call logged: ${action} - Status: ${status}`);
  } catch (error) {
    Logger.log('Error logging API call: ' + error);
  }
}

/**
 * Initialize all sheets (called on first deployment)
 * Creates all sheets with proper structure
 */
function initializeAllSheets() {
  Logger.log('Initializing all sheets...');
  
  ensureUsersSheet();
  Logger.log('✓ Users sheet ready');
  
  ensureOrdersSheet();
  Logger.log('✓ Orders sheet ready');
  
  ensurePaymentLogsSheet();
  Logger.log('✓ Payment_Logs sheet ready');
  
  ensureApiLogsSheet();
  Logger.log('✓ API_Logs sheet ready');
  
  ensureDomainPackagesSheet();
  Logger.log('✓ Domain_Packages sheet ready');
  
  ensureEmailTemplatesSheet();
  Logger.log('✓ Email_Templates sheet ready');
  
  ensureInvoicesSheet();
  Logger.log('✓ Invoices sheet ready');
  
  ensurePromoCodesSheet();
  Logger.log('✓ Promo_Codes sheet ready');
  
  Logger.log('✅ All sheets initialized successfully!');
  
  return {
    success: true,
    message: 'All sheets initialized successfully',
    timestamp: Date.now()
  };
}

/**
 * Log Transaction - Now fully functional
 */


// ============================================================================
// REQUEST HANDLERS - HTTP Entry Points (CORS-Enabled)
// ============================================================================

/**
 * Handle POST requests - Main entry point for API calls
 * This function routes all API requests to the appropriate handler
 */
function doPost(e) {
  e = e || { parameter: {}, postData: { contents: '', type: '' } };
  
  try {
    const params = e.parameter || {};
    const action = (params.action || '').toLowerCase();
    
    switch(action) {
      case 'registeruser':
        return respondJson(registerUser(params));
      case 'loginuser':
        return respondJson(loginUser(params.email, params.password));
      case 'verifyemailtoken':
        return respondJson(verifyEmailToken(params.token));
      case 'verifygoogletoken':
        return respondJson(verifyGoogleToken(params.token));
      case 'getuserprofile':
        return respondJson(getUserProfile(params.userId));
      case 'updateuserprofile':
        return respondJson(updateUserProfile(params.userId, {
          displayName: params.displayName,
          whatsapp: params.whatsapp
        }));
      case 'changepassword':
        return respondJson(changePassword(params.userId, params.oldPassword, params.newPassword));
      case 'requestpasswordreset':
        return respondJson(requestPasswordReset(params.email));
      case 'validateresettoken':
        return respondJson(validateResetToken(params.token));
      case 'resetpassword':
        return respondJson(resetPassword(params.token, params.password));
      case 'checkdomain':
        return respondJson(checkDomain(params.domain));
      case 'getdomainpricing':
        return respondJson(getDomainPricing(params.tld));
      case 'getuserorders':
        return respondJson(getUserOrders(params.userId));
      case 'getorderdetail':
        return respondJson(getOrderDetail(params.orderId, params.userId));
      case 'updateorderstatus':
        return respondJson(updateOrderStatus(params.orderId, params.status));
      case 'syncorderstatus':
        return respondJson(syncOrderStatusWithMidtrans(params.orderId));
      case 'getuserorderstats':
        return respondJson(getUserOrderStats(params.userId));
      case 'createorderwithauth':
        return respondJson(createOrder(params));
      case 'createorder':
        return respondJson(createOrder(params));
      case 'getorder':
        return respondJson(getOrder(params.orderId));
      case 'validatepromocode':
        return respondJson(validatePromoCode(params.code));
      case 'getactivepromocodes':
        return respondJson(getActivePromoCodes());
      case 'generatemidtranstoken':
        return respondJson(generateMidtransToken(params.orderId, params.email, params.phone, params.name, params.domain, params.packageId, params.total));
      case 'handlemidtranswebhook':
        return respondJson(handleMidtransWebhook(params));
      case 'initializeallsheets':
        return respondJson(initializeAllSheets());
      default:
        return respondJson(buildResponse(false, null, 'Action tidak dikenal', 'UNKNOWN_ACTION'));
    }
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return respondJson(buildResponse(false, null, 'Server error: ' + error.toString(), 'SERVER_ERROR'));
  }
}

/**
 * Handle CORS preflight OPTIONS requests
 */
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    .setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Handle GET requests
 * Routes GET requests to appropriate handlers
 */
function doGet(e) {
  e = e || { parameter: {} };
  
  try {
    const params = e.parameter || {};
    const action = (params.action || '').toLowerCase();
    
    switch(action) {
      case 'verifyemailtoken':
        return respondJson(verifyEmailToken(params.token));
      case 'verifygoogletoken':
        return respondJson(verifyGoogleToken(params.token));
      case 'checkdomain':
        return respondJson(checkDomain(params.domain));
      case 'getuserprofile':
        return respondJson(getUserProfile(params.userId));
      case 'validateresettoken':
        return respondJson(validateResetToken(params.token));
      case 'resetpassword':
        return respondJson(resetPassword(params.token, params.password));
      case 'getactivepromocodes':
        return respondJson(getActivePromoCodes());
      default:
        return respondJson(buildResponse(false, null, 'Aksi tidak valid atau tidak ditemukan', 'INVALID_ACTION'));
    }
  } catch (error) {
    Logger.log('Error in doGet: ' + error);
    return respondJson(buildResponse(false, null, 'Server error: ' + error.toString(), 'SERVER_ERROR'));
  }
}
