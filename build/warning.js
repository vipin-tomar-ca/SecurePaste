// Warning dialog functionality
(function() {
  'use strict';

  let detectedPatterns = [];
  let clipboardText = '';

  // Initialize warning dialog
  function init() {
    setupEventListeners();
    
    // Get data from parent window if available
    if (window.opener && window.opener.warningData) {
      displayWarning(window.opener.warningData.patterns, window.opener.warningData.text);
    }
  }

  // Setup event listeners
  function setupEventListeners() {
    const cancelBtn = document.getElementById('cancelBtn');
    const proceedBtn = document.getElementById('proceedBtn');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', handleCancel);
    }

    if (proceedBtn) {
      proceedBtn.addEventListener('click', handleProceed);
    }

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    });

    // Handle click outside dialog
    document.addEventListener('click', (e) => {
      if (e.target === document.body) {
        handleCancel();
      }
    });
  }

  // Display warning with detected patterns
  function displayWarning(patterns, text) {
    detectedPatterns = patterns || [];
    clipboardText = text || '';

    updateDetectedTypes();
    updatePreviewContent();
  }

  // Update detected types display
  function updateDetectedTypes() {
    const container = document.getElementById('detectedTypes');
    if (!container) return;

    if (detectedPatterns.length === 0) {
      container.innerHTML = '<p>No specific patterns detected, but content flagged for review.</p>';
      return;
    }

    const typeIcons = {
      creditCard: '💳',
      ssn: '🆔',
      email: '📧',
      phone: '📞',
      bankAccount: '🏦',
      driversLicense: '🚗',
      ipAddress: '🌐',
      apiKey: '🔑',
      bitcoin: '₿'
    };

    container.innerHTML = `
      <h3>Detected Sensitive Information:</h3>
      <ul class="detected-list">
        ${detectedPatterns.map(pattern => `
          <li class="detected-item">
            <span class="detected-item-icon">${typeIcons[pattern.type] || '⚠️'}</span>
            <div class="detected-item-info">
              <div class="detected-item-name">${pattern.name}</div>
              <div class="detected-item-count">${pattern.count} instance${pattern.count > 1 ? 's' : ''} found</div>
            </div>
          </li>
        `).join('')}
      </ul>
    `;
  }

  // Update preview content
  function updatePreviewContent() {
    const container = document.getElementById('previewContent');
    if (!container) return;

    if (!clipboardText) {
      container.textContent = 'No content to preview';
      return;
    }

    // Truncate long content
    const maxLength = 500;
    const displayText = clipboardText.length > maxLength 
      ? clipboardText.substring(0, maxLength) + '...'
      : clipboardText;

    container.textContent = displayText;
  }

  // Handle cancel action
  function handleCancel() {
    // Send message to parent about cancellation
    if (window.opener) {
      window.opener.postMessage({
        action: 'warningCanceled'
      }, '*');
    }

    // Close dialog
    closeDialog();
  }

  // Handle proceed action
  function handleProceed() {
    // Send message to parent about proceeding
    if (window.opener) {
      window.opener.postMessage({
        action: 'warningProceeded',
        text: clipboardText
      }, '*');
    }

    // Close dialog
    closeDialog();
  }

  // Close dialog
  function closeDialog() {
    // Add fade out animation
    document.body.style.opacity = '0';
    document.body.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      if (window.opener) {
        window.close();
      } else {
        // If opened as iframe or embedded, hide the container
        const container = document.querySelector('.warning-container');
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }
    }, 200);
  }

  // Public API for external control
  window.SensitiveDataWarning = {
    show: displayWarning,
    hide: closeDialog
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
