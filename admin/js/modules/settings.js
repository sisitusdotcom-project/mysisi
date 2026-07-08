import { APIClient } from '/assets/js/modules/unified-api.js';
import { AuthManager } from '/assets/js/modules/unified-auth.js';
import { GAS_CONFIG } from '/assets/js/config/api.config.js';

let currentSettings = {};
let currentTemplates = [];
let selectedTemplateId = null;

export async function render() {
  console.log('Admin Settings Module Loaded');

  // 1. Setup Tab Switching
  setupTabs();

  // 2. Fetch Data
  await fetchSettings();
  await fetchTemplates();

  // 3. Setup Event Listeners
  setupEventListeners();
}

function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabs = document.querySelectorAll('.settings-tab');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Deactivate all
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--admin-text-muted)';
      });
      tabs.forEach(t => t.style.display = 'none');

      // Activate clicked
      btn.classList.add('active');
      btn.style.background = 'var(--admin-primary)';
      btn.style.color = 'var(--admin-text-main)';

      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).style.display = 'block';
    });
  });
}

async function fetchSettings() {
  try {
    const response = await APIClient.call(GAS_CONFIG.ACTIONS.GET_SETTINGS);
    if (response.success && response.data) {
      currentSettings = response.data;
      populateSettingsForm();
    } else {
      console.error('API failed to get settings:', response);
      await loadLocalTsvSettings();
    }
  } catch (error) {
    console.warn('API /getsettings gagal (belum deploy). Mencoba memuat dari file spreadsheet.tsv lokal...', error);
    await loadLocalTsvSettings();
  }
}

async function loadLocalTsvSettings() {
  try {
    const res = await fetch('/spreadsheet.tsv?t=' + Date.now());
    const text = await res.text();

    // Parse CONFIG section
    const configSection = text.split('SHEET: CONFIG')[1]?.split('SHEET:')[0] || '';
    const lines = configSection.split('\n');

    let isData = false;
    lines.forEach(line => {
      const cols = line.split('\t');
      if (cols.length >= 2) {
        if (cols[0] === 'Config Key') {
          isData = true;
          return;
        }
        if (isData && cols[0].trim()) {
          currentSettings[cols[0].trim()] = cols[1].trim();
        }
      }
    });

    populateSettingsForm();
  } catch (e) {
    console.error('Gagal memuat local TSV:', e);
  }
}

function populateSettingsForm() {
  Object.keys(currentSettings).forEach(key => {
    const input = document.getElementById(`config-${key}`);
    if (input) {
      if (input.type === 'checkbox') {
        const val = currentSettings[key].toString().toLowerCase();
        input.checked = val === 'true' || val === '1';
      } else {
        input.value = currentSettings[key];
      }
    }
  });
}

async function fetchTemplates() {
  try {
    const response = await APIClient.call(GAS_CONFIG.ACTIONS.GET_EMAIL_TEMPLATES);
    if (response.success && response.data) {
      currentTemplates = response.data;
      populateTemplateSelect();
    } else {
      console.error('API failed to get email templates:', response);
      await loadLocalTsvTemplates();
    }
  } catch (error) {
    console.warn('API /getemailtemplates gagal (belum deploy). Mencoba memuat dari file spreadsheet.tsv lokal...', error);
    await loadLocalTsvTemplates();
  }
}

async function loadLocalTsvTemplates() {
  try {
    const res = await fetch('/spreadsheet.tsv?t=' + Date.now());
    const text = await res.text();

    // Parse EMAIL_TEMPLATES section
    const templateSection = text.split('SHEET: EMAIL_TEMPLATES')[1]?.split('SHEET:')[0] || '';
    const lines = templateSection.split('\n');

    let isData = false;
    currentTemplates = [];

    lines.forEach(line => {
      const cols = line.split('\t');
      if (cols.length >= 2) {
        if (cols[0] === 'Template ID') {
          isData = true;
          return;
        }
        if (isData && cols[0].trim()) {
          currentTemplates.push({
            id: cols[0],
            name: cols[1] || '',
            subject: cols[2] || '',
            type: cols[3] || '',
            useCase: cols[4] || '',
            variables: cols[5] || '',
            status: cols[6] || '',
            createdAt: cols[7] || '',
            updatedAt: cols[8] || '',
            bodyHtml: cols[9] || ''
          });
        }
      }
    });

    populateTemplateSelect();
  } catch (e) {
    console.error('Gagal memuat local TSV untuk templates:', e);
  }
}

