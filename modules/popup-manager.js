// Popup management module
(function() {
  'use strict';

  // Simple debug popup that will definitely work
  function showSimpleDebugPopup(pastedText, target) {
    console.log('GuardPasteAI: Showing debug popup for:', pastedText);
    
    // Remove existing popup
    const existingPopup = document.getElementById('simple-debug-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Test patterns first
    const detectedPatterns = window.PatternDetector ? 
      window.PatternDetector.testPatternsSimple(pastedText) : 
      testPatternsSimple(pastedText);
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
    style.textContent = getPopupStyles();
    document.head.appendChild(style);

    // Add to page
    document.body.appendChild(popup);

    // Add event listeners
    setupPopupEventListeners(popup, pastedText, target);
  }

  // Get popup styles
  function getPopupStyles() {
    return `
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
        border-radius: 50%;
        transition: background-color 0.2s;
      }

      .close-button:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .guardpaste-body {
        padding: 24px;
      }

      .warning-section {
        margin-bottom: 20px;
        padding: 16px;
        background: #FEF3C7;
        border-radius: 8px;
        border-left: 4px solid #F59E0B;
      }

      .warning-title {
        margin: 0 0 12px 0;
        color: #92400E;
        font-size: 16px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .warning-icon {
        font-size: 18px;
      }

      .pattern-list {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .pattern-item {
        margin-bottom: 8px;
        padding: 8px 12px;
        background: rgba(245, 158, 11, 0.1);
        border-radius: 6px;
        font-size: 14px;
      }

      .pattern-name {
        color: #92400E;
        font-weight: 600;
      }

      .pattern-value {
        color: #B45309;
        font-family: monospace;
        word-break: break-all;
      }

      .content-section {
        margin-bottom: 20px;
      }

      .content-label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #374151;
        font-size: 14px;
      }

      .content-textarea {
        width: 100%;
        min-height: 120px;
        padding: 12px;
        border: 2px solid #E5E7EB;
        border-radius: 8px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 14px;
        line-height: 1.5;
        resize: vertical;
        box-sizing: border-box;
        transition: border-color 0.2s;
      }

      .content-textarea:focus {
        outline: none;
        border-color: #3730A3;
        box-shadow: 0 0 0 3px rgba(55, 48, 163, 0.1);
      }

      .action-buttons {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }

      .action-btn {
        flex: 1;
        min-width: 120px;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
        text-decoration: none;
        color: white;
      }

      .highlight-btn {
        background: #3B82F6;
      }

      .highlight-btn:hover {
        background: #2563EB;
        transform: translateY(-1px);
      }

      .auto-replace-btn {
        background: #10B981;
      }

      .auto-replace-btn:hover {
        background: #059669;
        transform: translateY(-1px);
      }

      .clear-btn {
        background: #EF4444;
      }

      .clear-btn:hover {
        background: #DC2626;
        transform: translateY(-1px);
      }

      .btn-icon {
        font-size: 16px;
      }

      .final-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        flex-wrap: wrap;
      }

      .final-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 140px;
      }

      .cancel-btn {
        background: #F3F4F6;
        color: #374151;
        border: 2px solid #D1D5DB;
      }

      .cancel-btn:hover {
        background: #E5E7EB;
        border-color: #9CA3AF;
      }

      .paste-edited-btn {
        background: #3730A3;
        color: white;
      }

      .paste-edited-btn:hover {
        background: #312E81;
        transform: translateY(-1px);
      }

      .paste-original-btn {
        background: #059669;
        color: white;
      }

      .paste-original-btn:hover {
        background: #047857;
        transform: translateY(-1px);
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

      @media (max-width: 640px) {
        .guardpaste-modal {
          width: 95%;
          max-height: 90vh;
        }
        
        .action-buttons {
          flex-direction: column;
        }
        
        .final-actions {
          flex-direction: column;
        }
        
        .final-btn {
          min-width: auto;
        }
      }
    `;
  }

  // Setup popup event listeners
  function setupPopupEventListeners(popup, pastedText, target) {
    // Close button
    const closeBtn = popup.querySelector('#close-popup-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        popup.remove();
      });
    }

    // Cancel button
    const cancelBtn = popup.querySelector('#cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        popup.remove();
      });
    }

    // Highlight button
    const highlightBtn = popup.querySelector('#highlight-btn');
    if (highlightBtn) {
      highlightBtn.addEventListener('click', () => {
        highlightSensitiveData();
      });
    }

    // Auto-replace button
    const autoReplaceBtn = popup.querySelector('#auto-replace-btn');
    if (autoReplaceBtn) {
      autoReplaceBtn.addEventListener('click', () => {
        autoReplaceInEditor();
      });
    }

    // Clear button
    const clearBtn = popup.querySelector('#clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        clearSensitiveData();
      });
    }

    // Copy edited button
    const pasteEditedBtn = popup.querySelector('#paste-edited-btn');
    if (pasteEditedBtn) {
      pasteEditedBtn.addEventListener('click', () => {
        proceedWithEditedPaste();
      });
    }

    // Copy original button
    const pasteOriginalBtn = popup.querySelector('#paste-original-btn');
    if (pasteOriginalBtn) {
      pasteOriginalBtn.addEventListener('click', () => {
        proceedWithPaste();
      });
    }

    // Escape key handler
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        popup.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Click outside to close
    popup.addEventListener('click', (event) => {
      if (event.target === popup) {
        popup.remove();
      }
    });
  }

  // Fallback pattern testing function
  function testPatternsSimple(text) {
    const patterns = [
      {
        name: 'Credit Card',
        regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/
      },
      {
        name: 'SSN',
        regex: /\b\d{3}-\d{2}-\d{4}\b/
      },
      {
        name: 'Email',
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
      },
      {
        name: 'Phone',
        regex: /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/
      },
      {
        name: 'API Key',
        regex: /\b(?:sk-|pk_|api_key|apikey)[a-zA-Z0-9]{20,}\b/i
      }
    ];

    const detectedPatterns = [];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern.regex);
      if (matches) {
        detectedPatterns.push({
          name: pattern.name,
          matches: matches.slice(0, 5),
          count: matches.length
        });
      }
    }

    return detectedPatterns;
  }

  // Export functions to global scope
  window.PopupManager = {
    showSimpleDebugPopup,
    getPopupStyles,
    setupPopupEventListeners
  };

})(); 