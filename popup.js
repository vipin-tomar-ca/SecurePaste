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
  const whitelistInput = document.getElementById('whitelistInput');
  const addWhitelistBtn = document.getElementById('addWhitelistBtn');
  const whitelistItems = document.getElementById('whitelistItems');
  const logsContainer = document.getElementById('logsContainer');
  const clearLogsBtn = document.getElementById('clearLogsBtn');
  const exportSettingsBtn = document.getElementById('exportSettingsBtn');

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
  addWhitelistBtn.addEventListener('click', handleAddWhitelist);
  whitelistInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddWhitelist();
  });
  clearLogsBtn.addEventListener('click', handleClearLogs);
  exportSettingsBtn.addEventListener('click', handleExportSettings);

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
