// Popup script for Chrome extension settings
document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  const extensionToggle = document.getElementById('extensionToggle');
  const statusCard = document.getElementById('statusCard');
  const statusTitle = document.getElementById('statusTitle');
  const statusDescription = document.getElementById('statusDescription');
  const todayBlocked = document.getElementById('todayBlocked');
  const totalBlocked = document.getElementById('totalBlocked');
  const sensitivitySelect = document.getElementById('sensitivitySelect');
  const discreetWarnings = document.getElementById('discreetWarnings');
  const logPreventions = document.getElementById('logPreventions');
  const autoReplaceEnabled = document.getElementById('autoReplaceEnabled');
  const replacementSection = document.getElementById('replacementSection');
  const creditCardReplace = document.getElementById('creditCardReplace');
  const ssnReplace = document.getElementById('ssnReplace');
  const emailReplace = document.getElementById('emailReplace');
  const phoneReplace = document.getElementById('phoneReplace');
  const apiKeyReplace = document.getElementById('apiKeyReplace');
  const passwordReplace = document.getElementById('passwordReplace');
  const whitelistInput = document.getElementById('whitelistInput');
  const addWhitelistBtn = document.getElementById('addWhitelistBtn');
  const whitelistItems = document.getElementById('whitelistItems');
  const logsContainer = document.getElementById('logsContainer');
  const clearLogsBtn = document.getElementById('clearLogsBtn');
  const exportSettingsBtn = document.getElementById('exportSettingsBtn');
  const generateAllBtn = document.getElementById('generateAllBtn');
  const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');
  const enterpriseEnabled = document.getElementById('enterpriseEnabled');
  const enterpriseConfig = document.getElementById('enterpriseConfig');
  const webhookUrl = document.getElementById('webhookUrl');
  const orgName = document.getElementById('orgName');
  const teamId = document.getElementById('teamId');
  const centralLogging = document.getElementById('centralLogging');

  let currentSettings = {};
  let currentLogs = [];

  // Load initial data
  await loadSettings();
  await loadStats();
  await loadLogs();

  // Event listeners
  extensionToggle.addEventListener('change', handleToggleExtension);
  sensitivitySelect.addEventListener('change', handleSettingChange);
  discreetWarnings.addEventListener('change', handleSettingChange);
  logPreventions.addEventListener('change', handleSettingChange);
  autoReplaceEnabled.addEventListener('change', handleAutoReplaceToggle);
  creditCardReplace.addEventListener('input', handleReplacementChange);
  ssnReplace.addEventListener('input', handleReplacementChange);
  emailReplace.addEventListener('input', handleReplacementChange);
  phoneReplace.addEventListener('input', handleReplacementChange);
  apiKeyReplace.addEventListener('input', handleReplacementChange);
  passwordReplace.addEventListener('input', handleReplacementChange);
  addWhitelistBtn.addEventListener('click', handleAddWhitelist);
  whitelistInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddWhitelist();
  });
  clearLogsBtn.addEventListener('click', handleClearLogs);
  exportSettingsBtn.addEventListener('click', handleExportSettings);
  generateAllBtn.addEventListener('click', handleGenerateAll);
  resetDefaultsBtn.addEventListener('click', handleResetDefaults);
  enterpriseEnabled.addEventListener('change', handleEnterpriseToggle);
  webhookUrl.addEventListener('input', handleEnterpriseConfigChange);
  orgName.addEventListener('input', handleEnterpriseConfigChange);
  teamId.addEventListener('input', handleEnterpriseConfigChange);
  centralLogging.addEventListener('change', handleEnterpriseConfigChange);
  
  // Add event listeners for individual generate buttons
  document.querySelectorAll('.generate-single-btn').forEach(btn => {
    btn.addEventListener('click', handleGenerateSingle);
  });

  // Load settings from storage
  async function loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      if (response.success) {
        currentSettings = response.settings;
        currentLogs = response.logs || [];
        updateUI();
      } else {
        console.error('Failed to load settings:', response.error);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // Update UI with current settings
  function updateUI() {
    // Extension toggle
    extensionToggle.checked = currentSettings.extensionEnabled !== false;
    
    // Status card
    updateStatusCard();
    
    // Settings
    sensitivitySelect.value = currentSettings.detectionSensitivity || 'medium';
    discreetWarnings.checked = currentSettings.showDiscreetWarnings !== false;
    logPreventions.checked = currentSettings.logPreventions !== false;
    
    // Auto-replace settings
    const autoReplace = currentSettings.autoReplace || {};
    autoReplaceEnabled.checked = autoReplace.enabled || false;
    
    // Update replacement section visibility
    if (autoReplace.enabled) {
      replacementSection.classList.add('show');
    } else {
      replacementSection.classList.remove('show');
    }
    
    // Populate replacement values
    creditCardReplace.value = autoReplace.creditCard || '';
    ssnReplace.value = autoReplace.ssn || '';
    emailReplace.value = autoReplace.email || '';
    phoneReplace.value = autoReplace.phone || '';
    apiKeyReplace.value = autoReplace.apiKey || '';
    passwordReplace.value = autoReplace.password || '';
    
    // Enterprise settings
    const enterprise = currentSettings.enterprise || {};
    enterpriseEnabled.checked = enterprise.enabled || false;
    
    // Update enterprise config visibility
    if (enterprise.enabled) {
      enterpriseConfig.classList.add('show');
    } else {
      enterpriseConfig.classList.remove('show');
    }
    
    // Populate enterprise values
    webhookUrl.value = enterprise.webhookUrl || '';
    orgName.value = enterprise.orgName || '';
    teamId.value = enterprise.teamId || '';
    centralLogging.checked = enterprise.centralLogging || false;
    
    // Whitelist
    updateWhitelistDisplay();
  }

  // Update status card
  function updateStatusCard() {
    if (currentSettings.extensionEnabled !== false) {
      statusCard.classList.remove('inactive');
      statusTitle.textContent = 'Extension Active';
      statusDescription.textContent = 'Monitoring paste events on AI tools';
    } else {
      statusCard.classList.add('inactive');
      statusTitle.textContent = 'Extension Disabled';
      statusDescription.textContent = 'Click toggle to enable protection';
    }
  }

  // Load and display statistics
  async function loadStats() {
    const today = new Date().toDateString();
    const todayCount = currentLogs.filter(log => 
      new Date(log.timestamp).toDateString() === today
    ).length;
    
    todayBlocked.textContent = todayCount;
    totalBlocked.textContent = currentLogs.length;
  }

  // Load and display recent logs
  async function loadLogs() {
    if (!currentLogs || currentLogs.length === 0) {
      logsContainer.innerHTML = '<p class="no-logs">No recent preventions</p>';
      return;
    }

    // Sort logs by timestamp (newest first) and take last 10
    const recentLogs = currentLogs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    logsContainer.innerHTML = recentLogs.map(log => `
      <div class="log-item">
        <div class="log-time">${formatTimestamp(log.timestamp)}</div>
        <div class="log-domain">${log.domain}</div>
      </div>
    `).join('');
  }

  // Handle extension toggle
  async function handleToggleExtension() {
    const enabled = extensionToggle.checked;
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'toggleExtension',
        enabled: enabled
      });
      
      if (response.success) {
        currentSettings.extensionEnabled = enabled;
        updateStatusCard();
      } else {
        // Revert toggle on error
        extensionToggle.checked = !enabled;
        console.error('Failed to toggle extension:', response.error);
      }
    } catch (error) {
      extensionToggle.checked = !enabled;
      console.error('Error toggling extension:', error);
    }
  }

  // Handle setting changes
  async function handleSettingChange() {
    const newSettings = {
      detectionSensitivity: sensitivitySelect.value,
      showDiscreetWarnings: discreetWarnings.checked,
      logPreventions: logPreventions.checked
    };

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: newSettings
      });
      
      if (response.success) {
        Object.assign(currentSettings, newSettings);
      } else {
        console.error('Failed to update settings:', response.error);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }

  // Handle auto-replace toggle
  async function handleAutoReplaceToggle() {
    const enabled = autoReplaceEnabled.checked;
    
    // Update visibility of replacement section
    if (enabled) {
      replacementSection.classList.add('show');
    } else {
      replacementSection.classList.remove('show');
    }

    const autoReplace = currentSettings.autoReplace || {};
    autoReplace.enabled = enabled;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: { autoReplace }
      });
      
      if (response.success) {
        currentSettings.autoReplace = autoReplace;
      } else {
        console.error('Failed to update auto-replace setting:', response.error);
      }
    } catch (error) {
      console.error('Error updating auto-replace setting:', error);
    }
  }

  // Handle replacement value changes
  async function handleReplacementChange() {
    const autoReplace = currentSettings.autoReplace || {};
    
    autoReplace.creditCard = creditCardReplace.value;
    autoReplace.ssn = ssnReplace.value;
    autoReplace.email = emailReplace.value;
    autoReplace.phone = phoneReplace.value;
    autoReplace.apiKey = apiKeyReplace.value;
    autoReplace.password = passwordReplace.value;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: { autoReplace }
      });
      
      if (response.success) {
        currentSettings.autoReplace = autoReplace;
      } else {
        console.error('Failed to update replacement values:', response.error);
      }
    } catch (error) {
      console.error('Error updating replacement values:', error);
    }
  }

  // Handle adding whitelist domain
  async function handleAddWhitelist() {
    const domain = whitelistInput.value.trim().toLowerCase();
    if (!domain) return;

    // Basic domain validation
    if (!isValidDomain(domain)) {
      alert('Please enter a valid domain (e.g., example.com)');
      return;
    }

    const whitelistedSites = currentSettings.whitelistedSites || [];
    if (whitelistedSites.includes(domain)) {
      alert('Domain is already whitelisted');
      return;
    }

    whitelistedSites.push(domain);
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: { whitelistedSites }
      });
      
      if (response.success) {
        currentSettings.whitelistedSites = whitelistedSites;
        whitelistInput.value = '';
        updateWhitelistDisplay();
      } else {
        console.error('Failed to add whitelist domain:', response.error);
      }
    } catch (error) {
      console.error('Error adding whitelist domain:', error);
    }
  }

  // Remove whitelist domain
  async function removeWhitelistDomain(domain) {
    const whitelistedSites = (currentSettings.whitelistedSites || [])
      .filter(site => site !== domain);
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: { whitelistedSites }
      });
      
      if (response.success) {
        currentSettings.whitelistedSites = whitelistedSites;
        updateWhitelistDisplay();
      } else {
        console.error('Failed to remove whitelist domain:', response.error);
      }
    } catch (error) {
      console.error('Error removing whitelist domain:', error);
    }
  }

  // Update whitelist display
  function updateWhitelistDisplay() {
    const whitelistedSites = currentSettings.whitelistedSites || [];
    
    if (whitelistedSites.length === 0) {
      whitelistItems.innerHTML = '<p class="no-logs">No trusted sites added</p>';
      return;
    }

    whitelistItems.innerHTML = whitelistedSites.map(domain => `
      <div class="whitelist-item">
        <span>${domain}</span>
        <button class="remove-btn" data-domain="${domain}">×</button>
      </div>
    `).join('');

    // Add event listeners to remove buttons
    whitelistItems.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const domain = e.target.getAttribute('data-domain');
        removeWhitelistDomain(domain);
      });
    });
  }

  // Handle clear logs
  async function handleClearLogs() {
    if (!confirm('Are you sure you want to clear all logs?')) return;
    
    try {
      await chrome.storage.local.set({ preventionLogs: [] });
      currentLogs = [];
      await loadStats();
      await loadLogs();
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  }

  // Handle export settings
  async function handleExportSettings() {
    const exportData = {
      settings: currentSettings,
      logs: currentLogs,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paste-guard-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Handle generate all dummy values
  async function handleGenerateAll() {
    if (typeof DataGenerator === 'undefined') {
      console.error('DataGenerator not available');
      return;
    }

    const generatedData = DataGenerator.generateAll();
    
    // Update all input fields
    creditCardReplace.value = generatedData.creditCard;
    ssnReplace.value = generatedData.ssn;
    emailReplace.value = generatedData.email;
    phoneReplace.value = generatedData.phone;
    apiKeyReplace.value = generatedData.apiKey;
    passwordReplace.value = generatedData.password;

    // Save to settings
    await handleReplacementChange();
    
    // Show notification
    showNotification('Generated all dummy values successfully', 'success');
  }

  // Handle reset to defaults
  async function handleResetDefaults() {
    const defaultValues = {
      creditCard: '4111-1111-1111-1111',
      ssn: '123-45-6789',
      email: 'user@example.com',
      phone: '(555) 123-4567',
      apiKey: 'sk-1234567890abcdef',
      password: '********'
    };

    // Update all input fields
    creditCardReplace.value = defaultValues.creditCard;
    ssnReplace.value = defaultValues.ssn;
    emailReplace.value = defaultValues.email;
    phoneReplace.value = defaultValues.phone;
    apiKeyReplace.value = defaultValues.apiKey;
    passwordReplace.value = defaultValues.password;

    // Save to settings
    await handleReplacementChange();
    
    // Show notification
    showNotification('Reset to default values', 'info');
  }

  // Handle generate single value
  async function handleGenerateSingle(event) {
    if (typeof DataGenerator === 'undefined') {
      console.error('DataGenerator not available');
      return;
    }

    const type = event.target.getAttribute('data-type');
    const generatedValue = DataGenerator.generateByType(type);
    
    // Update the corresponding input field
    const inputMap = {
      creditCard: creditCardReplace,
      ssn: ssnReplace,
      email: emailReplace,
      phone: phoneReplace,
      apiKey: apiKeyReplace,
      password: passwordReplace
    };

    const input = inputMap[type];
    if (input) {
      input.value = generatedValue;
      await handleReplacementChange();
      showNotification(`Generated new ${type.replace(/([A-Z])/g, ' $1').toLowerCase()}`, 'success');
    }
  }

  // Show notification helper
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      z-index: 10000;
      max-width: 200px;
      animation: slideIn 0.3s ease-out;
    `;

    // Set colors based on type
    switch (type) {
      case 'success':
        notification.style.background = '#28a745';
        notification.style.color = 'white';
        break;
      case 'error':
        notification.style.background = '#dc3545';
        notification.style.color = 'white';
        break;
      case 'info':
      default:
        notification.style.background = '#007bff';
        notification.style.color = 'white';
        break;
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 2000);
  }

  // Handle enterprise toggle
  async function handleEnterpriseToggle() {
    const enabled = enterpriseEnabled.checked;
    
    // Update visibility of enterprise config
    if (enabled) {
      enterpriseConfig.classList.add('show');
    } else {
      enterpriseConfig.classList.remove('show');
    }

    const enterprise = currentSettings.enterprise || {};
    enterprise.enabled = enabled;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: { enterprise }
      });
      
      if (response.success) {
        currentSettings.enterprise = enterprise;
      } else {
        console.error('Failed to update enterprise setting:', response.error);
      }
    } catch (error) {
      console.error('Error updating enterprise setting:', error);
    }
  }

  // Handle enterprise configuration changes
  async function handleEnterpriseConfigChange() {
    const enterprise = currentSettings.enterprise || {};
    
    enterprise.webhookUrl = webhookUrl.value;
    enterprise.orgName = orgName.value;
    enterprise.teamId = teamId.value;
    enterprise.centralLogging = centralLogging.checked;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: { enterprise }
      });
      
      if (response.success) {
        currentSettings.enterprise = enterprise;
      } else {
        console.error('Failed to update enterprise config:', response.error);
      }
    } catch (error) {
      console.error('Error updating enterprise config:', error);
    }
  }

  // Utility functions
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes > 0 ? `${diffMinutes}m ago` : 'Just now';
    }
  }

  function isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.?[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]$/;
    return domainRegex.test(domain) && domain.includes('.');
  }

  // Refresh stats periodically
  setInterval(() => {
    loadStats();
  }, 30000); // Every 30 seconds
});
