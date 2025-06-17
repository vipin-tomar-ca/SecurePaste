// Feature Gates System for Monetization Tiers
class FeatureGates {
  constructor() {
    this.tiers = {
      free: {
        maxDetections: 50,
        basicPatterns: true,
        llmDetection: false,
        customRules: false,
        enterpriseFeatures: false,
        historyDays: 1,
        maxWhitelistDomains: 5
      },
      pro: {
        maxDetections: 1000,
        basicPatterns: true,
        llmDetection: true,
        customRules: true,
        enterpriseFeatures: false,
        historyDays: 30,
        maxWhitelistDomains: 50,
        advancedAnalytics: true,
        prioritySupport: true
      },
      enterprise: {
        maxDetections: -1, // unlimited
        basicPatterns: true,
        llmDetection: true,
        customRules: true,
        enterpriseFeatures: true,
        historyDays: 365,
        maxWhitelistDomains: -1, // unlimited
        advancedAnalytics: true,
        prioritySupport: true,
        customEntityTraining: true,
        geofencing: true,
        centralizedManagement: true,
        scimProvisioning: true,
        webhookIntegration: true,
        complianceReporting: true
      }
    };
  }

  // Check if user has access to a specific feature
  hasFeature(userTier, featureName) {
    const tier = this.tiers[userTier] || this.tiers.free;
    return tier[featureName] === true;
  }

  // Get feature limits for user tier
  getLimit(userTier, limitName) {
    const tier = this.tiers[userTier] || this.tiers.free;
    return tier[limitName] || 0;
  }

  // Check if user has reached usage limits
  async checkUsageLimit(userTier, limitType) {
    const limit = this.getLimit(userTier, limitType);
    if (limit === -1) return { allowed: true }; // unlimited

    const currentUsage = await this.getCurrentUsage(limitType);
    const allowed = currentUsage < limit;
    
    return {
      allowed,
      current: currentUsage,
      limit,
      remaining: Math.max(0, limit - currentUsage)
    };
  }

  // Get current usage for a limit type
  async getCurrentUsage(limitType) {
    try {
      const key = `usage_${limitType}`;
      const stored = await chrome.storage.local.get([key]);
      const usage = stored[key] || { count: 0, resetDate: Date.now() };
      
      // Reset daily/monthly counters
      const now = Date.now();
      const resetInterval = this.getResetInterval(limitType);
      
      if (now - usage.resetDate > resetInterval) {
        usage.count = 0;
        usage.resetDate = now;
        await chrome.storage.local.set({ [key]: usage });
      }
      
      return usage.count;
    } catch (error) {
      console.error('Failed to get usage:', error);
      return 0;
    }
  }

  // Increment usage counter
  async incrementUsage(limitType) {
    try {
      const key = `usage_${limitType}`;
      const stored = await chrome.storage.local.get([key]);
      const usage = stored[key] || { count: 0, resetDate: Date.now() };
      
      usage.count++;
      await chrome.storage.local.set({ [key]: usage });
      
      return usage.count;
    } catch (error) {
      console.error('Failed to increment usage:', error);
      return 0;
    }
  }

  // Get reset interval for different limit types
  getResetInterval(limitType) {
    const intervals = {
      maxDetections: 24 * 60 * 60 * 1000, // 24 hours
      maxWhitelistDomains: 30 * 24 * 60 * 60 * 1000 // 30 days
    };
    return intervals[limitType] || 24 * 60 * 60 * 1000;
  }

  // Show upgrade prompt for blocked features
  showUpgradePrompt(featureName, currentTier) {
    const upgradeMessages = {
      llmDetection: {
        title: 'AI-Powered Detection',
        message: 'Get advanced AI analysis with contextual understanding of sensitive data.',
        cta: 'Upgrade to Pro'
      },
      customRules: {
        title: 'Custom Detection Rules',
        message: 'Create your own patterns and rules for organization-specific sensitive data.',
        cta: 'Upgrade to Pro'
      },
      enterpriseFeatures: {
        title: 'Enterprise Management',
        message: 'Get centralized control, team management, and compliance features.',
        cta: 'Contact Sales'
      },
      geofencing: {
        title: 'Location-Based Policies',
        message: 'Control extension behavior based on user location and region.',
        cta: 'Contact Sales'
      }
    };

    const config = upgradeMessages[featureName];
    if (!config) return;

    this.createUpgradeModal(config, currentTier);
  }

