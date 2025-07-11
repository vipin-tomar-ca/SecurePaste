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
  
  // Pro feature elements
  const enableLLM = document.getElementById('enableLLM');
  const llmConfig = document.getElementById('llmConfig');
  const llmProvider = document.getElementById('llmProvider');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const testApiBtn = document.getElementById('testApiBtn');
  const detectionLevel = document.getElementById('detectionLevel');
  const privacyMode = document.getElementById('privacyMode');
  const customPatterns = document.getElementById('customPatterns');
  const industryContext = document.getElementById('industryContext');
  
  // Warning customization elements
  const useAnimatedWarnings = document.getElementById('useAnimatedWarnings');
  const warningIntensityConfig = document.getElementById('warningIntensityConfig');
  const warningIntensity = document.getElementById('warningIntensity');
  const testWarningBtn = document.getElementById('testWarningBtn');
  const warningAudioEnabled = document.getElementById('warningAudioEnabled');
  const warningDuration = document.getElementById('warningDuration');
  const durationValue = document.getElementById('durationValue');
  const animationSpeed = document.getElementById('animationSpeed');
  const progressiveWarnings = document.getElementById('progressiveWarnings');
  
  // Tier management elements
  const tierBadge = document.getElementById('tierBadge');
  const upgradeSection = document.getElementById('upgradeSection');
  const upgradeProBtn = document.getElementById('upgradeProBtn');
  const enterpriseBtn = document.getElementById('enterpriseBtn');

  let currentSettings = {};
  let currentLogs = [];
  let featureGates = null;

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
  
  // Pro feature event listeners
  enableLLM.addEventListener('change', handleLLMToggle);
  llmProvider.addEventListener('change', handleLLMConfigChange);
  apiKeyInput.addEventListener('input', handleLLMConfigChange);
  testApiBtn.addEventListener('click', handleTestAPI);
  detectionLevel.addEventListener('change', handleLLMConfigChange);
  privacyMode.addEventListener('change', handleLLMConfigChange);
  customPatterns.addEventListener('input', handleCustomRulesChange);
  industryContext.addEventListener('change', handleCustomRulesChange);
  
  // Warning customization event listeners
  useAnimatedWarnings.addEventListener('change', handleWarningToggle);
  warningIntensity.addEventListener('change', handleWarningConfigChange);
  testWarningBtn.addEventListener('click', handleTestWarning);
  warningAudioEnabled.addEventListener('change', handleWarningConfigChange);
  warningDuration.addEventListener('input', handleDurationChange);
  animationSpeed.addEventListener('change', handleWarningConfigChange);
  progressiveWarnings.addEventListener('change', handleWarningConfigChange);
  
  // Tier management event listeners
  upgradeProBtn.addEventListener('click', handleUpgradePro);
  enterpriseBtn.addEventListener('click', handleEnterpriseContact);
  
  // Add event listeners for individual generate buttons
  document.querySelectorAll('.generate-single-btn').forEach(btn => {
    btn.addEventListener('click', handleGenerateSingle);
  });

  // Initialize feature gates
  if (typeof FeatureGates !== 'undefined') {
    featureGates = new FeatureGates();
  }

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
    
    // Pro features
    const pro = currentSettings.pro || {};
    enableLLM.checked = pro.enableLLM || false;
    
    // Update LLM config visibility
    if (pro.enableLLM) {
      llmConfig.classList.add('show');
    } else {
      llmConfig.classList.remove('show');
    }
    
    // Populate pro values
    llmProvider.value = pro.llmProvider || 'anthropic';
    detectionLevel.value = pro.detectionLevel || 'medium';
    privacyMode.checked = pro.privacyMode || false;
    customPatterns.value = pro.customPatterns || '';
    industryContext.value = pro.industryContext || 'general';
    
    // Load API key for current provider
    loadApiKey();
    
    // Warning configuration
    const warnings = currentSettings.warnings || {};
    useAnimatedWarnings.checked = warnings.useAnimatedWarnings !== false;
    warningIntensity.value = warnings.intensity || 'moderate';
    warningAudioEnabled.checked = warnings.audioEnabled !== false;
    warningDuration.value = warnings.duration || 3;
    durationValue.textContent = `${warnings.duration || 3}s`;
    animationSpeed.value = warnings.animationSpeed || 'normal';
    progressiveWarnings.checked = warnings.progressive !== false;
    
    // Update warning config visibility
    if (warnings.useAnimatedWarnings !== false) {
      warningIntensityConfig.classList.remove('hidden');
    } else {
      warningIntensityConfig.classList.add('hidden');
    }
    
    // Update tier display and upgrade prompts
    updateTierDisplay(currentSettings.userTier || 'free');
    
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
    // Only count logs where action is 'blocked' or 'warned' (actual preventions)
    const preventionLogs = currentLogs.filter(log => 
      log.action === 'blocked' || log.action === 'warned'
    );
    
    const today = new Date().toDateString();
    const todayCount = preventionLogs.filter(log => 
      new Date(log.timestamp).toDateString() === today
    ).length;
    
    todayBlocked.textContent = todayCount;
    totalBlocked.textContent = preventionLogs.length;
    
    console.log('GuardPasteAI: Stats calculated - Today:', todayCount, 'Total:', preventionLogs.length);
    console.log('GuardPasteAI: All logs count:', currentLogs.length);
    console.log('GuardPasteAI: Prevention logs count:', preventionLogs.length);
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

  // Handle LLM toggle
  async function handleLLMToggle() {
    const enabled = enableLLM.checked;
    
    // Update visibility of LLM config
    if (enabled) {
      llmConfig.classList.add('show');
    } else {
      llmConfig.classList.remove('show');
    }

    const pro = currentSettings.pro || {};
    pro.enableLLM = enabled;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: { pro }
      });
      
      if (response.success) {
        currentSettings.pro = pro;
      } else {
        console.error('Failed to update LLM setting:', response.error);
      }
    } catch (error) {
      console.error('Error updating LLM setting:', error);
    }
  }

  // Handle LLM configuration changes
  async function handleLLMConfigChange() {
    const pro = currentSettings.pro || {};
    
    pro.llmProvider = llmProvider.value;
    pro.detectionLevel = detectionLevel.value;
    pro.privacyMode = privacyMode.checked;

    // Save API key separately for security
    if (apiKeyInput.value) {
      await saveApiKey(pro.llmProvider, apiKeyInput.value);
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: { pro }
      });
      
      if (response.success) {
        currentSettings.pro = pro;
      } else {
        console.error('Failed to update LLM config:', response.error);
      }
    } catch (error) {
      console.error('Error updating LLM config:', error);
    }
  }

  // Handle custom rules changes
  async function handleCustomRulesChange() {
    const pro = currentSettings.pro || {};
    
    pro.customPatterns = customPatterns.value;
    pro.industryContext = industryContext.value;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: { pro }
      });
      
      if (response.success) {
        currentSettings.pro = pro;
      } else {
        console.error('Failed to update custom rules:', response.error);
      }
    } catch (error) {
      console.error('Error updating custom rules:', error);
    }
  }

  // Test API key
  async function handleTestAPI() {
    const provider = llmProvider.value;
    const apiKey = apiKeyInput.value;
    
    if (!apiKey) {
      showNotification('Please enter an API key first', 'warning');
      return;
    }

    testApiBtn.disabled = true;
    testApiBtn.textContent = 'Testing...';

    try {
      const testResult = await testLLMConnection(provider, apiKey);
      
      if (testResult.success) {
        showNotification('API connection successful', 'success');
        await saveApiKey(provider, apiKey);
      } else {
        showNotification(`API test failed: ${testResult.error}`, 'error');
      }
    } catch (error) {
      showNotification(`Connection error: ${error.message}`, 'error');
    } finally {
      testApiBtn.disabled = false;
      testApiBtn.textContent = 'Test';
    }
  }

  // Test LLM connection
  async function testLLMConnection(provider, apiKey) {
    const endpoints = {
      anthropic: 'https://api.anthropic.com/v1/messages',
      openai: 'https://api.openai.com/v1/chat/completions'
    };

    const headers = {
      anthropic: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01'
      },
      openai: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    };

    const testPayloads = {
      anthropic: {
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Test' }]
      },
      openai: {
        model: 'gpt-3.5-turbo',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Test' }]
      }
    };

    try {
      const response = await fetch(endpoints[provider], {
        method: 'POST',
        headers: headers[provider],
        body: JSON.stringify(testPayloads[provider])
      });

      if (response.ok) {
        return { success: true };
      } else {
        const error = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${error}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Save API key securely
  async function saveApiKey(provider, apiKey) {
    await chrome.storage.sync.set({
      [`${provider}_api_key`]: apiKey
    });
  }

  // Load API key for current provider
  async function loadApiKey() {
    const provider = llmProvider.value;
    const stored = await chrome.storage.sync.get([`${provider}_api_key`]);
    const apiKey = stored[`${provider}_api_key`];
    
    if (apiKey) {
      apiKeyInput.value = '••••••••••••';
      apiKeyInput.dataset.hasKey = 'true';
    } else {
      apiKeyInput.value = '';
      apiKeyInput.dataset.hasKey = 'false';
    }
  }

  // Update tier display
  function updateTierDisplay(userTier) {
    tierBadge.textContent = userTier.toUpperCase();
    tierBadge.className = `tier-badge ${userTier}`;
    
    // Show upgrade section for free users
    if (userTier === 'free') {
      upgradeSection.style.display = 'block';
    } else {
      upgradeSection.style.display = 'none';
    }
    
    // Apply feature gates to UI
    applyFeatureGates(userTier);
  }

  // Apply feature gates to UI elements
  function applyFeatureGates(userTier) {
    if (!featureGates) return;
    
    // LLM features
    const hasLLM = featureGates.hasFeature(userTier, 'llmDetection');
    enableLLM.disabled = !hasLLM;
    if (!hasLLM) {
      enableLLM.checked = false;
      llmConfig.classList.remove('show');
    }
    
    // Custom rules
    const hasCustomRules = featureGates.hasFeature(userTier, 'customRules');
    customPatterns.disabled = !hasCustomRules;
    industryContext.disabled = !hasCustomRules;
    
    // Enterprise features
    const hasEnterprise = featureGates.hasFeature(userTier, 'enterpriseFeatures');
    enterpriseEnabled.disabled = !hasEnterprise;
    if (!hasEnterprise) {
      enterpriseEnabled.checked = false;
      enterpriseConfig.classList.remove('show');
    }
  }

  // Handle Pro upgrade
  function handleUpgradePro() {
    chrome.tabs.create({
      url: 'https://guardpasteai.com/upgrade/pro'
    });
  }

  // Handle Enterprise contact
  function handleEnterpriseContact() {
    chrome.tabs.create({
      url: 'https://guardpasteai.com/enterprise/contact'
    });
  }

  // Handle warning toggle
  async function handleWarningToggle() {
    const enabled = useAnimatedWarnings.checked;
    
    // Update visibility of warning config
    if (enabled) {
      warningIntensityConfig.classList.remove('hidden');
    } else {
      warningIntensityConfig.classList.add('hidden');
    }

    const warnings = currentSettings.warnings || {};
    warnings.useAnimatedWarnings = enabled;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: { warnings }
      });
      
      if (response.success) {
        currentSettings.warnings = warnings;
      } else {
        console.error('Failed to update warning setting:', response.error);
      }
    } catch (error) {
      console.error('Error updating warning setting:', error);
    }
  }

  // Handle warning configuration changes
  async function handleWarningConfigChange() {
    const warnings = currentSettings.warnings || {};
    
    warnings.intensity = warningIntensity.value;
    warnings.audioEnabled = warningAudioEnabled.checked;
    warnings.duration = parseInt(warningDuration.value);
    warnings.animationSpeed = animationSpeed.value;
    warnings.progressive = progressiveWarnings.checked;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: { warnings }
      });
      
      if (response.success) {
        currentSettings.warnings = warnings;
      } else {
        console.error('Failed to update warning config:', response.error);
      }
    } catch (error) {
      console.error('Error updating warning config:', error);
    }
  }

  // Handle duration slider change
  function handleDurationChange() {
    const value = warningDuration.value;
    durationValue.textContent = `${value}s`;
    handleWarningConfigChange();
  }

  // Test warning with current settings
  async function handleTestWarning() {
    const intensity = warningIntensity.value;
    const audioEnabled = warningAudioEnabled.checked;
    
    // Create test animated warning
    const testWarning = document.createElement('div');
    testWarning.className = `intensity-demo warning-intensity-${intensity}`;
    testWarning.innerHTML = `
      <div class="demo-icon">⚠️</div>
      <div class="demo-title">Test Warning - ${intensity.charAt(0).toUpperCase() + intensity.slice(1)}</div>
      <div class="demo-message">This is how warnings will appear</div>
    `;
    
    document.body.appendChild(testWarning);
    
    // Apply intensity-specific styling
    const configs = {
      subtle: { duration: 2000, glow: 0.3 },
      moderate: { duration: 3000, glow: 0.6 },
      aggressive: { duration: 4000, glow: 1.0 },
      critical: { duration: 5000, glow: 1.5 }
    };
    
    const config = configs[intensity];
    
    // Add entrance animation
    testWarning.style.opacity = '0';
    testWarning.style.transform = 'translate(-50%, -50%) scale(0.8)';
    testWarning.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    
    setTimeout(() => {
      testWarning.style.opacity = '1';
      testWarning.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 50);
    
    // Play test sound if enabled
    if (audioEnabled) {
      playTestSound(intensity);
    }
    
    // Auto-dismiss
    setTimeout(() => {
      testWarning.style.opacity = '0';
      testWarning.style.transform = 'translate(-50%, -50%) scale(0.8)';
      setTimeout(() => {
        if (testWarning.parentNode) {
          testWarning.parentNode.removeChild(testWarning);
        }
      }, 300);
    }, config.duration);
  }

  // Play test sound for warning
  function playTestSound(intensity) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      const frequencies = {
        subtle: 400,
        moderate: 300,
        aggressive: 200,
        critical: 150
      };
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequencies[intensity], audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio test not available:', error);
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
