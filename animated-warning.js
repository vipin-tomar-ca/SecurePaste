// Animated Sensitivity Warning System with Customizable Intensity Levels
class AnimatedWarning {
  constructor() {
    this.activeWarnings = new Map();
    this.intensityConfigs = {
      subtle: {
        duration: 2000,
        pulseSpeed: 1.5,
        glowIntensity: 0.3,
        shakeIntensity: 0,
        borderWidth: 2,
        colors: {
          primary: '#ffc107',
          secondary: '#fff3cd',
          text: '#856404'
        },
        animations: ['fade', 'glow']
      },
      moderate: {
        duration: 3000,
        pulseSpeed: 1.2,
        glowIntensity: 0.6,
        shakeIntensity: 2,
        borderWidth: 3,
        colors: {
          primary: '#fd7e14',
          secondary: '#fff0e6',
          text: '#6f2c02'
        },
        animations: ['fade', 'glow', 'pulse', 'shake']
      },
      aggressive: {
        duration: 5000,
        pulseSpeed: 0.8,
        glowIntensity: 1.0,
        shakeIntensity: 5,
        borderWidth: 4,
        colors: {
          primary: '#dc3545',
          secondary: '#f8d7da',
          text: '#721c24'
        },
        animations: ['fade', 'glow', 'pulse', 'shake', 'flash']
      },
      critical: {
        duration: 8000,
        pulseSpeed: 0.5,
        glowIntensity: 1.5,
        shakeIntensity: 8,
        borderWidth: 5,
        colors: {
          primary: '#6f42c1',
          secondary: '#e2d9f3',
          text: '#3d1a78'
        },
        animations: ['fade', 'glow', 'pulse', 'shake', 'flash', 'zoom']
      }
    };
    
    this.audioEnabled = true;
    this.soundEffects = {
      subtle: { frequency: 400, duration: 200 },
      moderate: { frequency: 300, duration: 400 },
      aggressive: { frequency: 200, duration: 600 },
      critical: { frequency: 150, duration: 800 }
    };
  }

  // Show animated warning with specified intensity
  async showWarning(target, options = {}) {
    const intensity = options.intensity || 'moderate';
    const config = this.intensityConfigs[intensity];
    const warningId = this.generateWarningId();
    
    // Create warning container
    const warningContainer = this.createWarningContainer(warningId, config, options);
    
    // Position warning relative to target
    this.positionWarning(warningContainer, target);
    
    // Add to DOM
    document.body.appendChild(warningContainer);
    
    // Store active warning
    this.activeWarnings.set(warningId, {
      container: warningContainer,
      target,
      config,
      startTime: Date.now()
    });
    
    // Start animations
    this.startAnimations(warningContainer, config, warningId);
    
    // Play sound effect
    if (this.audioEnabled) {
      this.playWarningSound(intensity);
    }
    
    // Auto-dismiss after duration
    setTimeout(() => {
      this.dismissWarning(warningId);
    }, config.duration);
    
    return warningId;
  }

  // Create warning container with styling
  createWarningContainer(warningId, config, options) {
    const container = document.createElement('div');
    container.id = `animated-warning-${warningId}`;
    container.className = 'animated-warning-container';
    
    container.innerHTML = `
      <div class="warning-content">
        <div class="warning-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L1 21h22L12 2zm0 3.4L19.6 19H4.4L12 5.4zm-1 8.6h2v2h-2v-2zm0-4h2v2h-2V10z"/>
          </svg>
        </div>
        <div class="warning-message">
          <div class="warning-title">${options.title || 'Sensitive Data Detected'}</div>
          <div class="warning-details">${options.message || 'Review before pasting'}</div>
        </div>
        <div class="warning-actions">
          <button class="warning-btn warning-btn-dismiss">Dismiss</button>
          ${options.showReview ? '<button class="warning-btn warning-btn-review">Review</button>' : ''}
        </div>
      </div>
    `;
    
    // Apply base styles
    this.applyWarningStyles(container, config);
    
    // Add event handlers
    this.attachWarningHandlers(container, warningId, options);
    
    return container;
  }

