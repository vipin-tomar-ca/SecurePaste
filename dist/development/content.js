// Content script for monitoring paste events on AI tool websites
(function() {
  'use strict';

  let currentSettings = {};
  let warningDialog = null;
  let pendingPasteEvent = null;
  let detectionEngine = null;
  let llmIntegration = null;
  let animatedWarning = null;
  let isExtensionEnabled = true;
  let pasteDetectionDisabled = false;
  let pasteDetectionTimeout = null;

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
    showSimpleDebugPopup(pastedText, event.target);
  }, true); // Use capture phase to catch events early

  // Simple debug popup that will definitely work
  function showSimpleDebugPopup(pastedText, target) {
    console.log('GuardPasteAI: Showing debug popup for:', pastedText);
    
    // Remove existing popup
    const existingPopup = document.getElementById('simple-debug-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Test patterns first
    const detectedPatterns = testPatternsSimple(pastedText);
    const hasSensitiveData = detectedPatterns.length > 0;

    // Create enhanced popup with GuardPasteAI color scheme
    const popup = document.createElement('div');
    popup.id = 'simple-debug-popup';
    popup.className = 'guardpaste-popup-overlay';
    
    const patternList = detectedPatterns.map(p => 
      `<li class="pattern-item">
        <strong class="pattern-name">${p.name}</strong>: 
        <span class="pattern-value">${p.matches.join(', ')}</span>
      </li>`
    ).join('');
    
    const modalContent = `
      <div class="guardpaste-modal">
        <!-- Header with GuardPasteAI color scheme -->
        <div class="guardpaste-header ${hasSensitiveData ? 'warning' : 'info'}">
          <div class="header-content">
            <div class="header-icon">
              ${hasSensitiveData ? '⚠️' : '🛡️'}
            </div>
            <h3 class="header-title">
              ${hasSensitiveData ? 'Sensitive Data Detected!' : 'GuardPasteAI - Paste Review'}
            </h3>
          </div>
          <button id="close-popup-btn" class="close-button">&times;</button>
        </div>
        
        <!-- Body Content -->
        <div class="guardpaste-body">
          ${hasSensitiveData ? `
            <div class="warning-section">
              <h4 class="warning-title">
                <span class="warning-icon">🔍</span>
                Detected Sensitive Patterns
              </h4>
              <ul class="pattern-list">
                ${patternList}
              </ul>
            </div>
          ` : ''}
          
          <div class="content-section">
            <label class="content-label">Edit your content:</label>
            <textarea id="editable-content" class="content-textarea">${pastedText}</textarea>
          </div>
          
          <!-- Action Buttons -->
          <div class="action-buttons">
            <button id="highlight-btn" class="action-btn highlight-btn">
              <span class="btn-icon">🔍</span> Highlight Data
            </button>
            <button id="auto-replace-btn" class="action-btn auto-replace-btn">
              <span class="btn-icon">🔄</span> Auto-Replace
            </button>
            <button id="clear-btn" class="action-btn clear-btn">
              <span class="btn-icon">🚫</span> Redact All
            </button>
          </div>
          
          <!-- Final Actions -->
          <div class="final-actions">
            <button id="cancel-btn" class="final-btn cancel-btn">Cancel</button>
            <button id="paste-edited-btn" class="final-btn paste-edited-btn">Copy Edited to Clipboard</button>
            <button id="paste-original-btn" class="final-btn paste-original-btn">Copy Original to Clipboard</button>
          </div>
        </div>
      </div>
    `;
    
    popup.innerHTML = modalContent;

    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
      .guardpaste-popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(17, 24, 39, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .guardpaste-modal {
        background: #FFFFFF;
        border-radius: 12px;
        max-width: 600px;
        width: 90%;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease-out;
      }

      .guardpaste-header {
        padding: 20px 24px 16px;
        border-radius: 12px 12px 0 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: white;
      }

      .guardpaste-header.warning {
        background: #F59E0B;
      }

      .guardpaste-header.info {
        background: #3730A3;
      }

      .header-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .header-icon {
        width: 24px;
        height: 24px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      }

      .header-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .close-button {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
      }

      .close-button:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }

      .guardpaste-body {
        padding: 24px;
      }

      .warning-section {
        background: rgba(245, 158, 11, 0.05);
        border: 1px solid rgba(245, 158, 11, 0.2);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
      }

      .warning-title {
        margin: 0 0 12px 0;
        color: #D97706;
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .warning-icon {
        font-size: 16px;
      }

      .pattern-list {
        margin: 0;
        padding-left: 20px;
        color: #374151;
      }

      .pattern-item {
        margin: 8px 0;
        padding: 8px 12px;
        background: rgba(245, 158, 11, 0.1);
        border-left: 3px solid #F59E0B;
        border-radius: 4px;
      }

      .pattern-name {
        color: #D97706;
      }

      .pattern-value {
        font-family: monospace;
        background: rgba(0, 0, 0, 0.1);
        padding: 2px 4px;
        border-radius: 2px;
      }

      .content-section {
        margin-bottom: 20px;
      }

      .content-label {
        display: block;
        margin-bottom: 8px;
        color: #111827;
        font-weight: 600;
        font-size: 14px;
      }

      .content-textarea {
        width: 100%;
        height: 120px;
        padding: 12px;
        border: 1px solid #E5E7EB;
        border-radius: 8px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 13px;
        line-height: 1.5;
        resize: vertical;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }

      .content-textarea:focus {
        outline: none;
        border-color: #2563EB;
      }

      .action-buttons {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 24px;
        padding: 16px;
        background: #F9FAFB;
        border-radius: 8px;
      }

      .action-btn {
        background: #F59E0B;
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
      }

      .action-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }

      .action-btn:active {
        transform: translateY(0);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .highlight-btn {
        background: #F59E0B;
      }

      .highlight-btn:hover {
        background: #D97706;
      }

      .auto-replace-btn {
        background: #10B981;
        box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
      }

      .auto-replace-btn:hover {
        background: #059669;
      }

      .clear-btn {
        background: #EF4444;
        box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
      }

      .clear-btn:hover {
        background: #DC2626;
      }

      .final-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        padding-top: 16px;
        border-top: 1px solid #E5E7EB;
      }

      .final-btn {
        border: none;
        padding: 12px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .final-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }

      .final-btn:active {
        transform: translateY(0);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .cancel-btn {
        background: #E5E7EB;
        color: #374151;
      }

      .cancel-btn:hover {
        background: #D1D5DB;
      }

      .paste-edited-btn {
        background: #2563EB;
        color: white;
        box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
      }

      .paste-edited-btn:hover {
        background: #1D4ED8;
      }

      .paste-original-btn {
        background: #3730A3;
        color: white;
        box-shadow: 0 2px 4px rgba(55, 48, 163, 0.2);
      }

      .paste-original-btn:hover {
        background: #312E81;
      }

      @keyframes slideIn {
        from { 
          transform: translateY(-20px); 
          opacity: 0; 
        }
        to { 
          transform: translateY(0); 
          opacity: 1; 
        }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(popup);
    
    // Add event listeners after the popup is in the DOM
    setTimeout(() => {
      // Close button
      const closeBtn = document.getElementById('close-popup-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Close button clicked');
          popup.remove();
        });
      }
      
      // Action buttons
      const highlightBtn = document.getElementById('highlight-btn');
      if (highlightBtn) {
        highlightBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Highlight button clicked');
          highlightBtn.style.transform = 'scale(0.95)';
          setTimeout(() => highlightBtn.style.transform = '', 150);
          window.highlightSensitiveDataInPopup();
        });
      }
      
      const autoReplaceBtn = document.getElementById('auto-replace-btn');
      if (autoReplaceBtn) {
        autoReplaceBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Auto-replace button clicked');
          autoReplaceBtn.style.transform = 'scale(0.95)';
          setTimeout(() => autoReplaceBtn.style.transform = '', 150);
          window.autoReplaceSensitiveDataInPopup();
        });
      }
      
      const clearBtn = document.getElementById('clear-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Clear button clicked');
          clearBtn.style.transform = 'scale(0.95)';
          setTimeout(() => clearBtn.style.transform = '', 150);
          window.clearSensitiveDataInPopup();
        });
      }
      
      // Final action buttons
      const cancelBtn = document.getElementById('cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Cancel button clicked');
          cancelBtn.style.transform = 'scale(0.95)';
          setTimeout(() => cancelBtn.style.transform = '', 150);
          popup.remove();
        });
      }
      
      const pasteEditedBtn = document.getElementById('paste-edited-btn');
      if (pasteEditedBtn) {
        pasteEditedBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Copy edited to clipboard button clicked');
          pasteEditedBtn.style.transform = 'scale(0.95)';
          setTimeout(() => pasteEditedBtn.style.transform = '', 150);
          window.proceedWithEditedPaste();
        });
      }
      
      const pasteOriginalBtn = document.getElementById('paste-original-btn');
      if (pasteOriginalBtn) {
        pasteOriginalBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Copy original to clipboard button clicked');
          pasteOriginalBtn.style.transform = 'scale(0.95)';
          setTimeout(() => pasteOriginalBtn.style.transform = '', 150);
          window.proceedWithPaste();
        });
      }
      
      // Focus the textarea
      const textarea = document.getElementById('editable-content');
      if (textarea) {
        textarea.focus();
      }
      
    }, 100);
  }

  // Test patterns with simple detection
  function testPatternsSimple(text) {
    const patterns = [
      { 
        name: 'Credit Card', 
        pattern: /\b(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2}|6(?:011|5[0-9]{2}))[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}\b|\b(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2}|6(?:011|5[0-9]{2}))[0-9\s\-]{8,16}\b/g 
      },
      { 
        name: 'Email', 
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g 
      },
      { 
        name: 'SSN', 
        pattern: /\b(?:\d{3}[-\s]?\d{2}[-\s]?\d{4}|\d{9})\b/g 
      },
      { 
        name: 'API Key', 
        pattern: /\b(?:api[_-]?key|token|secret)[_-]?[:=]\s*['""]?[A-Za-z0-9_-]{16,}['""]?/gi 
      },
      { 
        name: 'Phone', 
        pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g 
      }
    ];

    const detected = [];
    patterns.forEach(({ name, pattern }) => {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        detected.push({ name, matches });
      }
    });

    return detected;
  }

  // Global functions for popup actions
  window.proceedWithEditedPaste = function() {
    console.log('GuardPasteAI: proceedWithEditedPaste called from global function');
    
    // Find the edited text from the simple debug popup
    const simpleEditedContent = document.getElementById('editable-content');
    
    let textToCopy = '';
    
    if (simpleEditedContent && simpleEditedContent.value) {
      textToCopy = simpleEditedContent.value;
      console.log('GuardPasteAI: Found edited text in editable-content:', textToCopy.substring(0, 100) + '...');
    } else {
      console.error('GuardPasteAI: No editable content found');
      alert('GuardPasteAI: No edited text found. Please try again.');
      return;
    }
    
    // Copy text to clipboard
    copyToClipboard(textToCopy).then(() => {
      console.log('GuardPasteAI: Edited text copied to clipboard successfully');
      
      // Show success notification
      showCopySuccessNotification('Edited text copied to clipboard! You can now paste it manually.');
      
      // Clean up popup
      const simplePopup = document.getElementById('simple-paste-popup');
      if (simplePopup) {
        simplePopup.remove();
      }
      
      // Reset global variables
      pendingPasteEvent = null;
      window.lastPasteTarget = null;
      window.lastPastedText = null;
      
      // Temporarily disable paste detection to prevent infinite loop
      disablePasteDetectionTemporarily();
      
    }).catch((error) => {
      console.error('GuardPasteAI: Failed to copy edited text to clipboard:', error);
      alert('GuardPasteAI: Failed to copy text to clipboard. Please try again.');
    });
  };

  window.proceedWithPaste = function() {
    console.log('GuardPasteAI: proceedWithPaste called from global function');
    
    // Get the original text from global variables
    let originalText = '';
    
    if (window.lastPastedText) {
      originalText = window.lastPastedText;
      console.log('GuardPasteAI: Found original text in global variable:', originalText.substring(0, 100) + '...');
    } else {
      console.error('GuardPasteAI: No original text found');
      alert('GuardPasteAI: No original text found. Please try again.');
      return;
    }
    
    // Copy text to clipboard
    copyToClipboard(originalText).then(() => {
      console.log('GuardPasteAI: Original text copied to clipboard successfully');
      
      // Show success notification
      showCopySuccessNotification('Original text copied to clipboard! You can now paste it manually.');
      
      // Clean up popup
      const simplePopup = document.getElementById('simple-paste-popup');
      if (simplePopup) {
        simplePopup.remove();
      }
      
      // Reset global variables
      pendingPasteEvent = null;
      window.lastPasteTarget = null;
      window.lastPastedText = null;
      
      // Temporarily disable paste detection to prevent infinite loop
      disablePasteDetectionTemporarily();
      
    }).catch((error) => {
      console.error('GuardPasteAI: Failed to copy original text to clipboard:', error);
      alert('GuardPasteAI: Failed to copy text to clipboard. Please try again.');
    });
  };

  window.highlightSensitiveDataInPopup = function() {
    console.log('GuardPasteAI: Highlight button clicked');
    const textarea = document.getElementById('editable-content');
    if (!textarea) {
      console.error('GuardPasteAI: Textarea not found for highlighting');
      return;
    }
    
    const text = textarea.value;
    const patterns = testPatternsSimple(text);
    console.log('GuardPasteAI: Found patterns for highlighting:', patterns);
    
    let highlightedText = text;
    patterns.forEach(({ name, matches }) => {
      matches.forEach(match => {
        const regex = new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        highlightedText = highlightedText.replace(regex, `<span class="highlighted-pattern">${match}</span>`);
      });
    });
    
    // Remove existing highlight popup
    const existingHighlightPopup = document.getElementById('highlight-popup');
    if (existingHighlightPopup) {
      existingHighlightPopup.remove();
    }
    
    // Create highlight popup with proper CSS classes
    const highlightPopup = document.createElement('div');
    highlightPopup.id = 'highlight-popup';
    highlightPopup.className = 'highlight-popup-overlay';
    
    highlightPopup.innerHTML = `
      <div class="highlight-modal">
        <div class="highlight-header">
          <div class="highlight-header-content">
            <div class="highlight-icon">🔍</div>
            <h3 class="highlight-title">Highlighted Sensitive Data</h3>
          </div>
          <button id="close-highlight-btn" class="highlight-close-button">&times;</button>
        </div>
        <div class="highlight-body">
          <div class="highlighted-content">${highlightedText}</div>
          <div class="highlight-actions">
            <button id="highlight-close-btn" class="highlight-action-btn">Close</button>
          </div>
        </div>
      </div>
    `;
    
    // Add CSS styles for highlight popup
    const highlightStyle = document.createElement('style');
    highlightStyle.textContent = `
      .highlight-popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(17, 24, 39, 0.8);
        z-index: 10002;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .highlight-modal {
        background: #FFFFFF;
        border-radius: 12px;
        max-width: 80%;
        max-height: 80%;
        overflow: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease-out;
      }

      .highlight-header {
        background: #F59E0B;
        color: white;
        padding: 20px 24px 16px;
        border-radius: 12px 12px 0 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .highlight-header-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .highlight-icon {
        width: 24px;
        height: 24px;
        background: #D97706;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      }

      .highlight-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .highlight-close-button {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
      }

      .highlight-close-button:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }

      .highlight-body {
        padding: 24px;
      }

      .highlighted-content {
        background: #F9FAFB;
        border: 1px solid #E5E7EB;
        border-radius: 8px;
        padding: 16px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
        color: #374151;
        max-height: 400px;
        overflow-y: auto;
      }

      .highlighted-pattern {
        background: #EF4444;
        color: white;
        padding: 2px 4px;
        border-radius: 3px;
        font-weight: 500;
      }

      .highlight-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid #E5E7EB;
      }

      .highlight-action-btn {
        background: #2563EB;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
      }

      .highlight-action-btn:hover {
        background: #1D4ED8;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }

      .highlight-action-btn:active {
        transform: translateY(0);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
    `;
    document.head.appendChild(highlightStyle);
    document.body.appendChild(highlightPopup);
    
    // Add event listeners for highlight popup
    setTimeout(() => {
      // Close button in header
      const closeHighlightBtn = document.getElementById('close-highlight-btn');
      if (closeHighlightBtn) {
        closeHighlightBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Highlight popup close button clicked');
          highlightPopup.remove();
        });
      }
      
      // Close button in footer
      const highlightCloseBtn = document.getElementById('highlight-close-btn');
      if (highlightCloseBtn) {
        highlightCloseBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Highlight popup close action button clicked');
          highlightPopup.remove();
        });
      }
      
      // Close on escape key
      const handleEscape = (event) => {
        if (event.key === 'Escape') {
          console.log('GuardPasteAI: Escape key pressed, closing highlight popup');
          highlightPopup.remove();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
      
      // Close on click outside
      highlightPopup.addEventListener('click', (event) => {
        if (event.target === highlightPopup) {
          console.log('GuardPasteAI: Clicked outside highlight popup, closing');
          highlightPopup.remove();
        }
      });
      
    }, 100);
  };

  window.autoReplaceSensitiveDataInPopup = function() {
    console.log('GuardPasteAI: Auto-replace button clicked');
    const textarea = document.getElementById('editable-content');
    if (!textarea) {
      console.error('GuardPasteAI: Textarea not found for auto-replace');
      return;
    }
    
    let text = textarea.value;
    const patterns = testPatternsSimple(text);
    console.log('GuardPasteAI: Found patterns for auto-replace:', patterns);
    
    patterns.forEach(({ name, matches }) => {
      matches.forEach(match => {
        let replacement = '';
        switch (name) {
          case 'Credit Card':
            replacement = '4111-1111-1111-1111';
            break;
          case 'Email':
            replacement = 'user@example.com';
            break;
          case 'SSN':
            replacement = '123-45-6789';
            break;
          case 'API Key':
            replacement = 'sk-1234567890abcdef';
            break;
          case 'Phone':
            replacement = '(555) 123-4567';
            break;
          default:
            replacement = '[***]';
        }
        const regex = new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        text = text.replace(regex, replacement);
        console.log(`GuardPasteAI: Replaced ${match} with ${replacement}`);
      });
    });
    
    textarea.value = text;
    console.log('GuardPasteAI: Auto-replace completed');
  };

  window.clearSensitiveDataInPopup = function() {
    console.log('GuardPasteAI: Clear sensitive data button clicked');
    const textarea = document.getElementById('editable-content');
    if (!textarea) {
      console.error('GuardPasteAI: Textarea not found for clearing');
      return;
    }
    
    let text = textarea.value;
    const patterns = testPatternsSimple(text);
    console.log('GuardPasteAI: Found patterns for clearing:', patterns);
    
    patterns.forEach(({ matches }) => {
      matches.forEach(match => {
        const regex = new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        text = text.replace(regex, '***REDACTED***');
        console.log(`GuardPasteAI: Redacted ${match}`);
      });
    });
    
    textarea.value = text;
    console.log('GuardPasteAI: Clear sensitive data completed');
  };

  // Proceed with edited paste (copy to clipboard)
  function proceedWithEditedPaste() {
    console.log('GuardPasteAI: proceedWithEditedPaste called');
    
    // Find the edited text from the warning dialog
    const editedContent = document.getElementById('editableContent');
    const simpleEditedContent = document.getElementById('editable-content');
    
    let textToCopy = '';
    
    if (editedContent && editedContent.value) {
      textToCopy = editedContent.value;
      console.log('GuardPasteAI: Found edited text in editableContent:', textToCopy.substring(0, 100) + '...');
    } else if (simpleEditedContent && simpleEditedContent.value) {
      textToCopy = simpleEditedContent.value;
      console.log('GuardPasteAI: Found edited text in editable-content:', textToCopy.substring(0, 100) + '...');
    } else {
      console.error('GuardPasteAI: No editable content found');
      alert('GuardPasteAI: No edited text found. Please try again.');
      return;
    }
    
    // Copy text to clipboard
    copyToClipboard(textToCopy).then(() => {
      console.log('GuardPasteAI: Edited text copied to clipboard successfully');
      
      // Show success notification
      showCopySuccessNotification('Edited text copied to clipboard! You can now paste it manually.');
      
      // Clean up popups
      const warningDialog = document.getElementById('warning-dialog');
      const simplePopup = document.getElementById('simple-paste-popup');
      
      if (warningDialog) {
        warningDialog.remove();
      }
      if (simplePopup) {
        simplePopup.remove();
      }
      
      // Reset global variables
      pendingPasteEvent = null;
      window.lastPasteTarget = null;
      window.lastPastedText = null;
      
      // Temporarily disable paste detection to prevent infinite loop
      disablePasteDetectionTemporarily();
      
    }).catch((error) => {
      console.error('GuardPasteAI: Failed to copy edited text to clipboard:', error);
      alert('GuardPasteAI: Failed to copy text to clipboard. Please try again.');
    });
  }

  // Proceed with original paste (copy to clipboard)
  function proceedWithPaste() {
    console.log('GuardPasteAI: proceedWithPaste called');
    
    // Get the original text from global variables or find it
    let originalText = '';
    
    if (window.lastPastedText) {
      originalText = window.lastPastedText;
      console.log('GuardPasteAI: Found original text in global variable:', originalText.substring(0, 100) + '...');
    } else {
      // Try to find it in the warning dialog
      const originalContent = document.getElementById('originalContent');
      if (originalContent && originalContent.value) {
        originalText = originalContent.value;
        console.log('GuardPasteAI: Found original text in originalContent:', originalText.substring(0, 100) + '...');
      } else {
        console.error('GuardPasteAI: No original text found');
        alert('GuardPasteAI: No original text found. Please try again.');
        return;
      }
    }
    
    // Copy text to clipboard
    copyToClipboard(originalText).then(() => {
      console.log('GuardPasteAI: Original text copied to clipboard successfully');
      
      // Show success notification
      showCopySuccessNotification('Original text copied to clipboard! You can now paste it manually.');
      
      // Clean up popups
      const warningDialog = document.getElementById('warning-dialog');
      const simplePopup = document.getElementById('simple-paste-popup');
      
      if (warningDialog) {
        warningDialog.remove();
      }
      if (simplePopup) {
        simplePopup.remove();
      }
      
      // Reset global variables
      pendingPasteEvent = null;
      window.lastPasteTarget = null;
      window.lastPastedText = null;
      
      // Temporarily disable paste detection to prevent infinite loop
      disablePasteDetectionTemporarily();
      
    }).catch((error) => {
      console.error('GuardPasteAI: Failed to copy original text to clipboard:', error);
      alert('GuardPasteAI: Failed to copy text to clipboard. Please try again.');
    });
  }

  // Helper function to copy text to clipboard
  async function copyToClipboard(text) {
    try {
      // Try the modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }
      
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (!successful) {
        throw new Error('execCommand copy failed');
      }
      
    } catch (error) {
      console.error('GuardPasteAI: Clipboard copy failed:', error);
      throw error;
    }
  }

  // Show copy success notification
  function showCopySuccessNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 500;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideInRight 0.3s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
      if (style.parentNode) {
        style.remove();
      }
    }, 3000);
  }

  // Initialize extension with hybrid detection engine
  async function init() {
    console.log('GuardPasteAI: Initializing extension...');
    
    // Load extension state first
    await loadExtensionState();
    
    // Load emergency patterns
    await loadEmergencyPatterns();
    
    // Load external modules
    await loadExternalModules();
    
    // Check geofencing
    await checkGeofencing();
    
    // Load warning styles
    loadWarningStyles();
    
    // Configure animated warning
    configureAnimatedWarning();
    
    // Setup paste monitoring
    setupPasteMonitoring();
    
    console.log('GuardPasteAI: Extension initialized successfully');
  }

  // Load emergency threat patterns
  async function loadEmergencyPatterns() {
    try {
      const stored = await chrome.storage.local.get(['emergencyPatterns', 'lastEmergencyUpdate']);
      
      if (stored.emergencyPatterns && detectionEngine) {
        const patterns = stored.emergencyPatterns;
        const lastUpdate = stored.lastEmergencyUpdate || 0;
        
        // Check if patterns are still valid (within 24 hours)
        if (Date.now() - lastUpdate < 24 * 60 * 60 * 1000) {
          await detectionEngine.handleEmergencyPatternUpdate(patterns);
          console.log(`Loaded ${patterns.length} emergency threat patterns`);
        } else {
          // Clean up expired patterns
          detectionEngine.cleanupExpiredPatterns();
          await chrome.storage.local.remove(['emergencyPatterns', 'lastEmergencyUpdate']);
        }
      }
    } catch (error) {
      console.error('Failed to load emergency patterns:', error);
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

  // Load warning CSS styles
  function loadWarningStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('animated-warning.css');
    document.head.appendChild(link);
  }

  // Configure animated warning based on user settings
  function configureAnimatedWarning() {
    if (!animatedWarning || !currentSettings.warnings) return;

    const warnings = currentSettings.warnings;
    
    // Configure audio
    animatedWarning.setAudioEnabled(warnings.audioEnabled !== false);
    
    // Configure custom intensity settings if provided
    if (warnings.customIntensityConfig) {
      Object.entries(warnings.customIntensityConfig).forEach(([level, config]) => {
        animatedWarning.configureIntensity(level, config);
      });
    }
    
    // Apply animation speed multiplier
    const speedMultipliers = { slow: 1.5, normal: 1.0, fast: 0.7 };
    const speedMultiplier = speedMultipliers[warnings.animationSpeed] || 1.0;
    
    if (speedMultiplier !== 1.0) {
      Object.keys(animatedWarning.intensityConfigs).forEach(level => {
        const config = animatedWarning.intensityConfigs[level];
        config.pulseSpeed *= speedMultiplier;
        config.duration = Math.max(1000, config.duration * (2 - speedMultiplier));
      });
    }
  }

  // Show animated warning with customizable intensity
  async function showAnimatedWarning(target, detectedPatterns, text, analysisResult) {
    if (!animatedWarning) return;

    const warningIntensity = currentSettings.warningIntensity || 'moderate';
    
    // Configure warning based on user settings
    if (currentSettings.warningAudioEnabled !== undefined) {
      animatedWarning.setAudioEnabled(currentSettings.warningAudioEnabled);
    }

    // Show progressive warning that escalates based on risk
    const warningId = animatedWarning.showProgressiveWarning(target, detectedPatterns, {
      intensity: warningIntensity,
      showReview: true,
      onDismiss: () => {
        // User dismissed warning - log event but don't proceed
        chrome.runtime.sendMessage({
          action: 'logPrevention',
          url: window.location.href,
          timestamp: Date.now(),
          detectedPatterns: detectedPatterns.map(p => ({ type: p.name.toLowerCase(), value: p.matches[0] })),
          action: 'dismissed',
          contentHash: generateContentHash(text)
        });
      },
      onReview: () => {
        // User wants to review - show detailed warning dialog
        showWarningDialog(detectedPatterns, text);
      }
    });

    // Auto-log the warning event
    chrome.runtime.sendMessage({
      action: 'logPrevention',
      url: window.location.href,
      timestamp: Date.now(),
      detectedPatterns: detectedPatterns.map(p => ({ type: p.name.toLowerCase(), value: p.matches[0] })),
      action: 'warned',
      contentHash: generateContentHash(text)
    });

    return warningId;
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

      // DEBUG MODE: Show popup for every paste event
      const debugMode = currentSettings.debugMode || false;
      if (debugMode) {
        event.preventDefault();
        event.stopPropagation();
        showDebugPopup(pastedText, event.target);
        return;
      }

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

        // Also store in global variables for compatibility with other popup systems
        window.lastPasteTarget = event.target;
        window.lastPastedText = pastedText;

        // Log the initial detection (warned action)
        chrome.runtime.sendMessage({
          action: 'logPrevention',
          url: window.location.href,
          timestamp: Date.now(),
          detectedPatterns: analysisResult.detectedPatterns.map(p => ({ type: p.name.toLowerCase(), value: p.matches[0] })),
          action: 'warned',
          contentHash: generateContentHash(pastedText)
        });

        // Show animated warning based on user preferences
        if (currentSettings.useAnimatedWarnings !== false && animatedWarning) {
          await showAnimatedWarning(event.target, analysisResult.detectedPatterns, pastedText, analysisResult);
        } else {
          // Fallback to traditional warning dialog
          await showWarningDialog(analysisResult.detectedPatterns, pastedText);
        }
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
            <button class="close-btn" id="warning-close-btn">&times;</button>
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
              <div class="editor-actions" id="editor-buttons" style="display: none;">
                <button class="btn-highlight" id="warning-highlight-btn">Highlight Data</button>
                <button class="btn-clear" id="warning-clear-btn">Clear Data</button>
                <button class="btn-auto-replace" id="warning-auto-replace-btn">Auto-Replace</button>
                <button class="btn-proceed-edited" id="warning-proceed-edited-btn">Copy Edited to Clipboard</button>
                <button class="btn-back" id="warning-back-btn">Back</button>
              </div>
            </div>
            <div class="preview-section">
              <details>
                <summary>View original clipboard content</summary>
                <div class="text-preview">${escapeHtml(text.substring(0, 500))}${text.length > 500 ? '...' : ''}</div>
              </details>
            </div>
          </div>
          <div class="warning-actions" id="action-buttons">
            <button class="btn-edit" id="edit-btn">Edit Data</button>
            <button class="btn-proceed" id="proceed-btn">Copy Original to Clipboard</button>
            <button class="btn-cancel" id="cancel-btn">Cancel</button>
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
      
      .warning-header {
        background: #dc2626;
        color: white;
        padding: 20px 24px 16px;
        border-radius: 12px 12px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .warning-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
      
      .close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .close-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      .warning-content {
        padding: 24px;
      }
      
      .detected-patterns {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 16px;
        margin: 16px 0;
        list-style: none;
      }
      
      .detected-patterns li {
        margin: 8px 0;
        padding: 8px 12px;
        background: white;
        border-radius: 6px;
        border-left: 4px solid #dc2626;
      }
      
      .warning-message {
        color: #dc2626;
        font-weight: 500;
        margin: 20px 0;
      }
      
      .edit-section {
        margin: 20px 0;
      }
      
      .edit-section label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #374151;
      }
      
      .content-editor {
        width: 100%;
        min-height: 120px;
        padding: 12px;
        border: 2px solid #d1d5db;
        border-radius: 8px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 13px;
        line-height: 1.5;
        resize: vertical;
        box-sizing: border-box;
      }
      
      .content-editor:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }
      
      .editor-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        flex-wrap: wrap;
      }
      
      .editor-actions button {
        padding: 8px 16px;
        border: 1px solid #d1d5db;
        background: white;
        color: #374151;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      
      .editor-actions button:hover {
        background: #f9fafb;
        border-color: #9ca3af;
      }
      
      .preview-section {
        margin: 20px 0;
      }
      
      .preview-section summary {
        cursor: pointer;
        color: #6b7280;
        font-weight: 500;
        margin-bottom: 8px;
      }
      
      .text-preview {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 12px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 12px;
        line-height: 1.4;
        color: #6b7280;
        max-height: 200px;
        overflow-y: auto;
      }
      
      .warning-actions {
        padding: 20px 24px;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        background: #f9fafb;
        border-radius: 0 0 12px 12px;
        border-top: 1px solid #e5e7eb;
      }
      
      .warning-actions button {
        padding: 12px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .btn-edit {
        background: #6b7280;
        color: white;
      }
      
      .btn-edit:hover {
        background: #4b5563;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }
      
      .btn-proceed {
        background: #059669;
        color: white;
      }
      
      .btn-proceed:hover {
        background: #047857;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }
      
      .btn-cancel {
        background: #6b7280;
        color: white;
      }
      
      .btn-cancel:hover {
        background: #4b5563;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }
      
      .warning-actions button:active {
        transform: translateY(0);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(warningDialog);

    // Add event listeners
    setTimeout(() => {
      // Close button
      const closeBtn = document.getElementById('warning-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Warning dialog close button clicked');
          warningDialog.remove();
        });
      }

      // Action buttons
      const cancelBtn = document.getElementById('cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Cancel button clicked');
          cancelBtn.style.transform = 'scale(0.95)';
          setTimeout(() => cancelBtn.style.transform = '', 150);
          cancelPaste();
        });
      }

      const proceedBtn = document.getElementById('proceed-btn');
      if (proceedBtn) {
        proceedBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Copy Original to Clipboard button clicked');
          proceedBtn.style.transform = 'scale(0.95)';
          setTimeout(() => proceedBtn.style.transform = '', 150);
          proceedWithPaste();
        });
      }

      const editBtn = document.getElementById('edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Edit button clicked');
          editBtn.style.transform = 'scale(0.95)';
          setTimeout(() => editBtn.style.transform = '', 150);
          
          // Show the editor section
          const editorSection = document.getElementById('editor-section');
          if (editorSection) {
            editorSection.style.display = 'block';
          }
          
          // Hide the action buttons and show the editor buttons
          const actionButtons = document.getElementById('action-buttons');
          const editorButtons = document.getElementById('editor-buttons');
          if (actionButtons) actionButtons.style.display = 'none';
          if (editorButtons) editorButtons.style.display = 'flex';
        });
      }

      // Editor buttons
      const highlightBtn = document.getElementById('warning-highlight-btn');
      if (highlightBtn) {
        highlightBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Warning highlight button clicked');
          highlightBtn.style.transform = 'scale(0.95)';
          setTimeout(() => highlightBtn.style.transform = '', 150);
          highlightSensitiveData();
        });
      }

      const clearBtn = document.getElementById('warning-clear-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Warning clear button clicked');
          clearBtn.style.transform = 'scale(0.95)';
          setTimeout(() => clearBtn.style.transform = '', 150);
          clearSensitiveData();
        });
      }

      const autoReplaceBtn = document.getElementById('warning-auto-replace-btn');
      if (autoReplaceBtn) {
        autoReplaceBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Warning auto-replace button clicked');
          autoReplaceBtn.style.transform = 'scale(0.95)';
          setTimeout(() => autoReplaceBtn.style.transform = '', 150);
          autoReplaceInEditor();
        });
      }

      const proceedEditedBtn = document.getElementById('warning-proceed-edited-btn');
      if (proceedEditedBtn) {
        proceedEditedBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Copy Edited to Clipboard button clicked');
          proceedEditedBtn.style.transform = 'scale(0.95)';
          setTimeout(() => proceedEditedBtn.style.transform = '', 150);
          window.proceedWithEditedPaste();
        });
      }

      const backBtn = document.getElementById('warning-back-btn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Back button clicked');
          backBtn.style.transform = 'scale(0.95)';
          setTimeout(() => backBtn.style.transform = '', 150);
          
          // Hide the editor section
          const editorSection = document.getElementById('editor-section');
          if (editorSection) {
            editorSection.style.display = 'none';
          }
          
          // Show the action buttons and hide the editor buttons
          const actionButtons = document.getElementById('action-buttons');
          const editorButtons = document.getElementById('editor-buttons');
          if (actionButtons) actionButtons.style.display = 'flex';
          if (editorButtons) editorButtons.style.display = 'none';
        });
      }

      // Close on escape key
      const handleEscape = (event) => {
        if (event.key === 'Escape') {
          console.log('GuardPasteAI: Escape key pressed, closing warning dialog');
          warningDialog.remove();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);

      // Close on click outside
      warningDialog.addEventListener('click', (event) => {
        if (event.target === warningDialog) {
          console.log('GuardPasteAI: Clicked outside warning dialog, closing');
          warningDialog.remove();
        }
      });

      // Focus the textarea
      const textarea = document.getElementById('editableContent');
      if (textarea) {
        textarea.focus();
      }

    }, 100);
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
    // Log the prevention with detailed information BEFORE clearing pendingPasteEvent
    const textToLog = pendingPasteEvent?.text || window.lastPastedText || '';
    const detectedPatterns = analyzeSensitiveData(textToLog);
    
    chrome.runtime.sendMessage({
      action: 'logPrevention',
      url: window.location.href,
      timestamp: Date.now(),
      detectedPatterns: detectedPatterns.map(p => ({ type: p.name.toLowerCase(), value: p.matches[0] })),
      action: 'blocked',
      contentHash: generateContentHash(textToLog)
    });
    
    // Clean up after logging
    if (warningDialog) {
      warningDialog.remove();
      warningDialog = null;
    }
    pendingPasteEvent = null;
    window.lastPasteTarget = null;
    window.lastPastedText = null;
  }

  // Temporarily disable paste detection to prevent infinite loops
  function disablePasteDetectionTemporarily() {
    console.log('GuardPasteAI: Temporarily disabling paste detection for 3 seconds');
    pasteDetectionDisabled = true;
    
    // Clear any existing timeout
    if (pasteDetectionTimeout) {
      clearTimeout(pasteDetectionTimeout);
    }
    
    // Re-enable after 3 seconds
    pasteDetectionTimeout = setTimeout(() => {
      pasteDetectionDisabled = false;
      console.log('GuardPasteAI: Paste detection re-enabled');
    }, 3000);
  }

  // Proceed with paste operation
  function proceedWithPaste() {
    console.log('GuardPasteAI: proceedWithPaste called');
    
    // Get the original text from global variables or find it
    let originalText = '';
    
    if (window.lastPastedText) {
      originalText = window.lastPastedText;
      console.log('GuardPasteAI: Found original text in global variable:', originalText.substring(0, 100) + '...');
    } else {
      // Try to find it in the warning dialog
      const originalContent = document.getElementById('originalContent');
      if (originalContent && originalContent.value) {
        originalText = originalContent.value;
        console.log('GuardPasteAI: Found original text in originalContent:', originalText.substring(0, 100) + '...');
      } else {
        console.error('GuardPasteAI: No original text found');
        alert('GuardPasteAI: No original text found. Please try again.');
        return;
      }
    }
    
    // Copy text to clipboard
    copyToClipboard(originalText).then(() => {
      console.log('GuardPasteAI: Original text copied to clipboard successfully');
      
      // Show success notification
      showCopySuccessNotification('Original text copied to clipboard! You can now paste it manually.');
      
      // Clean up popups
      const warningDialog = document.getElementById('warning-dialog');
      const simplePopup = document.getElementById('simple-paste-popup');
      
      if (warningDialog) {
        warningDialog.remove();
      }
      if (simplePopup) {
        simplePopup.remove();
      }
      
      // Reset global variables
      pendingPasteEvent = null;
      window.lastPasteTarget = null;
      window.lastPastedText = null;
      
      // Temporarily disable paste detection to prevent infinite loop
      disablePasteDetectionTemporarily();
      
    }).catch((error) => {
      console.error('GuardPasteAI: Failed to copy original text to clipboard:', error);
      alert('GuardPasteAI: Failed to copy text to clipboard. Please try again.');
    });
  }

  // Proceed with edited paste operation
  function proceedWithEditedPaste() {
    console.log('GuardPasteAI: proceedWithEditedPaste called');
    
    // Find the edited text from the warning dialog
    const editedContent = document.getElementById('editableContent');
    const simpleEditedContent = document.getElementById('editable-content');
    
    let textToCopy = '';
    
    if (editedContent && editedContent.value) {
      textToCopy = editedContent.value;
      console.log('GuardPasteAI: Found edited text in editableContent:', textToCopy.substring(0, 100) + '...');
    } else if (simpleEditedContent && simpleEditedContent.value) {
      textToCopy = simpleEditedContent.value;
      console.log('GuardPasteAI: Found edited text in editable-content:', textToCopy.substring(0, 100) + '...');
    } else {
      console.error('GuardPasteAI: No editable content found');
      alert('GuardPasteAI: No edited text found. Please try again.');
      return;
    }
    
    // Copy text to clipboard
    copyToClipboard(textToCopy).then(() => {
      console.log('GuardPasteAI: Edited text copied to clipboard successfully');
      
      // Show success notification
      showCopySuccessNotification('Edited text copied to clipboard! You can now paste it manually.');
      
      // Clean up popups
      const warningDialog = document.getElementById('warning-dialog');
      const simplePopup = document.getElementById('simple-paste-popup');
      
      if (warningDialog) {
        warningDialog.remove();
      }
      if (simplePopup) {
        simplePopup.remove();
      }
      
      // Reset global variables
      pendingPasteEvent = null;
      window.lastPasteTarget = null;
      window.lastPastedText = null;
      
    }).catch((error) => {
      console.error('GuardPasteAI: Failed to copy edited text to clipboard:', error);
      alert('GuardPasteAI: Failed to copy text to clipboard. Please try again.');
    });
  }

  // Helper function to insert text at target
  function insertTextAtTarget(target, text) {
    console.log('GuardPasteAI: insertTextAtTarget called with target:', target, 'text:', text);
    console.log('GuardPasteAI: Target element details:', {
      tagName: target?.tagName,
      type: target?.type,
      contentEditable: target?.contentEditable,
      className: target?.className,
      id: target?.id,
      role: target?.getAttribute('role'),
      'aria-label': target?.getAttribute('aria-label')
    });
    
    if (!target || !text) {
      console.error('GuardPasteAI: Invalid target or text for insertion');
      return false;
    }
    
    try {
      // Focus the target element first
      target.focus();
      
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        console.log('GuardPasteAI: Inserting into INPUT/TEXTAREA element');
        
        // For input/textarea, replace the entire value
        target.value = text;
        
        // Set cursor to end
        target.selectionStart = target.selectionEnd = text.length;
        
        // Trigger events
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log('GuardPasteAI: Text insertion completed successfully for INPUT/TEXTAREA');
        return true;
        
      } else if (target.contentEditable === 'true') {
        console.log('GuardPasteAI: Inserting into contentEditable element');
        
        // For contentEditable, clear and set content
        target.innerHTML = '';
        target.textContent = text;
        
        // Set cursor to end
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(target);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger events
        target.dispatchEvent(new Event('input', { bubbles: true }));
        
        console.log('GuardPasteAI: Text insertion completed successfully for contentEditable');
        return true;
        
      } else {
        console.log('GuardPasteAI: Target is not a supported input type, trying alternative approaches');
        
        // Strategy 1: Try to find a child input/textarea
        const childInput = target.querySelector('input, textarea, [contenteditable="true"]');
        if (childInput) {
          console.log('GuardPasteAI: Found child input element, inserting there');
          return insertTextAtTarget(childInput, text);
        }
        
        // Strategy 2: Look for common AI chat input selectors
        const aiInputSelectors = [
          '[role="textbox"]',
          '[data-testid*="input"]',
          '[data-testid*="textarea"]',
          '[aria-label*="input"]',
          '[aria-label*="message"]',
          '[placeholder*="message"]',
          '[placeholder*="input"]',
          '.chat-input',
          '.message-input',
          '.prompt-input',
          '.composer-input',
          '[class*="input"]',
          '[class*="textarea"]',
          '[class*="composer"]',
          '[class*="editor"]'
        ];
        
        for (const selector of aiInputSelectors) {
          const aiInput = target.querySelector(selector);
          if (aiInput) {
            console.log('GuardPasteAI: Found AI input element with selector:', selector);
            return insertTextAtTarget(aiInput, text);
          }
        }
        
        // Strategy 3: Look for any element with contentEditable in the target's subtree
        const contentEditableElement = target.querySelector('[contenteditable="true"]');
        if (contentEditableElement) {
          console.log('GuardPasteAI: Found contentEditable element in subtree');
          return insertTextAtTarget(contentEditableElement, text);
        }
        
        // Strategy 4: Try to find any input-like element in the target's subtree
        const anyInput = target.querySelector('input, textarea');
        if (anyInput) {
          console.log('GuardPasteAI: Found any input element in subtree');
          return insertTextAtTarget(anyInput, text);
        }
        
        // Strategy 5: Try to set value directly if the element has a value property
        if (target.value !== undefined) {
          target.value = text;
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('GuardPasteAI: Text insertion completed successfully using direct value set');
          return true;
        }
        
        // Strategy 6: Try to simulate typing by dispatching keyboard events
        console.log('GuardPasteAI: Attempting to simulate typing with keyboard events');
        try {
          // Focus the target
          target.focus();
          
          // Clear any existing content first
          target.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
          target.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', ctrlKey: true, bubbles: true }));
          target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
          target.dispatchEvent(new KeyboardEvent('keyup', { key: 'Delete', bubbles: true }));
          
          // Type the text character by character
          for (let i = 0; i < text.length; i++) {
            const char = text[i];
            target.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
            target.dispatchEvent(new InputEvent('input', { data: char, bubbles: true }));
            target.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
          }
          
          console.log('GuardPasteAI: Text insertion completed successfully using keyboard simulation');
          return true;
        } catch (keyboardError) {
          console.error('GuardPasteAI: Keyboard simulation failed:', keyboardError);
        }
        
        // Strategy 7: Last resort - try to find any element that might accept text
        console.log('GuardPasteAI: Searching for any element that might accept text...');
        const allElements = target.querySelectorAll('*');
        for (const element of allElements) {
          if (element.contentEditable === 'true' || 
              element.tagName === 'INPUT' || 
              element.tagName === 'TEXTAREA' ||
              element.getAttribute('role') === 'textbox') {
            console.log('GuardPasteAI: Found potential text element:', element);
            return insertTextAtTarget(element, text);
          }
        }
        
        console.error('GuardPasteAI: Cannot insert text into this element type - no supported input found');
        console.log('GuardPasteAI: Target element structure:', target.outerHTML.substring(0, 500) + '...');
        return false;
      }
    } catch (error) {
      console.error('GuardPasteAI: Error inserting text:', error);
      return false;
    }
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleExtension') {
      isExtensionEnabled = message.enabled;
      console.log('GuardPasteAI: Extension state updated via message:', isExtensionEnabled);
      sendResponse({ success: true });
    } else if (message.action === 'settingsUpdated') {
      // Reload extension state when settings are updated
      loadExtensionState().then(() => {
        console.log('GuardPasteAI: Extension state reloaded after settings update:', isExtensionEnabled);
      });
      sendResponse({ success: true });
    }
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Load extension state from storage
  async function loadExtensionState() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      if (response.success) {
        isExtensionEnabled = response.settings.extensionEnabled !== false;
        console.log('GuardPasteAI: Extension state loaded from storage:', isExtensionEnabled);
      }
    } catch (error) {
      console.error('GuardPasteAI: Failed to load extension state:', error);
      // Default to enabled if we can't load the state
      isExtensionEnabled = true;
    }
  }

  // Force reload extension state (for debugging and manual sync)
  async function forceReloadExtensionState() {
    console.log('GuardPasteAI: Force reloading extension state...');
    await loadExtensionState();
    console.log('GuardPasteAI: Extension state after force reload:', isExtensionEnabled);
  }

  // Make force reload available globally for debugging
  window.forceReloadExtensionState = forceReloadExtensionState;

  // Highlight sensitive data in the editor
  function highlightSensitiveData() {
    const editor = document.getElementById('editable-content');
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
    const editor = document.getElementById('editable-content');
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
          let replacementValue = autoReplace[pattern.type];
          
          // If no custom value is set, use safe generic replacements
          if (!replacementValue) {
            replacementValue = '[***]';
          }
          
          for (const match of pattern.matches) {
            cleanedText = cleanedText.replace(match, replacementValue);
            replacedCount++;
          }
        }

        editor.value = cleanedText;
        
        // Show notification
        const notification = document.createElement('div');
        notification.textContent = `Replaced ${replacedCount} sensitive data instances with safe replacement values`;
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
    const editor = document.getElementById('editable-content');
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
          
          // If no custom value is set, generate a generic replacement
          if (!replacementValue && typeof DataGenerator !== 'undefined') {
            replacementValue = DataGenerator.generateByType(pattern.type);
          } else if (!replacementValue) {
            // Use generic replacements that won't trigger detection
            replacementValue = '[***]';
          }
          
          for (const match of pattern.matches) {
            replacedText = replacedText.replace(match, replacementValue);
            replacedCount++;
          }
        }

        editor.value = replacedText;
        
        // Show notification
        const notification = document.createElement('div');
        notification.textContent = `Auto-replaced ${replacedCount} items with safe replacement values`;
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
            let replacementValue = autoReplace[pattern.type];
            
            // If no custom value is set, use safe generic replacements
            if (!replacementValue) {
              replacementValue = '[***]';
            }
            
            for (const match of pattern.matches) {
              replacedText = replacedText.replace(match, replacementValue);
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

  // Show debug popup for every paste event
  function showDebugPopup(pastedText, target) {
    // Remove existing debug popup
    const existingPopup = document.getElementById('debug-paste-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Create debug popup
    const debugPopup = document.createElement('div');
    debugPopup.id = 'debug-paste-popup';
    debugPopup.innerHTML = `
      <div class="debug-overlay">
        <div class="debug-dialog">
          <div class="debug-header">
            <h3>🔍 DEBUG: Paste Event Detected</h3>
            <button class="close-btn" id="debug-close-btn">&times;</button>
          </div>
          <div class="debug-content">
            <p><strong>Pasted Text:</strong></p>
            <div class="debug-text">${escapeHtml(pastedText)}</div>
            <p><strong>Text Length:</strong> ${pastedText.length} characters</p>
            <p><strong>Target Element:</strong> ${target.tagName}${target.className ? '.' + target.className.split(' ')[0] : ''}</p>
            <p><strong>Domain:</strong> ${window.location.hostname}</p>
            <hr>
            <p><strong>Pattern Detection Test:</strong></p>
            <div class="pattern-test">
              ${testAllPatterns(pastedText)}
            </div>
          </div>
          <div class="debug-actions">
            <button class="btn-proceed" id="debug-proceed-btn">Proceed with Paste</button>
            <button class="btn-cancel" id="debug-cancel-btn">Cancel</button>
          </div>
        </div>
      </div>
    `;

    // Add debug styles
    const style = document.createElement('style');
    style.textContent = `
      #debug-paste-popup {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .debug-dialog {
        background: #2c3e50;
        color: white;
        border-radius: 12px;
        max-width: 700px;
        width: 90%;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        animation: slideIn 0.3s ease-out;
      }
      
      .debug-header {
        padding: 20px 20px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #34495e;
        border-radius: 12px 12px 0 0;
      }
      
      .debug-header h3 {
        margin: 0;
        color: #3498db;
        font-size: 18px;
      }
      
      .debug-content {
        padding: 20px;
      }
      
      .debug-text {
        background: #34495e;
        border: 1px solid #7f8c8d;
        border-radius: 6px;
        padding: 15px;
        margin: 10px 0;
        font-family: monospace;
        white-space: pre-wrap;
        max-height: 200px;
        overflow-y: auto;
      }
      
      .pattern-test {
        background: #34495e;
        border: 1px solid #7f8c8d;
        border-radius: 6px;
        padding: 15px;
        margin: 10px 0;
        font-family: monospace;
      }
      
      .pattern-result {
        margin: 5px 0;
        padding: 5px;
        border-radius: 3px;
      }
      
      .pattern-match {
        background: #e74c3c;
        color: white;
      }
      
      .pattern-no-match {
        background: #27ae60;
        color: white;
      }
      
      .debug-actions {
        padding: 20px;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        background: #34495e;
        border-radius: 0 0 12px 12px;
      }
      
      .debug-actions button {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.2s ease;
      }
      
      .btn-proceed {
        background: #27ae60;
        color: white;
      }
      
      .btn-proceed:hover {
        background: #229954;
        transform: translateY(-1px);
      }
      
      .btn-cancel {
        background: #e74c3c;
        color: white;
      }
      
      .btn-cancel:hover {
        background: #c0392b;
        transform: translateY(-1px);
      }
      
      .debug-actions button:active {
        transform: translateY(0);
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(debugPopup);

    // Add event listeners
    setTimeout(() => {
      // Close button
      const closeBtn = document.getElementById('debug-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Debug popup close button clicked');
          debugPopup.remove();
        });
      }

      // Proceed button
      const proceedBtn = document.getElementById('debug-proceed-btn');
      if (proceedBtn) {
        proceedBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Debug popup proceed button clicked');
          proceedBtn.style.transform = 'scale(0.95)';
          setTimeout(() => proceedBtn.style.transform = '', 150);
          proceedWithDebugPaste(pastedText, proceedBtn);
        });
      }

      // Cancel button
      const cancelBtn = document.getElementById('debug-cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          console.log('GuardPasteAI: Debug popup cancel button clicked');
          cancelBtn.style.transform = 'scale(0.95)';
          setTimeout(() => cancelBtn.style.transform = '', 150);
          debugPopup.remove();
        });
      }

      // Close on escape key
      const handleEscape = (event) => {
        if (event.key === 'Escape') {
          console.log('GuardPasteAI: Escape key pressed, closing debug popup');
          debugPopup.remove();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);

      // Close on click outside
      debugPopup.addEventListener('click', (event) => {
        if (event.target === debugPopup) {
          console.log('GuardPasteAI: Clicked outside debug popup, closing');
          debugPopup.remove();
        }
      });

    }, 100);
  }

  // Test all patterns against the pasted text
  function testAllPatterns(text) {
    const patterns = [
      { name: 'Credit Card', pattern: /\b(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2}|6(?:011|5[0-9]{2}))[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}\b|\b(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2}|6(?:011|5[0-9]{2}))[0-9\s\-]{8,16}\b/g },
      { name: 'Email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
      { name: 'SSN', pattern: /\b(?:\d{3}[-\s]?\d{2}[-\s]?\d{4}|\d{9})\b/g },
      { name: 'API Key', pattern: /\b(?:api[_-]?key|token|secret)[_-]?[:=]\s*['""]?[A-Za-z0-9_-]{16,}['""]?/gi },
      { name: 'Phone', pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g }
    ];

    let results = '';
    patterns.forEach(({ name, pattern }) => {
      const matches = text.match(pattern);
      const isMatch = matches && matches.length > 0;
      const className = isMatch ? 'pattern-match' : 'pattern-no-match';
      const status = isMatch ? '✅ MATCH' : '❌ NO MATCH';
      const matchText = isMatch ? ` (${matches.join(', ')})` : '';
      
      results += `<div class="pattern-result ${className}">${name}: ${status}${matchText}</div>`;
    });

    return results;
  }

  // Proceed with paste from debug popup
  function proceedWithDebugPaste(text, button) {
    // Find the target element (you might need to store this globally)
    const target = document.activeElement || document.querySelector('input, textarea, [contenteditable="true"]');
    if (target) {
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        target.value = text;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (target.contentEditable === 'true') {
        target.textContent = text;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    
    // Close the popup
    button.closest('#debug-paste-popup').remove();
  }

  // Make helper functions globally available
  window.copyToClipboard = copyToClipboard;
  window.showCopySuccessNotification = showCopySuccessNotification;
})();