  // Create upgrade modal dialog
  createUpgradeModal(config, currentTier) {
    // Remove existing modal if present
    const existingModal = document.getElementById('upgrade-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'upgrade-modal';
    modal.innerHTML = `
      <div class="modal-backdrop" id="modal-backdrop">
        <div class="modal-content">
          <div class="modal-header">
            <h3>${config.title}</h3>
            <button class="modal-close" id="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p>${config.message}</p>
            <div class="tier-comparison">
              <div class="tier-card current">
                <h4>Current: ${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</h4>
                <div class="features">
                  ${this.getTierFeatures(currentTier).map(f => `<div class="feature">✓ ${f}</div>`).join('')}
                </div>
              </div>
              <div class="tier-card upgrade">
                <h4>Upgrade to ${currentTier === 'free' ? 'Pro' : 'Enterprise'}</h4>
                <div class="features">
                  ${this.getUpgradeFeatures(currentTier).map(f => `<div class="feature">✓ ${f}</div>`).join('')}
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" id="modal-cancel">Maybe Later</button>
            <button class="btn-primary" id="modal-upgrade">${config.cta}</button>
          </div>
        </div>
      </div>
    `;

    // Add modal styles
    const styles = `
      <style>
        #upgrade-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10000;
        }
        .modal-backdrop {
          background: rgba(0, 0, 0, 0.5);
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h3 {
          margin: 0;
          color: #495057;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6c757d;
        }
        .modal-body {
          padding: 20px;
        }
        .tier-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 20px;
        }
        .tier-card {
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 15px;
        }
        .tier-card.current {
          background: #f8f9fa;
        }
        .tier-card.upgrade {
          background: linear-gradient(135deg, #007bff, #6f42c1);
          color: white;
          border-color: #007bff;
        }
        .tier-card h4 {
          margin: 0 0 10px 0;
          font-size: 16px;
        }
        .feature {
          margin: 5px 0;
          font-size: 14px;
        }
        .modal-footer {
          padding: 20px;
          border-top: 1px solid #dee2e6;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .btn-secondary, .btn-primary {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .btn-secondary {
          background: #6c757d;
          color: white;
        }
        .btn-primary {
          background: #007bff;
          color: white;
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
    document.body.appendChild(modal);

    // Event handlers
    document.getElementById('modal-close').onclick = () => modal.remove();
    document.getElementById('modal-backdrop').onclick = (e) => {
      if (e.target.id === 'modal-backdrop') modal.remove();
    };
    document.getElementById('modal-cancel').onclick = () => modal.remove();
    document.getElementById('modal-upgrade').onclick = () => {
      this.handleUpgradeClick(currentTier);
      modal.remove();
    };
  }

  // Get current tier features
  getTierFeatures(tier) {
    const features = {
      free: [
        'Basic pattern detection',
        'Native browser alerts',
        '1 day history',
        '5 whitelisted domains'
      ],
      pro: [
        'AI-powered detection',
        'Custom rules',
        '30 day history',
        '50 whitelisted domains',
        'Advanced analytics'
      ],
      enterprise: [
        'Unlimited detections',
        'Custom entity training',
        'Centralized management',
        'Compliance reporting',
        'Priority support'
      ]
    };
    return features[tier] || features.free;
  }

  // Get upgrade tier features
  getUpgradeFeatures(currentTier) {
    if (currentTier === 'free') {
      return this.getTierFeatures('pro');
    } else {
      return this.getTierFeatures('enterprise');
    }
  }

  // Handle upgrade button click
  handleUpgradeClick(currentTier) {
    if (currentTier === 'free') {
      // Open Pro upgrade page
      chrome.tabs.create({
        url: 'https://guardpasteai.com/upgrade/pro'
      });
    } else {
      // Open Enterprise contact page
      chrome.tabs.create({
        url: 'https://guardpasteai.com/enterprise/contact'
      });
    }
  }

  // Check and enforce feature gates
  async enforceFeatureGate(userTier, featureName) {
    if (!this.hasFeature(userTier, featureName)) {
      this.showUpgradePrompt(featureName, userTier);
      return false;
    }
    return true;
  }

  // Check usage limits and show upgrade if needed
  async enforceUsageLimit(userTier, limitType, featureName) {
    const usage = await this.checkUsageLimit(userTier, limitType);
    
    if (!usage.allowed) {
      this.showUsageLimitPrompt(limitType, usage, userTier);
      return false;
    }
    
    // Increment usage counter
    await this.incrementUsage(limitType);
    return true;
  }

  // Show usage limit reached prompt
  showUsageLimitPrompt(limitType, usage, currentTier) {
    const limitMessages = {
      maxDetections: {
        title: 'Daily Detection Limit Reached',
        message: `You've used all ${usage.limit} daily detections. Upgrade for more capacity.`
      },
      maxWhitelistDomains: {
        title: 'Domain Limit Reached', 
        message: `You've reached the ${usage.limit} domain limit. Upgrade for more domains.`
      }
    };

    const config = limitMessages[limitType];
    if (config) {
      config.cta = currentTier === 'free' ? 'Upgrade to Pro' : 'Contact Sales';
      this.createUpgradeModal(config, currentTier);
    }
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FeatureGates;
} else {
  window.FeatureGates = FeatureGates;
}