  // Apply dynamic styles based on intensity config
  applyWarningStyles(container, config) {
    const styles = `
      position: fixed;
      z-index: 10000;
      background: linear-gradient(135deg, ${config.colors.secondary}, ${config.colors.primary}20);
      border: ${config.borderWidth}px solid ${config.colors.primary};
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      backdrop-filter: blur(10px);
      padding: 16px;
      min-width: 300px;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: ${config.colors.text};
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;
    
    container.style.cssText = styles;
    
    // Add intensity-specific CSS classes
    container.classList.add(`warning-intensity-${Object.keys(this.intensityConfigs).find(key => 
      this.intensityConfigs[key] === config
    )}`);
  }

  // Position warning relative to target element
  positionWarning(container, target) {
    const targetRect = target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Calculate optimal position
    let top = targetRect.top + scrollTop - container.offsetHeight - 10;
    let left = targetRect.left + scrollLeft + (targetRect.width / 2) - 150;
    
    // Adjust if off-screen
    if (top < scrollTop + 10) {
      top = targetRect.bottom + scrollTop + 10;
    }
    
    if (left < 10) {
      left = 10;
    } else if (left + 300 > window.innerWidth - 10) {
      left = window.innerWidth - 310;
    }
    
    container.style.top = `${top}px`;
    container.style.left = `${left}px`;
  }

  // Start all animations for the warning
  startAnimations(container, config, warningId) {
    // Entrance animation
    requestAnimationFrame(() => {
      container.style.opacity = '1';
      container.style.transform = 'translateY(0) scale(1)';
    });
    
    // Apply intensity-specific animations
    config.animations.forEach(animation => {
      this.applyAnimation(container, animation, config, warningId);
    });
  }

  // Apply specific animation type
  applyAnimation(container, animationType, config, warningId) {
    switch (animationType) {
      case 'glow':
        this.applyGlowAnimation(container, config);
        break;
      case 'pulse':
        this.applyPulseAnimation(container, config);
        break;
      case 'shake':
        this.applyShakeAnimation(container, config);
        break;
      case 'flash':
        this.applyFlashAnimation(container, config);
        break;
      case 'zoom':
        this.applyZoomAnimation(container, config);
        break;
    }
  }

  // Glow animation
  applyGlowAnimation(container, config) {
    const glowKeyframes = `
      @keyframes warning-glow-${Date.now()} {
        0%, 100% { 
          box-shadow: 0 8px 32px rgba(0,0,0,0.3), 
                      0 0 0 0 ${config.colors.primary}40;
        }
        50% { 
          box-shadow: 0 8px 32px rgba(0,0,0,0.3), 
                      0 0 0 ${config.glowIntensity * 20}px ${config.colors.primary}20;
        }
      }
    `;
    
    this.injectKeyframes(glowKeyframes);
    container.style.animation += `, warning-glow-${Date.now()} ${config.pulseSpeed}s ease-in-out infinite`;
  }

  // Pulse animation
  applyPulseAnimation(container, config) {
    const pulseKeyframes = `
      @keyframes warning-pulse-${Date.now()} {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(${1 + config.glowIntensity * 0.1}); }
      }
    `;
    
    this.injectKeyframes(pulseKeyframes);
    container.style.animation += `, warning-pulse-${Date.now()} ${config.pulseSpeed}s ease-in-out infinite`;
  }

  // Shake animation
  applyShakeAnimation(container, config) {
    if (config.shakeIntensity > 0) {
      const shakeKeyframes = `
        @keyframes warning-shake-${Date.now()} {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-${config.shakeIntensity}px); }
          20% { transform: translateX(${config.shakeIntensity}px); }
          30% { transform: translateX(-${config.shakeIntensity * 0.8}px); }
          40% { transform: translateX(${config.shakeIntensity * 0.8}px); }
          50% { transform: translateX(-${config.shakeIntensity * 0.5}px); }
          60% { transform: translateX(${config.shakeIntensity * 0.5}px); }
          70% { transform: translateX(-${config.shakeIntensity * 0.2}px); }
          80% { transform: translateX(${config.shakeIntensity * 0.2}px); }
          90% { transform: translateX(0); }
        }
      `;
      
      this.injectKeyframes(shakeKeyframes);
      container.style.animation += `, warning-shake-${Date.now()} 0.6s ease-in-out`;
    }
  }

  // Flash animation
  applyFlashAnimation(container, config) {
    const flashKeyframes = `
      @keyframes warning-flash-${Date.now()} {
        0%, 100% { background-color: transparent; }
        50% { background-color: ${config.colors.primary}30; }
      }
    `;
    
    this.injectKeyframes(flashKeyframes);
    container.style.animation += `, warning-flash-${Date.now()} 0.3s ease-in-out infinite`;
  }

  // Zoom animation
  applyZoomAnimation(container, config) {
    const zoomKeyframes = `
      @keyframes warning-zoom-${Date.now()} {
        0%, 100% { transform: scale(1); }
        25% { transform: scale(1.05); }
        75% { transform: scale(0.98); }
      }
    `;
    
    this.injectKeyframes(zoomKeyframes);
    container.style.animation += `, warning-zoom-${Date.now()} ${config.pulseSpeed * 2}s ease-in-out infinite`;
  }

  // Inject CSS keyframes
  injectKeyframes(keyframes) {
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
    
    // Clean up after animation
    setTimeout(() => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 10000);
  }

  // Play warning sound effect
  playWarningSound(intensity) {
    if (!this.audioEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      const soundConfig = this.soundEffects[intensity];
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(soundConfig.frequency, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + soundConfig.duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + soundConfig.duration / 1000);
    } catch (error) {
      console.log('Audio playback not available:', error);
    }
  }

  // Attach event handlers to warning
  attachWarningHandlers(container, warningId, options) {
    const dismissBtn = container.querySelector('.warning-btn-dismiss');
    const reviewBtn = container.querySelector('.warning-btn-review');
    
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        this.dismissWarning(warningId);
        if (options.onDismiss) options.onDismiss();
      });
    }
    
    if (reviewBtn) {
      reviewBtn.addEventListener('click', () => {
        this.dismissWarning(warningId);
        if (options.onReview) options.onReview();
      });
    }
    
    // Auto-dismiss on click outside
    container.addEventListener('click', (e) => {
      if (e.target === container) {
        this.dismissWarning(warningId);
      }
    });
  }

  // Dismiss warning with exit animation
  dismissWarning(warningId) {
    const warning = this.activeWarnings.get(warningId);
    if (!warning) return;
    
    const { container } = warning;
    
    // Exit animation
    container.style.opacity = '0';
    container.style.transform = 'translateY(-10px) scale(0.95)';
    container.style.transition = 'all 0.3s ease-out';
    
    setTimeout(() => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
      this.activeWarnings.delete(warningId);
    }, 300);
  }

  // Show progressive warning that escalates intensity
  showProgressiveWarning(target, detectedPatterns, options = {}) {
    const riskLevel = this.calculateRiskLevel(detectedPatterns);
    let intensity = 'subtle';
    
    if (riskLevel >= 0.8) intensity = 'critical';
    else if (riskLevel >= 0.6) intensity = 'aggressive';
    else if (riskLevel >= 0.4) intensity = 'moderate';
    
    return this.showWarning(target, {
      ...options,
      intensity,
      title: this.getWarningTitle(intensity, detectedPatterns),
      message: this.getWarningMessage(detectedPatterns)
    });
  }

  // Calculate risk level from detected patterns
  calculateRiskLevel(patterns) {
    if (!patterns || patterns.length === 0) return 0;
    
    const highRiskTypes = ['ssh_key', 'aws_access_key', 'stripe_key', 'jwt_token'];
    const mediumRiskTypes = ['email', 'phone', 'ip_address'];
    
    let riskScore = 0;
    
    patterns.forEach(pattern => {
      if (highRiskTypes.includes(pattern.type)) {
        riskScore += 0.3;
      } else if (mediumRiskTypes.includes(pattern.type)) {
        riskScore += 0.2;
      } else {
        riskScore += 0.1;
      }
    });
    
    return Math.min(riskScore, 1.0);
  }

  // Get appropriate warning title
  getWarningTitle(intensity, patterns) {
    const titles = {
      subtle: 'Information Detected',
      moderate: 'Sensitive Data Warning',
      aggressive: 'High Risk Content Detected',
      critical: 'CRITICAL: Confidential Data Found'
    };
    
    return titles[intensity];
  }

  // Get warning message based on patterns
  getWarningMessage(patterns) {
    if (!patterns || patterns.length === 0) {
      return 'Please review the content before pasting.';
    }
    
    const types = patterns.map(p => p.label || p.type).slice(0, 3);
    const message = `Detected: ${types.join(', ')}`;
    
    if (patterns.length > 3) {
      message += ` and ${patterns.length - 3} more`;
    }
    
    return message;
  }

  // Generate unique warning ID
  generateWarningId() {
    return `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Configure intensity settings
  configureIntensity(intensityLevel, customConfig) {
    if (this.intensityConfigs[intensityLevel]) {
      this.intensityConfigs[intensityLevel] = {
        ...this.intensityConfigs[intensityLevel],
        ...customConfig
      };
    }
  }

  // Enable/disable audio
  setAudioEnabled(enabled) {
    this.audioEnabled = enabled;
  }

  // Clear all active warnings
  clearAllWarnings() {
    this.activeWarnings.forEach((warning, warningId) => {
      this.dismissWarning(warningId);
    });
  }

  // Get warning statistics
  getWarningStats() {
    return {
      activeCount: this.activeWarnings.size,
      activeWarnings: Array.from(this.activeWarnings.entries()).map(([id, warning]) => ({
        id,
        startTime: warning.startTime,
        duration: Date.now() - warning.startTime,
        intensity: Object.keys(this.intensityConfigs).find(key => 
          this.intensityConfigs[key] === warning.config
        )
      }))
    };
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimatedWarning;
} else {
  window.AnimatedWarning = AnimatedWarning;
}