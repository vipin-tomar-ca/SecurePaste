// Content script for monitoring paste events on AI tool websites
(function() {
  'use strict';

  let isExtensionEnabled = true;
  let warningDialog = null;
  let pendingPasteEvent = null;

  // Initialize extension
  async function init() {
    try {
      const result = await chrome.storage.sync.get(['extensionEnabled', 'whitelistedSites']);
      isExtensionEnabled = result.extensionEnabled !== false;
      
      if (isExtensionEnabled) {
        setupPasteMonitoring();
        console.log('Sensitive Data Paste Guard: Monitoring enabled');
      }
    } catch (error) {
      console.error('Sensitive Data Paste Guard: Initialization failed', error);
    }
  }

  // Setup paste event monitoring
  function setupPasteMonitoring() {
    document.addEventListener('paste', handlePasteEvent, true);
    
    // Also monitor input events for direct typing
    document.addEventListener('input', handleInputEvent, true);
  }

  // Handle paste events
  async function handlePasteEvent(event) {
    if (!isExtensionEnabled) return;

    try {
      // Get clipboard data
      const clipboardData = event.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const pastedText = clipboardData.getData('text/plain');
      if (!pastedText || pastedText.length < 10) return; // Skip short text

      // Analyze for sensitive patterns
      const detectedPatterns = analyzeSensitiveData(pastedText);
      
      if (detectedPatterns.length > 0) {
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
              <strong>Are you sure you want to paste this sensitive information into an AI tool?</strong>
            </p>
            <div class="preview-section">
              <details>
                <summary>Preview clipboard content</summary>
                <div class="text-preview">${escapeHtml(text.substring(0, 200))}${text.length > 200 ? '...' : ''}</div>
              </details>
            </div>
          </div>
          <div class="warning-actions">
            <button class="btn-cancel" onclick="cancelPaste()">Cancel Paste</button>
            <button class="btn-proceed" onclick="proceedWithPaste()">Proceed Anyway</button>
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
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
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
      
      .warning-actions {
        padding: 0 20px 20px;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      
      .btn-cancel, .btn-proceed {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: background-color 0.2s;
      }
      
      .btn-cancel {
        background: #6c757d;
        color: white;
      }
      
      .btn-cancel:hover {
        background: #545b62;
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
    
    // Log the prevention
    chrome.runtime.sendMessage({
      action: 'logPrevention',
      url: window.location.href,
      timestamp: Date.now()
    });
  }

  // Proceed with paste operation
  function proceedWithPaste() {
    if (pendingPasteEvent && pendingPasteEvent.target) {
      const target = pendingPasteEvent.target;
      const text = pendingPasteEvent.text;

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

    if (warningDialog) {
      warningDialog.remove();
      warningDialog = null;
    }
    pendingPasteEvent = null;
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
