// Enterprise Admin Portal Backend Logic
class EnterpriseAdmin {
  constructor() {
    this.baseUrl = 'https://api.guardpasteai.com'; // Production endpoint
    this.websocketUrl = 'wss://ws.guardpasteai.com';
    this.socket = null;
  }

  // Initialize real-time monitoring
  async initializeMonitoring(orgId, authToken) {
    try {
      this.socket = new WebSocket(`${this.websocketUrl}/org/${orgId}?token=${authToken}`);
      
      this.socket.onopen = () => {
        console.log('Enterprise monitoring connected');
      };

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleRealTimeEvent(data);
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Fallback to polling
        this.startPolling(orgId, authToken);
      };
    } catch (error) {
      console.error('Failed to initialize monitoring:', error);
    }
  }

  // Handle real-time security events
  handleRealTimeEvent(data) {
    switch (data.type) {
      case 'paste_prevention':
        this.sendSlackAlert(data);
        this.updateDashboard(data);
        break;
      case 'policy_violation':
        this.escalateSecurityIncident(data);
        break;
      case 'user_added':
        this.syncUserPermissions(data);
        break;
    }
  }

  // SCIM User Provisioning
  async provisionUser(userData, orgId) {
    try {
      const response = await fetch(`${this.baseUrl}/scim/v2/Users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getOrgToken(orgId)}`
        },
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: userData.email,
          name: {
            givenName: userData.firstName,
            familyName: userData.lastName
          },
          emails: [{
            value: userData.email,
            primary: true
          }],
          active: true,
          groups: userData.groups || [],
          'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
            department: userData.department,
            manager: userData.manager
          }
        })
      });

      if (!response.ok) {
        throw new Error(`SCIM provisioning failed: ${response.status}`);
      }

      const user = await response.json();
      
      // Deploy extension policy to new user
      await this.deployUserPolicy(user.id, orgId);
      
      return user;
    } catch (error) {
      console.error('User provisioning failed:', error);
      throw error;
    }
  }

  // Deploy Chrome Policy
  async deployUserPolicy(userId, orgId) {
    const policy = await this.buildUserPolicy(userId, orgId);
    
    try {
      // Deploy via Chrome Enterprise API
      const response = await fetch(`${this.baseUrl}/chrome/policy/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getOrgToken(orgId)}`
        },
        body: JSON.stringify({
          userId,
          policy,
          targetOrgUnit: await this.getUserOrgUnit(userId)
        })
      });

      if (!response.ok) {
        throw new Error(`Policy deployment failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Policy deployment failed:', error);
      throw error;
    }
  }

  // Build user-specific policy
  async buildUserPolicy(userId, orgId) {
    const userProfile = await this.getUserProfile(userId);
    const orgSettings = await this.getOrgSettings(orgId);
    
    return {
      ExtensionInstallForcelist: [`${chrome.runtime.id};https://clients2.google.com/service/update2/crx`],
      ExtensionSettings: {
        [chrome.runtime.id]: {
          installation_mode: 'force_installed',
          runtime_blocked_hosts: [],
          runtime_allowed_hosts: ['*://*/*'],
          blocked_permissions: [],
          settings: {
            enterpriseMode: true,
            orgId: orgId,
            userRole: userProfile.role,
            department: userProfile.department,
            detectionLevel: this.calculateDetectionLevel(userProfile, orgSettings),
            webhookUrl: orgSettings.webhookUrl,
            customPatterns: orgSettings.customPatterns || [],
            geofencing: orgSettings.geofencing || {},
            allowedDomains: this.getAllowedDomains(userProfile, orgSettings),
            blockedDomains: orgSettings.blockedDomains || []
          }
        }
      }
    };
  }

  // Geofencing implementation
  async checkGeofencing(location, orgSettings) {
    if (!orgSettings.geofencing?.enabled) return true;
    
    const allowedRegions = orgSettings.geofencing.allowedRegions || [];
    const blockedRegions = orgSettings.geofencing.blockedRegions || [];
    
    // Check if location is in blocked regions
    for (const region of blockedRegions) {
      if (this.isLocationInRegion(location, region)) {
        return false;
      }
    }
    
    // Check if location is in allowed regions (if specified)
    if (allowedRegions.length > 0) {
      return allowedRegions.some(region => this.isLocationInRegion(location, region));
    }
    
    return true;
  }

  // Custom entity training
  async trainCustomEntities(trainingData, orgId) {
    try {
      const response = await fetch(`${this.baseUrl}/ml/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getOrgToken(orgId)}`
        },
        body: JSON.stringify({
          orgId,
          trainingData: trainingData.map(item => ({
            text: item.text,
            entities: item.entities,
            sensitivity: item.sensitivity
          })),
          modelType: 'custom_entity_recognition'
        })
      });

      if (!response.ok) {
        throw new Error(`Model training failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Deploy trained model to all organization users
      await this.deployCustomModel(result.modelId, orgId);
      
      return result;
    } catch (error) {
      console.error('Custom entity training failed:', error);
      throw error;
    }
  }

  // Webhook integration for Slack/Teams
  async sendSlackAlert(eventData) {
    const webhookUrl = await this.getOrgWebhook(eventData.orgId);
    if (!webhookUrl) return;

    const alert = {
      text: `🚨 Sensitive Data Prevention Alert`,
      attachments: [{
        color: this.getSeverityColor(eventData.severity),
        fields: [
          {
            title: 'User',
            value: eventData.user.email,
            short: true
          },
          {
            title: 'Domain',
            value: eventData.domain,
            short: true
          },
          {
            title: 'Data Type',
            value: eventData.detectedTypes.join(', '),
            short: true
          },
          {
            title: 'Severity',
            value: eventData.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Action Taken',
            value: eventData.action,
            short: false
          }
        ],
        footer: 'GuardPasteAI',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  // Compliance reporting
  async generateComplianceReport(orgId, reportType, startDate, endDate) {
    try {
      const response = await fetch(`${this.baseUrl}/compliance/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getOrgToken(orgId)}`
        },
        body: JSON.stringify({
          orgId,
          reportType, // 'GDPR', 'HIPAA', 'SOX', 'PCI'
          startDate,
          endDate,
          includeUserDetails: reportType === 'GDPR',
          includeDataClassification: true
        })
      });

      if (!response.ok) {
        throw new Error(`Report generation failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Compliance report generation failed:', error);
      throw error;
    }
  }

  // Data fingerprinting for document matching
  async createDocumentFingerprint(documentContent, orgId) {
    try {
      const response = await fetch(`${this.baseUrl}/fingerprint/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getOrgToken(orgId)}`
        },
        body: JSON.stringify({
          orgId,
          content: documentContent,
          documentType: this.detectDocumentType(documentContent),
          sensitivity: this.assessDocumentSensitivity(documentContent)
        })
      });

      if (!response.ok) {
        throw new Error(`Fingerprint creation failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Document fingerprinting failed:', error);
      throw error;
    }
  }

  // Utility methods
  calculateDetectionLevel(userProfile, orgSettings) {
    const baseLevel = orgSettings.defaultDetectionLevel || 'medium';
    
    // Increase detection for high-risk roles
    if (userProfile.role.includes('admin') || userProfile.role.includes('executive')) {
      return 'high';
    }
    
    // Increase detection for sensitive departments
    if (['finance', 'legal', 'hr'].includes(userProfile.department.toLowerCase())) {
      return 'high';
    }
    
    return baseLevel;
  }

  getSeverityColor(severity) {
    const colors = {
      low: '#36a64f',
      medium: '#ffeb3b',
      high: '#f44336',
      critical: '#9c27b0'
    };
    return colors[severity] || colors.medium;
  }

  async getOrgToken(orgId) {
    // In production, this would retrieve from secure storage
    const stored = await chrome.storage.local.get([`orgToken_${orgId}`]);
    return stored[`orgToken_${orgId}`];
  }

  isLocationInRegion(location, region) {
    // Implement geofencing logic based on lat/lng bounds
    const { lat, lng } = location;
    const { bounds } = region;
    
    return lat >= bounds.south && lat <= bounds.north &&
           lng >= bounds.west && lng <= bounds.east;
  }

  detectDocumentType(content) {
    // Simple document type detection
    if (content.includes('CONFIDENTIAL') || content.includes('PROPRIETARY')) {
      return 'confidential';
    }
    if (content.includes('@') && content.includes('password')) {
      return 'credentials';
    }
    return 'general';
  }

  assessDocumentSensitivity(content) {
    // Basic sensitivity assessment
    const sensitiveTerms = ['social security', 'credit card', 'api key', 'password'];
    const foundTerms = sensitiveTerms.filter(term => 
      content.toLowerCase().includes(term)
    );
    
    if (foundTerms.length >= 3) return 'high';
    if (foundTerms.length >= 1) return 'medium';
    return 'low';
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnterpriseAdmin;
} else {
  window.EnterpriseAdmin = EnterpriseAdmin;
}