function populateTemplateSelect() {
  const select = document.getElementById('select-email-template');
  if (select) {
    select.innerHTML = '<option value="">-- Pilih Template --</option>';
    currentTemplates.forEach(template => {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = `${template.id} - ${template.name}`;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      selectedTemplateId = e.target.value;
      loadTemplateEditor(selectedTemplateId);
    });
  }
}

function loadTemplateEditor(templateId) {
  const editor = document.getElementById('email-template-editor');
  if (!templateId) {
    editor.style.display = 'none';
    return;
  }

  const template = currentTemplates.find(t => t.id === templateId);
  if (template) {
    document.getElementById('template-subject').value = template.subject || '';
    document.getElementById('template-body').value = template.bodyHtml || '';
    document.getElementById('template-variables').textContent = template.variables || 'Tidak ada variabel khusus';
    editor.style.display = 'block';

    updateIframePreview(template.bodyHtml || '');
  }
}

function updateIframePreview(html) {
  const iframe = document.getElementById('template-preview');
  if (!iframe) return;
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  doc.body.contentEditable = "true";
  doc.body.style.margin = "0";

  // Sync iframe changes back to textarea
  doc.body.addEventListener('input', () => {
    document.getElementById('template-body').value = doc.body.innerHTML;
  });
}

function setupEventListeners() {
  // Sync textarea changes to iframe preview
  const templateBody = document.getElementById('template-body');
  if (templateBody) {
    templateBody.addEventListener('input', (e) => {
      const iframe = document.getElementById('template-preview');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.document.body.innerHTML = e.target.value;
      }
    });
  }
  // Save All Settings
  const btnSaveSettings = document.getElementById('btn-save-settings');
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', async () => {
      // Gather all inputs starting with config-
      const newSettings = {};
      document.querySelectorAll('[id^="config-"]').forEach(input => {
        const key = input.id.replace('config-', '');
        newSettings[key] = input.type === 'checkbox' ? input.checked.toString() : input.value;
      });

      const originalText = btnSaveSettings.innerHTML;
      btnSaveSettings.disabled = true;
      btnSaveSettings.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

      try {
        const currentUser = AuthManager.getCurrentUser();
        const response = await APIClient.call(GAS_CONFIG.ACTIONS.SAVE_SETTINGS, {
          adminId: currentUser?.id || 'admin',
          settings: newSettings
        });

        if (response.success) {
          Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'Pengaturan berhasil disimpan!',
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          throw new Error(response.message || 'Gagal menyimpan pengaturan');
        }
      } catch (error) {
        Swal.fire('Error', error.message || 'Terjadi kesalahan sistem', 'error');
      } finally {
        btnSaveSettings.disabled = false;
        btnSaveSettings.innerHTML = originalText;
      }
    });
  }

  // Save Individual Template
  const btnSaveTemplate = document.getElementById('btn-save-template');
  if (btnSaveTemplate) {
    btnSaveTemplate.addEventListener('click', async () => {
      if (!selectedTemplateId) return;

      const subject = document.getElementById('template-subject').value;
      const bodyHtml = document.getElementById('template-body').value;

      const originalText = btnSaveTemplate.innerHTML;
      btnSaveTemplate.disabled = true;
      btnSaveTemplate.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

      try {
        const currentUser = AuthManager.getCurrentUser();
        const response = await APIClient.call(GAS_CONFIG.ACTIONS.SAVE_EMAIL_TEMPLATE, {
          adminId: currentUser?.id || 'admin',
          template: {
            id: selectedTemplateId,
            subject: subject,
            bodyHtml: bodyHtml
          }
        });

        if (response.success) {
          // Update local cache
          const tIndex = currentTemplates.findIndex(t => t.id === selectedTemplateId);
          if (tIndex > -1) {
            currentTemplates[tIndex].subject = subject;
            currentTemplates[tIndex].bodyHtml = bodyHtml;
          }

          Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'Template email berhasil disimpan!',
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          throw new Error(response.message || 'Gagal menyimpan template');
        }
      } catch (error) {
        Swal.fire('Error', error.message || 'Terjadi kesalahan sistem', 'error');
      } finally {
        btnSaveTemplate.disabled = false;
        btnSaveTemplate.innerHTML = originalText;
      }
    });
  }
}
