// Content script for monitoring paste events on AI tool websites
(function() {
  'use strict';

  let currentSettings = {};
  let warningDialog = null;
  let pendingPasteEvent = null;
  let detectionEngine = null;
  let llmIntegration = null;

  // Initialize extension with advanced detection engine
  async function init() {
    try {
      // Load detection engine and LLM integration
      await loadExternalModules();
      
      // Initialize detection systems
      detectionEngine = new DetectionEngine();
      llmIntegration = new LLMIntegration();
      
      // Get current settings
      const settings = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getSettings' }, resolve);
      });
      
      currentSettings = settings || {};
      
      if (!currentSettings.extensionEnabled) {
        return;
      }
      
      // Check enterprise geofencing if enabled
      if (currentSettings.enterprise?.enabled && currentSettings.enterprise.geofencing?.enabled) {
        const locationAllowed = await checkGeofencing();
        if (!locationAllowed) {
          console.log('GuardPasteAI: Access blocked due to geofencing policy');
          return;
        }
      }
      
      setupPasteMonitoring();
      console.log('GuardPasteAI: Advanced monitoring enabled');
    } catch (error) {
      console.error('GuardPasteAI: Initialization failed', error);
    }
  }

  // Load external detection modules
  async function loadExternalModules() {
    const scripts = ['detection-engine.js', 'llm-integration.js'];
    
    for (const script of scripts) {
      if (!window[script.replace('.js', '').replace('-', '')]) {
        await loadScript(script);
      }
    }
  }

  // Load script dynamically
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(src);
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Check geofencing policy for enterprise users
  async function checkGeofencing() {
    if (!navigator.geolocation) return true;
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false
        });
      });
      
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      
      const response = await chrome.runtime.sendMessage({
        action: 'checkGeofencing',
        location
      });
      
      return response?.allowed !== false;
    } catch (error) {
      console.error('Geofencing check failed:', error);
      return true; // Allow by default if geolocation fails
    }
  }

  // Setup paste event monitoring
  function setupPasteMonitoring() {
    document.addEventListener('paste', handlePasteEvent, true);
    
    // Also monitor input events for direct typing
    document.addEventListener('input', handleInputEvent, true);
  }

  // Handle paste events with advanced detection
  async function handlePasteEvent(event) {
    if (!currentSettings.extensionEnabled) return;

    try {
      // Get clipboard data
      const clipboardData = event.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const pastedText = clipboardData.getData('text/plain');
      if (!pastedText || pastedText.length < 10) return; // Skip short text

      // Prepare detection options
      const detectionOptions = {
        domain: window.location.hostname,
        userTier: currentSettings.userTier || 'free',
        enableLLM: currentSettings.enableLLM && (currentSettings.userTier === 'pro' || currentSettings.userTier === 'enterprise'),
        llmProvider: currentSettings.llmProvider || 'anthropic',
        userRole: currentSettings.enterprise?.userRole,
        industry: currentSettings.enterprise?.industry,
        customInstructions: currentSettings.enterprise?.customInstructions
      };

      // Use advanced detection engine
      let analysisResult;
      if (detectionEngine) {
        analysisResult = await detectionEngine.analyze(pastedText, detectionOptions);
      } else {
        // Fallback to basic detection
        const detectedPatterns = analyzeSensitiveData(pastedText);
        analysisResult = {
          riskScore: detectedPatterns.length > 0 ? 0.8 : 0,
          detectedPatterns: detectedPatterns,
          confidence: 'medium'
        };
      }
      
      if (analysisResult.riskScore > 0.3 || analysisResult.detectedPatterns.length > 0) {
        // Prevent the paste operation
        event.preventDefault();
        event.stopPropagation();
        
        // Store the event and text for potential continuation
        pendingPasteEvent = {
          target: event.target,
          text: pastedText,
          originalEvent: event
        };

        // Show warning dialog
        await showWarningDialog(detectedPatterns, pastedText);
      }
    } catch (error) {
      console.error('Sensitive Data Paste Guard: Paste handling failed', error);
    }
  }

  // Handle input events (for direct typing)
  function handleInputEvent(event) {
    if (!isExtensionEnabled) return;
    
    const target = event.target;
    if (!target || !target.value) return;

    // Only check substantial input (debounced)
    clearTimeout(target._sensitiveCheckTimeout);
    target._sensitiveCheckTimeout = setTimeout(() => {
      const detectedPatterns = analyzeSensitiveData(target.value);
      if (detectedPatterns.length > 0) {
        showDiscreetWarning(target, detectedPatterns);
      }
    }, 1000);
  }

  // Show warning dialog
  async function showWarningDialog(detectedPatterns, text) {
    // Remove existing dialog
    if (warningDialog) {
      warningDialog.remove();
    }

    // Create warning dialog
    warningDialog = document.createElement('div');
    warningDialog.id = 'sensitive-data-warning';
    warningDialog.innerHTML = `
      <div class="warning-overlay">
        <div class="warning-dialog">
          <div class="warning-header">
            <h3>⚠️ Sensitive Data Detected</h3>
            <button class="close-btn" onclick="this.closest('#sensitive-data-warning').remove()">&times;</button>
          </div>
          <div class="warning-content">
            <p>The following sensitive information patterns were detected in your clipboard:</p>
            <ul class="detected-patterns">
              ${detectedPatterns.map(pattern => 
                `<li><strong>${pattern.name}</strong>: ${pattern.description} (${pattern.count} instance${pattern.count > 1 ? 's' : ''})</li>`
              ).join('')}
            </ul>
            <p class="warning-message">
              <strong>Review and edit your content before pasting:</strong>
            </p>
            <div class="edit-section">
              <label for="editableContent">Edit your content:</label>
              <textarea id="editableContent" class="content-editor" placeholder="Your content will appear here...">${escapeHtml(text)}</textarea>
              <div class="editor-actions">
                <button class="btn-highlight" onclick="highlightSensitiveData()">Highlight Sensitive Data</button>
                <button class="btn-clear" onclick="clearSensitiveData()">Replace with Dummy Data</button>
                <button class="btn-auto-replace" onclick="autoReplaceInEditor()">Auto-Replace All</button>
              </div>
            </div>
            <div class="preview-section">
              <details>
                <summary>View original clipboard content</summary>
                <div class="text-preview">${escapeHtml(text.substring(0, 500))}${text.length > 500 ? '...' : ''}</div>
              </details>
            </div>
          </div>
          <div class="warning-actions">
            <button class="btn-cancel" onclick="cancelPaste()">Cancel</button>
            <button class="btn-proceed-edited" onclick="proceedWithEditedPaste()">Paste Edited Content</button>
            <button class="btn-proceed" onclick="proceedWithPaste()">Paste Original</button>
          </div>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #sensitive-data-warning {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .warning-dialog {
        background: white;
        border-radius: 12px;
        max-width: 600px;
        width: 90%;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease-out;
      }
      
      @keyframes slideIn {
        from { transform: translateY(-50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      .warning-header {
        padding: 20px 20px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .warning-header h3 {
        margin: 0;
        color: #d73027;
        font-size: 18px;
      }
      
      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .warning-content {
        padding: 20px;
      }
      
      .detected-patterns {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 6px;
        padding: 15px;
        margin: 15px 0;
      }
      
      .detected-patterns li {
        margin: 8px 0;
        color: #856404;
      }
      
      .warning-message {
        font-weight: 600;
        color: #d73027;
        margin: 15px 0;
      }
      
      .preview-section {
        margin: 15px 0;
      }
      
      .text-preview {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
        max-height: 100px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-all;
      }
      
      .edit-section {
        margin: 15px 0;
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 15px;
      }
      
      .edit-section label {
        display: block;
        font-weight: 600;
        margin-bottom: 8px;
        color: #495057;
      }
      
      .content-editor {
        width: 100%;
        min-height: 120px;
        padding: 12px;
        border: 1px solid #ced4da;
        border-radius: 6px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 12px;
        line-height: 1.5;
        resize: vertical;
        background: white;
      }
      
      .content-editor:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
      }
      
      .editor-actions {
        display: flex;
        gap: 8px;
        margin-top: 10px;
      }
      
      .btn-highlight, .btn-clear, .btn-auto-replace {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: background-color 0.2s;
      }
      
      .btn-highlight {
        background: #ffc107;
        color: #212529;
      }
      
      .btn-highlight:hover {
        background: #e0a800;
      }
      
      .btn-clear {
        background: #dc3545;
        color: white;
      }
      
      .btn-clear:hover {
        background: #c82333;
      }
      
      .btn-auto-replace {
        background: #17a2b8;
        color: white;
      }
      
      .btn-auto-replace:hover {
        background: #138496;
      }
      
      .warning-actions {
        padding: 0 20px 20px;
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      
      .btn-cancel, .btn-proceed, .btn-proceed-edited {
        padding: 10px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
        transition: background-color 0.2s;
      }
      
      .btn-cancel {
        background: #6c757d;
        color: white;
      }
      
      .btn-cancel:hover {
        background: #545b62;
      }
      
      .btn-proceed-edited {
        background: #28a745;
        color: white;
      }
      
      .btn-proceed-edited:hover {
        background: #218838;
      }
      
      .btn-proceed {
        background: #dc3545;
        color: white;
      }
      
      .btn-proceed:hover {
        background: #c82333;
      }
    `;

    warningDialog.appendChild(style);
    document.body.appendChild(warningDialog);

    // Add global functions for button handlers
    window.cancelPaste = cancelPaste;
    window.proceedWithPaste = proceedWithPaste;
    window.proceedWithEditedPaste = proceedWithEditedPaste;
    window.highlightSensitiveData = highlightSensitiveData;
    window.clearSensitiveData = clearSensitiveData;
    window.autoReplaceInEditor = autoReplaceInEditor;
  }

  // Show discreet warning for typed content
  function showDiscreetWarning(target, detectedPatterns) {
    // Remove existing warning
    const existingWarning = target.parentNode?.querySelector('.discreet-warning');
    if (existingWarning) {
      existingWarning.remove();
    }

    // Create discreet warning
    const warning = document.createElement('div');
    warning.className = 'discreet-warning';
    warning.innerHTML = `
      <span class="warning-icon">⚠️</span>
      <span class="warning-text">Sensitive data detected (${detectedPatterns.length} type${detectedPatterns.length > 1 ? 's' : ''})</span>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .discreet-warning {
        position: absolute;
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 4px;
        padding: 5px 10px;
        font-size: 12px;
        color: #856404;
        z-index: 1000;
        margin-top: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        animation: fadeIn 0.3s ease-in;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .warning-icon {
        margin-right: 5px;
      }
    `;

    warning.appendChild(style);
    
    // Position warning near the input
    const rect = target.getBoundingClientRect();
    warning.style.position = 'fixed';
    warning.style.left = rect.left + 'px';
    warning.style.top = (rect.bottom + 5) + 'px';

    document.body.appendChild(warning);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (warning.parentNode) {
        warning.remove();
      }
    }, 5000);
  }

  // Cancel paste operation
  function cancelPaste() {
    if (warningDialog) {
      warningDialog.remove();
      warningDialog = null;
    }
    pendingPasteEvent = null;
    
    // Log the prevention with detailed information
    const detectedPatterns = analyzeSensitiveData(pendingPasteEvent?.text || '');
    chrome.runtime.sendMessage({
      action: 'logPrevention',
      url: window.location.href,
      timestamp: Date.now(),
      detectedPatterns: detectedPatterns,
      action: 'blocked',
      contentHash: generateContentHash(pendingPasteEvent?.text || '')
    });
  }

  // Proceed with paste operation
  function proceedWithPaste() {
    if (pendingPasteEvent && pendingPasteEvent.target) {
      const target = pendingPasteEvent.target;
      const text = pendingPasteEvent.text;

      insertTextAtTarget(target, text);
    }

    if (warningDialog) {
      warningDialog.remove();
      warningDialog = null;
    }
    pendingPasteEvent = null;
  }

  // Proceed with edited paste operation
  function proceedWithEditedPaste() {
    if (pendingPasteEvent && pendingPasteEvent.target) {
      const target = pendingPasteEvent.target;
      const editedText = document.getElementById('editableContent')?.value || '';

      insertTextAtTarget(target, editedText);
    }

    if (warningDialog) {
      warningDialog.remove();
      warningDialog = null;
    }
    pendingPasteEvent = null;
  }

  // Helper function to insert text at target
  function insertTextAtTarget(target, text) {
    // Insert the text
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      target.value = value.slice(0, start) + text + value.slice(end);
      target.selectionStart = target.selectionEnd = start + text.length;
    } else if (target.contentEditable === 'true') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
      }
    }

    // Trigger input event
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Highlight sensitive data in the editor
  function highlightSensitiveData() {
    const editor = document.getElementById('editableContent');
    if (!editor) return;

    const text = editor.value;
    const detectedPatterns = analyzeSensitiveData(text);
    
    if (detectedPatterns.length === 0) {
      alert('No sensitive data found in the current text.');
      return;
    }

    // Create a visual indicator
    let highlightedText = text;
    let offset = 0;

    for (const pattern of detectedPatterns) {
      for (const match of pattern.matches) {
        const index = highlightedText.indexOf(match, offset);
        if (index !== -1) {
          const before = highlightedText.substring(0, index);
          const after = highlightedText.substring(index + match.length);
          highlightedText = before + `[${pattern.name.toUpperCase()}: ${match}]` + after;
          offset = index + match.length + pattern.name.length + 4;
        }
      }
    }

    editor.value = highlightedText;
    
    // Show notification
    const notification = document.createElement('div');
    notification.textContent = `Highlighted ${detectedPatterns.reduce((sum, p) => sum + p.count, 0)} sensitive data instances`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ffc107;
      color: #212529;
      padding: 10px 15px;
      border-radius: 6px;
      font-weight: 500;
      z-index: 10001;
      animation: fadeInOut 3s ease-in-out;
    `;
    
    const fadeInOutStyle = document.createElement('style');
    fadeInOutStyle.textContent = `
      @keyframes fadeInOut {
        0%, 100% { opacity: 0; }
        20%, 80% { opacity: 1; }
      }
    `;
    
    document.head.appendChild(fadeInOutStyle);
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
      fadeInOutStyle.remove();
    }, 3000);
  }

  // Clear sensitive data from the editor
  function clearSensitiveData() {
    const editor = document.getElementById('editableContent');
    if (!editor) return;

    const text = editor.value;
    const detectedPatterns = analyzeSensitiveData(text);
    
    if (detectedPatterns.length === 0) {
      alert('No sensitive data found in the current text.');
      return;
    }

    // Get replacement settings
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
      if (response.success) {
        const settings = response.settings;
        const autoReplace = settings.autoReplace || {};
        
        let cleanedText = text;
        let replacedCount = 0;

        for (const pattern of detectedPatterns) {
          const replacementValue = autoReplace[pattern.type] || '[REMOVED]';
          
          for (const match of pattern.matches) {
            cleanedText = cleanedText.replace(match, replacementValue);
            replacedCount++;
          }
        }

        editor.value = cleanedText;
        
        // Show notification
        const notification = document.createElement('div');
        notification.textContent = `Replaced ${replacedCount} sensitive data instances with dummy values`;
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #28a745;
          color: white;
          padding: 10px 15px;
          border-radius: 6px;
          font-weight: 500;
          z-index: 10001;
          animation: fadeInOut 3s ease-in-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 3000);
      }
    });
  }

  // Auto-replace in editor with settings-based replacement
  function autoReplaceInEditor() {
    const editor = document.getElementById('editableContent');
    if (!editor) return;

    const text = editor.value;
    const detectedPatterns = analyzeSensitiveData(text);
    
    if (detectedPatterns.length === 0) {
      alert('No sensitive data found in the current text.');
      return;
    }

    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
      if (response.success) {
        const settings = response.settings;
        const autoReplace = settings.autoReplace || {};
        
        let replacedText = text;
        let replacedCount = 0;

        for (const pattern of detectedPatterns) {
          let replacementValue = autoReplace[pattern.type];
          
          // If no custom value is set, generate a dummy value
          if (!replacementValue && typeof DataGenerator !== 'undefined') {
            replacementValue = DataGenerator.generateByType(pattern.type);
          } else if (!replacementValue) {
            replacementValue = '[PLACEHOLDER]';
          }
          
          for (const match of pattern.matches) {
            replacedText = replacedText.replace(match, replacementValue);
            replacedCount++;
          }
        }

        editor.value = replacedText;
        
        // Show notification
        const notification = document.createElement('div');
        notification.textContent = `Auto-replaced ${replacedCount} items with configured dummy values`;
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #17a2b8;
          color: white;
          padding: 10px 15px;
          border-radius: 6px;
          font-weight: 500;
          z-index: 10001;
          animation: fadeInOut 3s ease-in-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 3000);
      }
    });
  }

  // Auto-replace sensitive data with dummy values
  async function autoReplaceSensitiveData(text) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (response.success) {
          const settings = response.settings;
          const autoReplace = settings.autoReplace || {};
          
          if (!autoReplace.enabled) {
            resolve(text);
            return;
          }

          const detectedPatterns = analyzeSensitiveData(text);
          let replacedText = text;

          for (const pattern of detectedPatterns) {
            const replacementValue = autoReplace[pattern.type];
            if (replacementValue) {
              for (const match of pattern.matches) {
                replacedText = replacedText.replace(match, replacementValue);
              }
            }
          }

          resolve(replacedText);
        } else {
          resolve(text);
        }
      });
    });
  }

  // Generate content hash for privacy-preserving logging
  function generateContentHash(text) {
    if (!text) return '';
    
    // Simple hash function for content fingerprinting without storing actual content
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'hash_' + Math.abs(hash).toString(36);
  }

  // Utility function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleExtension') {
      isExtensionEnabled = message.enabled;
      sendResponse({ success: true });
    }
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
