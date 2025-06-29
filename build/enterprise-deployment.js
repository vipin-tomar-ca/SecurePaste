// Enterprise Deployment Configuration System
class EnterpriseDeployment {
  constructor() {
    this.deploymentEndpoint = 'https://api.guardpasteai.com/enterprise';
    this.configurationCache = new Map();
  }

  // SCIM 2.0 provisioning implementation
  async provisionUsers(users, orgId) {
    const results = [];
    
    for (const user of users) {
      try {
        const scimUser = this.createSCIMUser(user);
        const response = await this.createSCIMResource('Users', scimUser, orgId);
        
        if (response.success) {
          // Deploy user-specific configuration
          await this.deployUserConfiguration(response.user.id, user, orgId);
          results.push({ userId: user.email, status: 'success', scimId: response.user.id });
        } else {
          results.push({ userId: user.email, status: 'failed', error: response.error });
        }
      } catch (error) {
        results.push({ userId: user.email, status: 'error', error: error.message });
      }
    }
    
    return results;
  }

  // Create SCIM 2.0 compliant user object
  createSCIMUser(user) {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      userName: user.email,
      name: {
        givenName: user.firstName,
        familyName: user.lastName,
        formatted: `${user.firstName} ${user.lastName}`
      },
      emails: [{
        value: user.email,
        type: 'work',
        primary: true
      }],
      active: true,
      groups: user.groups || [],
      'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
        employeeNumber: user.employeeId,
        department: user.department,
        manager: user.managerId,
        organization: user.organization
      },
      'urn:ietf:params:scim:schemas:extension:guardpaste:1.0:User': {
        riskLevel: user.riskLevel || 'medium',
        industry: user.industry || 'general',
        customRules: user.customRules || [],
        geofencing: user.geofencing || {}
      }
    };
  }

  // Deploy user-specific configuration via Chrome Policy
  async deployUserConfiguration(userId, user, orgId) {
    const policy = await this.buildChromePolicy(user, orgId);
    
    try {
      const response = await fetch(`${this.deploymentEndpoint}/chrome/policy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getOrgToken(orgId)}`
        },
        body: JSON.stringify({
          userId,
          orgId,
          policy,
          targetOrgUnit: user.orgUnit || 'GuardPasteAI Users'
        })
      });

      if (!response.ok) {
        throw new Error(`Policy deployment failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Chrome policy deployment failed:', error);
      throw error;
    }
  }

  // Build Chrome Enterprise policy configuration
  async buildChromePolicy(user, orgId) {
    const orgSettings = await this.getOrganizationSettings(orgId);
    
    return {
      ExtensionInstallForcelist: [
        `${chrome.runtime.id};https://clients2.google.com/service/update2/crx`
      ],
      ExtensionSettings: {
        [chrome.runtime.id]: {
          installation_mode: 'force_installed',
          update_url: 'https://clients2.google.com/service/update2/crx',
          runtime_blocked_hosts: orgSettings.blockedDomains || [],
          runtime_allowed_hosts: ['*://*/*'],
          blocked_permissions: [],
          settings: {
            // Core configuration
            enterpriseMode: true,
            organizationId: orgId,
            userId: user.email,
            
            // User-specific settings
            userProfile: {
              role: user.role,
              department: user.department,
              riskLevel: user.riskLevel || 'medium',
              industry: user.industry || 'general'
            },
            
            // Detection configuration
            detection: {
              enabled: true,
              sensitivity: this.calculateDetectionSensitivity(user, orgSettings),
              llmEnabled: orgSettings.llmEnabled && (user.tier === 'pro' || user.tier === 'enterprise'),
              customPatterns: [...(orgSettings.customPatterns || []), ...(user.customRules || [])]
            },
            
            // Compliance settings
            compliance: {
              framework: orgSettings.complianceFramework || 'general',
              dataResidency: orgSettings.dataResidency || 'us',
              auditLevel: user.auditLevel || 'standard',
              retentionDays: orgSettings.logRetentionDays || 90
            },
            
            // Network configuration
            network: {
              webhookUrl: orgSettings.webhookUrl,
              reportingEndpoint: orgSettings.reportingEndpoint,
              proxySettings: orgSettings.proxySettings || null
            },
            
            // Geofencing configuration
            geofencing: {
              enabled: orgSettings.geofencingEnabled || false,
              allowedRegions: orgSettings.allowedRegions || [],
              blockedRegions: orgSettings.blockedRegions || [],
              enforcementMode: orgSettings.geofencingMode || 'warn'
            },
            
            // Feature flags based on user tier
            features: this.buildFeatureFlags(user, orgSettings)
          }
        }
      },
      
      // Additional Chrome policies for security
      ExtensionAllowedTypes: ['extension'],
      DeveloperToolsAvailability: 2, // Disable for extension pages
      SafeBrowsingEnabled: true,
      SafeBrowsingExtendedReportingEnabled: true
    };
  }

  // Calculate detection sensitivity based on user profile
  calculateDetectionSensitivity(user, orgSettings) {
    let sensitivity = orgSettings.defaultSensitivity || 'medium';
    
    // Increase for high-risk roles
    const highRiskRoles = ['admin', 'executive', 'finance', 'legal', 'hr'];
    if (highRiskRoles.some(role => user.role.toLowerCase().includes(role))) {
      sensitivity = 'high';
    }
    
    // Increase for sensitive departments
    const sensitiveDepts = ['finance', 'legal', 'human resources', 'executive'];
    if (sensitiveDepts.some(dept => user.department.toLowerCase().includes(dept))) {
      sensitivity = 'high';
    }
    
    // Consider industry-specific requirements
    if (user.industry === 'healthcare' || user.industry === 'finance') {
      sensitivity = 'high';
    }
    
    return sensitivity;
  }

  // Build feature flags based on user tier and organization settings
  buildFeatureFlags(user, orgSettings) {
    const tier = user.tier || 'free';
    
    return {
      // Basic features (all tiers)
      basicDetection: true,
      nativeAlerts: true,
      
      // Pro features
      llmDetection: tier !== 'free' && orgSettings.llmEnabled,
      customRules: tier !== 'free',
      advancedAnalytics: tier !== 'free',
      
      // Enterprise features
      centralizedManagement: tier === 'enterprise',
      scimProvisioning: tier === 'enterprise',
      webhookIntegration: tier === 'enterprise',
      geofencing: tier === 'enterprise' && orgSettings.geofencingEnabled,
      complianceReporting: tier === 'enterprise',
      customEntityTraining: tier === 'enterprise',
      
      // Usage limits
      maxDetectionsPerDay: this.getUsageLimit(tier, 'detections'),
      maxWhitelistDomains: this.getUsageLimit(tier, 'domains'),
      historyRetentionDays: this.getUsageLimit(tier, 'history')
    };
  }

  // Get usage limits by tier
  getUsageLimit(tier, limitType) {
    const limits = {
      free: { detections: 50, domains: 5, history: 1 },
      pro: { detections: 1000, domains: 50, history: 30 },
      enterprise: { detections: -1, domains: -1, history: 365 }
    };
    
    return limits[tier]?.[limitType] || limits.free[limitType];
  }

  // Deploy emergency policy updates
  async deployEmergencyUpdate(updateConfig, targetUsers = null) {
    try {
      const deployment = {
        updateType: 'emergency',
        timestamp: Date.now(),
        config: updateConfig,
        targets: targetUsers || 'all',
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };

      // Deploy via Chrome Enterprise API
      const response = await fetch(`${this.deploymentEndpoint}/emergency-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getOrgToken(updateConfig.orgId)}`
        },
        body: JSON.stringify(deployment)
      });

      if (!response.ok) {
        throw new Error(`Emergency update deployment failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Log emergency deployment
      console.log(`Emergency update deployed to ${result.affectedUsers} users`);
      
      return result;
    } catch (error) {
      console.error('Emergency update deployment failed:', error);
      throw error;
    }
  }

  // Generate deployment health report
  async generateDeploymentReport(orgId, timeRange = '7d') {
    try {
      const response = await fetch(`${this.deploymentEndpoint}/health-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getOrgToken(orgId)}`
        },
        body: JSON.stringify({
          orgId,
          timeRange,
          includeMetrics: ['deployment_success', 'policy_compliance', 'user_activity', 'threat_detections']
        })
      });

      if (!response.ok) {
        throw new Error(`Report generation failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Deployment report generation failed:', error);
      throw error;
    }
  }

  // Terraform deployment script generator
  generateTerraformConfig(orgConfig) {
    return `
# GuardPasteAI Enterprise Deployment
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Chrome Enterprise enrollment
resource "google_chrome_policy" "guardpasteai_policy" {
  org_unit_id = var.org_unit_id
  
  policies {
    schema_name = "chrome.users.ExtensionInstallForcelist"
    policy_value = jsonencode([
      "${chrome.runtime.id};https://clients2.google.com/service/update2/crx"
    ])
  }
  
  policies {
    schema_name = "chrome.users.ExtensionSettings"
    policy_value = jsonencode({
      "${chrome.runtime.id}" = {
        installation_mode = "force_installed"
        settings = ${JSON.stringify(orgConfig.defaultSettings, null, 8)}
      }
    })
  }
}

# Variables
variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
}

variable "region" {
  description = "Deployment region"
  type        = string
  default     = "${orgConfig.dataResidency || 'us-central1'}"
}

variable "org_unit_id" {
  description = "Chrome Enterprise OU ID"
  type        = string
}

# Outputs
output "policy_id" {
  value = google_chrome_policy.guardpasteai_policy.id
}

output "deployment_status" {
  value = "GuardPasteAI Enterprise deployed successfully"
}
`;
  }

  // PowerShell deployment module
  generatePowerShellModule(orgConfig) {
    return `
# GuardPasteAI Enterprise Deployment Module
param(
    [Parameter(Mandatory=$true)]
    [string]$OrganizationId,
    
    [Parameter(Mandatory=$false)]
    [string]$ConfigurationPath = "./guardpaste-config.json"
)

# Import required modules
Import-Module Microsoft.Graph.Groups
Import-Module Microsoft.Graph.Identity.DirectoryManagement

function Deploy-GuardPasteAI {
    param(
        [string]$OrgId,
        [hashtable]$Configuration
    )
    
    Write-Host "Deploying GuardPasteAI Enterprise for organization: $OrgId"
    
    # Create Chrome policy
    $policySettings = @{
        ExtensionInstallForcelist = @(
            "${chrome.runtime.id};https://clients2.google.com/service/update2/crx"
        )
        ExtensionSettings = @{
            "${chrome.runtime.id}" = @{
                installation_mode = "force_installed"
                settings = $Configuration
            }
        }
    }
    
    # Deploy via Intune/ADMX
    Set-ChromeEnterprisePolicy -Settings $policySettings
    
    Write-Host "Deployment completed successfully"
}

# Load configuration
$config = Get-Content $ConfigurationPath | ConvertFrom-Json

# Execute deployment
Deploy-GuardPasteAI -OrgId $OrganizationId -Configuration $config

Export-ModuleMember -Function Deploy-GuardPasteAI
`;
  }

  // SCIM resource creation
  async createSCIMResource(resourceType, resource, orgId) {
    try {
      const response = await fetch(`${this.deploymentEndpoint}/scim/v2/${resourceType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/scim+json',
          'Authorization': `Bearer ${await this.getOrgToken(orgId)}`
        },
        body: JSON.stringify(resource)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SCIM ${resourceType} creation failed: ${error}`);
      }

      return { success: true, [resourceType.toLowerCase().slice(0, -1)]: await response.json() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get organization settings
  async getOrganizationSettings(orgId) {
    if (this.configurationCache.has(orgId)) {
      return this.configurationCache.get(orgId);
    }

    try {
      const response = await fetch(`${this.deploymentEndpoint}/organizations/${orgId}/settings`, {
        headers: {
          'Authorization': `Bearer ${await this.getOrgToken(orgId)}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch organization settings: ${response.status}`);
      }

      const settings = await response.json();
      this.configurationCache.set(orgId, settings);
      
      // Cache for 5 minutes
      setTimeout(() => this.configurationCache.delete(orgId), 5 * 60 * 1000);
      
      return settings;
    } catch (error) {
      console.error('Failed to fetch organization settings:', error);
      return this.getDefaultOrganizationSettings();
    }
  }

  // Default organization settings fallback
  getDefaultOrganizationSettings() {
    return {
      defaultSensitivity: 'medium',
      llmEnabled: false,
      geofencingEnabled: false,
      complianceFramework: 'general',
      dataResidency: 'us',
      logRetentionDays: 90,
      customPatterns: [],
      blockedDomains: [],
      allowedRegions: [],
      blockedRegions: []
    };
  }

  // Get organization token from secure storage
  async getOrgToken(orgId) {
    const stored = await chrome.storage.local.get([`org_token_${orgId}`]);
    return stored[`org_token_${orgId}`];
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnterpriseDeployment;
} else {
  window.EnterpriseDeployment = EnterpriseDeployment;
}