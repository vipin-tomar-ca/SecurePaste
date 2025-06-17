// Background service worker for Chrome extension
chrome.runtime.onInstalled.addListener(async () => {
  // Initialize default settings
  const defaultSettings = {
    extensionEnabled: true,
    whitelistedSites: [],
    blacklistedSites: [],
    detectionSensitivity: 'medium',
    showDiscreetWarnings: true,
    logPreventions: true,
    autoReplace: {
      enabled: false,
      creditCard: '4111-1111-1111-1111',
      ssn: '123-45-6789',
      email: 'user@example.com',
      phone: '(555) 123-4567',
      bankAccount: '12345678',
      driversLicense: 'DL123456',
      ipAddress: '192.168.1.1',
      apiKey: 'sk-1234567890abcdef',
      bitcoin: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      password: '********',
      devSecret: 'dev_secret_placeholder'
    },
    enterprise: {
      enabled: false,
      webhookUrl: '',
      teamId: '',
      orgName: '',
      adminEmail: '',
      centralLogging: false,
      policyEnforcement: true,
      customRules: []
    },
    logging: {
      enabled: true,
      level: 'info', // 'debug', 'info', 'warn', 'error'
      retentionDays: 30,
      includeContent: false, // For privacy, don't log actual content
      webhookEvents: true
    }
  };

  try {
    const existingSettings = await chrome.storage.sync.get(Object.keys(defaultSettings));
    const settingsToSet = {};
    
    // Only set defaults for missing settings
    for (const [key, value] of Object.entries(defaultSettings)) {
      if (existingSettings[key] === undefined) {
        settingsToSet[key] = value;
      }
    }
    
    if (Object.keys(settingsToSet).length > 0) {
      await chrome.storage.sync.set(settingsToSet);
    }
    
    console.log('Sensitive Data Paste Guard: Extension initialized');
  } catch (error) {
    console.error('Sensitive Data Paste Guard: Failed to initialize settings', error);
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'logPrevention':
      handleLogPrevention(message);
      sendResponse({ success: true });
      break;
      
    case 'getSettings':
      handleGetSettings(sendResponse);
      return true; // Indicates async response
      
    case 'updateSettings':
      handleUpdateSettings(message.settings, sendResponse);
      return true; // Indicates async response
      
    case 'toggleExtension':
      handleToggleExtension(message.enabled, sendResponse);
      return true; // Indicates async response
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Log prevention events
async function handleLogPrevention(message) {
  try {
    const settings = await chrome.storage.sync.get(['logPreventions', 'enterprise', 'logging']);
    if (!settings.logPreventions) return;

    // Get existing logs
    const result = await chrome.storage.local.get(['preventionLogs']);
    const logs = result.preventionLogs || [];
    
    // Create comprehensive log entry
    const logEntry = {
      id: generateLogId(),
      url: message.url,
      timestamp: message.timestamp,
      domain: new URL(message.url).hostname,
      detectedPatterns: message.detectedPatterns || [],
      action: message.action || 'blocked',
      severity: calculateSeverity(message.detectedPatterns),
      userAgent: navigator.userAgent,
      sessionId: await getSessionId()
    };
    
    // Add content hash if logging level allows (privacy-preserving)
    if (settings.logging?.includeContent && message.contentHash) {
      logEntry.contentHash = message.contentHash;
    }
    
    logs.push(logEntry);
    
    // Keep only last 100 entries
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    
    await chrome.storage.local.set({ preventionLogs: logs });
    
    // Send to webhook if enterprise mode enabled
    if (settings.enterprise?.enabled && settings.enterprise?.webhookUrl) {
      await sendWebhookEvent(logEntry, settings.enterprise);
    }
    
    // Update badge
    updateBadge();
  } catch (error) {
    console.error('Failed to log prevention:', error);
  }
}

// Send webhook event for enterprise logging
async function sendWebhookEvent(logEntry, enterpriseSettings) {
  try {
    if (!enterpriseSettings.webhookUrl) return;
    
    const webhookPayload = {
      event: 'sensitive_data_detected',
      timestamp: logEntry.timestamp,
      organization: enterpriseSettings.orgName || 'Unknown',
      team_id: enterpriseSettings.teamId || '',
      user_agent: logEntry.userAgent,
      domain: logEntry.domain,
      url: logEntry.url,
      detected_patterns: logEntry.detectedPatterns,
      severity: logEntry.severity,
      action: logEntry.action,
      session_id: logEntry.sessionId
    };
    
    const response = await fetch(enterpriseSettings.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GuardPasteAI-Extension/1.0'
      },
      body: JSON.stringify(webhookPayload)
    });
    
    if (!response.ok) {
      console.warn('Webhook delivery failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Failed to send webhook:', error);
  }
}

// Generate unique log ID
function generateLogId() {
  return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Calculate severity based on detected patterns
function calculateSeverity(detectedPatterns) {
  if (!detectedPatterns || detectedPatterns.length === 0) return 'low';
  
  const severityMap = {
    creditCard: 'critical',
    ssn: 'critical',
    apiKey: 'critical',
    password: 'critical',
    devSecret: 'critical',
    bankAccount: 'high',
    email: 'medium',
    phone: 'low',
    ipAddress: 'low'
  };
  
  let maxSeverity = 'low';
  const severityLevels = ['low', 'medium', 'high', 'critical'];
  
  for (const pattern of detectedPatterns) {
    const severity = severityMap[pattern.type] || 'low';
    if (severityLevels.indexOf(severity) > severityLevels.indexOf(maxSeverity)) {
      maxSeverity = severity;
    }
  }
  
  return maxSeverity;
}

// Get or create session ID
async function getSessionId() {
  try {
    const result = await chrome.storage.session.get(['sessionId']);
    if (result.sessionId) {
      return result.sessionId;
    }
    
    const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    await chrome.storage.session.set({ sessionId: newSessionId });
    return newSessionId;
  } catch (error) {
    // Fallback for browsers that don't support session storage
    return 'session_' + Date.now();
  }
}

// Get current settings
async function handleGetSettings(sendResponse) {
  try {
    const settings = await chrome.storage.sync.get([
      'extensionEnabled',
      'whitelistedSites', 
      'blacklistedSites',
      'detectionSensitivity',
      'showDiscreetWarnings',
      'logPreventions',
      'autoReplace',
      'enterprise',
      'logging',
      'pro',
      'userTier'
    ]);
    
    const logs = await chrome.storage.local.get(['preventionLogs']);
    
    // Set default user tier if not specified
    const userTier = settings.userTier || 'free';
    
    sendResponse({
      success: true,
      settings: {
        ...settings,
        userTier
      },
      logs: logs.preventionLogs || []
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Update settings
async function handleUpdateSettings(newSettings, sendResponse) {
  try {
    await chrome.storage.sync.set(newSettings);
    
    // Notify all content scripts about the change
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'settingsUpdated',
          settings: newSettings
        });
      } catch (error) {
        // Tab might not have content script, ignore error
      }
    }
    
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Toggle extension on/off
async function handleToggleExtension(enabled, sendResponse) {
  try {
    await chrome.storage.sync.set({ extensionEnabled: enabled });
    
    // Notify all content scripts
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'toggleExtension',
          enabled: enabled
        });
      } catch (error) {
        // Tab might not have content script, ignore error
      }
    }
    
    // Update badge
    updateBadge();
    
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Update extension badge
async function updateBadge() {
  try {
    const settings = await chrome.storage.sync.get(['extensionEnabled']);
    const logs = await chrome.storage.local.get(['preventionLogs']);
    
    if (!settings.extensionEnabled) {
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#6c757d' });
    } else {
      const recentLogs = (logs.preventionLogs || []).filter(
        log => Date.now() - log.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
      );
      
      if (recentLogs.length > 0) {
        chrome.action.setBadgeText({ text: recentLogs.length.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    }
  } catch (error) {
    console.error('Failed to update badge:', error);
  }
}

// Update badge on startup
updateBadge();

// Periodic cleanup of old logs
setInterval(async () => {
  try {
    const result = await chrome.storage.local.get(['preventionLogs']);
    const logs = result.preventionLogs || [];
    
    // Remove logs older than 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filteredLogs = logs.filter(log => log.timestamp > thirtyDaysAgo);
    
    if (filteredLogs.length !== logs.length) {
      await chrome.storage.local.set({ preventionLogs: filteredLogs });
      updateBadge();
    }
  } catch (error) {
    console.error('Failed to cleanup logs:', error);
  }
}, 60 * 60 * 1000); // Run every hour
