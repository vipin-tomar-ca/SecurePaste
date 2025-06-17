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
    const settings = await chrome.storage.sync.get(['logPreventions']);
    if (!settings.logPreventions) return;

    // Get existing logs
    const result = await chrome.storage.local.get(['preventionLogs']);
    const logs = result.preventionLogs || [];
    
    // Add new log entry
    logs.push({
      url: message.url,
      timestamp: message.timestamp,
      domain: new URL(message.url).hostname
    });
    
    // Keep only last 100 entries
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    
    await chrome.storage.local.set({ preventionLogs: logs });
    
    // Update badge
    updateBadge();
  } catch (error) {
    console.error('Failed to log prevention:', error);
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
      'autoReplace'
    ]);
    
    const logs = await chrome.storage.local.get(['preventionLogs']);
    
    sendResponse({
      success: true,
      settings: settings,
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
