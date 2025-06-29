// Paste monitoring and detection module
(function() {
  'use strict';

  let isExtensionEnabled = true;
  let pasteDetectionDisabled = false;
  let pasteDetectionTimeout = null;
  let pendingPasteEvent = null;

  // IMMEDIATE PASTE EVENT LISTENER - This will work regardless of initialization
  document.addEventListener('paste', function(event) {
    // Skip if extension is disabled or paste detection is temporarily disabled
    if (!isExtensionEnabled || pasteDetectionDisabled) {
      console.log('GuardPasteAI: Paste detection skipped - extension disabled or temporarily disabled');
      return;
    }

    console.log('GuardPasteAI: Paste event detected!', event);
    
    // Store the target element for later use
    window.lastPasteTarget = event.target;
    console.log('GuardPasteAI: Stored target element:', event.target);
    
    // Get clipboard data
    const clipboardData = event.clipboardData || window.clipboardData;
    if (!clipboardData) {
      console.log('GuardPasteAI: No clipboard data available');
      return;
    }

    const pastedText = clipboardData.getData('text/plain');
    console.log('GuardPasteAI: Pasted text:', pastedText);
    
    if (!pastedText) {
      console.log('GuardPasteAI: No text in clipboard');
      return;
    }

    // Store the paste event for later use
    pendingPasteEvent = {
      target: event.target,
      text: pastedText,
      timestamp: Date.now()
    };

    // Store globally for other functions
    window.lastPastedText = pastedText;

    // Always show debug popup for now (temporary)
    event.preventDefault();
    event.stopPropagation();
    
    // Import and use popup manager
    if (window.PopupManager) {
      window.PopupManager.showSimpleDebugPopup(pastedText, event.target);
    } else {
      console.error('GuardPasteAI: PopupManager not available');
    }
  }, true); // Use capture phase to catch events early

  // Handle input events for additional monitoring
  function handleInputEvent(event) {
    if (!isExtensionEnabled) return;
    
    const text = event.target.value || event.target.textContent;
    if (text && text.length > 10) {
      console.log('GuardPasteAI: Input event detected, monitoring for sensitive data');
    }
  }

  // Setup paste monitoring
  function setupPasteMonitoring() {
    document.addEventListener('input', handleInputEvent, true);
    console.log('GuardPasteAI: Paste monitoring setup complete');
  }

  // Disable paste detection temporarily (for clipboard operations)
  function disablePasteDetectionTemporarily() {
    pasteDetectionDisabled = true;
    console.log('GuardPasteAI: Paste detection temporarily disabled');
    
    if (pasteDetectionTimeout) {
      clearTimeout(pasteDetectionTimeout);
    }
    
    pasteDetectionTimeout = setTimeout(() => {
      pasteDetectionDisabled = false;
      console.log('GuardPasteAI: Paste detection re-enabled');
    }, 3000);
  }

  // Load extension state from storage
  async function loadExtensionState() {
    try {
      const result = await chrome.storage.local.get(['extensionEnabled']);
      isExtensionEnabled = result.extensionEnabled !== false; // Default to true
      console.log('GuardPasteAI: Extension state loaded:', isExtensionEnabled);
    } catch (error) {
      console.error('GuardPasteAI: Error loading extension state:', error);
      isExtensionEnabled = true; // Default to enabled
    }
  }

  // Force reload extension state
  async function forceReloadExtensionState() {
    await loadExtensionState();
    console.log('GuardPasteAI: Extension state force reloaded');
  }

  // Set extension enabled state
  function setExtensionEnabled(enabled) {
    isExtensionEnabled = enabled;
    console.log('GuardPasteAI: Extension enabled state set to:', enabled);
  }

  // Get current extension state
  function getExtensionEnabled() {
    return isExtensionEnabled;
  }

  // Get pending paste event
  function getPendingPasteEvent() {
    return pendingPasteEvent;
  }

  // Clear pending paste event
  function clearPendingPasteEvent() {
    pendingPasteEvent = null;
  }

  // Export functions to global scope
  window.PasteMonitor = {
    setupPasteMonitoring,
    disablePasteDetectionTemporarily,
    loadExtensionState,
    forceReloadExtensionState,
    setExtensionEnabled,
    getExtensionEnabled,
    getPendingPasteEvent,
    clearPendingPasteEvent
  };

  // Initialize on load
  loadExtensionState();
  setupPasteMonitoring();

})(); 