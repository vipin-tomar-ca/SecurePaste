// LLM Integration Service for Pro/Enterprise Detection
class LLMIntegration {
  constructor() {
    this.providers = {
      anthropic: {
        endpoint: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-haiku-20240307',
        headers: (apiKey) => ({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'anthropic-version': '2023-06-01'
        })
      },
      openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-3.5-turbo',
        headers: (apiKey) => ({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        })
      }
    };
    
    this.contextTemplates = {
      healthcare: {
        industryTerms: ['PHI', 'patient', 'diagnosis', 'medical record', 'HIPAA'],
        riskPatterns: ['patient ID', 'insurance number', 'prescription', 'treatment plan'],
        complianceNote: 'Healthcare data subject to HIPAA regulations'
      },
      finance: {
        industryTerms: ['PII', 'account', 'routing', 'credit', 'banking'],
        riskPatterns: ['account number', 'social security', 'credit score', 'financial record'],
        complianceNote: 'Financial data subject to PCI DSS and SOX regulations'
      },
      tech: {
        industryTerms: ['API', 'credentials', 'token', 'secret', 'certificate'],
        riskPatterns: ['private key', 'database URL', 'service account', 'webhook'],
        complianceNote: 'Technical credentials pose security risks'
      }
    };
  }

  async analyzeWithLLM(text, settings) {
    const provider = settings.llmProvider || 'anthropic';
    const apiKey = await this.getAPIKey(provider);
    
    if (!apiKey) {
      throw new Error(`${provider} API key not configured`);
    }

    const context = this.buildAnalysisContext(text, settings);
    const prompt = this.buildPrompt(text, context, settings);

    try {
      const response = await this.callLLMProvider(provider, prompt, apiKey);
      return this.parseResponse(response, settings);
    } catch (error) {
      console.error('LLM analysis failed:', error);
      throw error;
    }
  }

  buildAnalysisContext(text, settings) {
    const domain = settings.domain || '';
    const industry = this.detectIndustry(domain, settings.userRole);
    const template = this.contextTemplates[industry] || this.contextTemplates.tech;
    
    return {
      industry,
      domain,
      userRole: settings.userRole || 'general',
      riskLevel: settings.riskLevel || 'medium',
      complianceFramework: settings.complianceFramework || 'general',
      contextTerms: template.industryTerms,
      riskPatterns: template.riskPatterns,
      complianceNote: template.complianceNote
    };
  }

  buildPrompt(text, context, settings) {
    const basePrompt = `You are a security AI that analyzes text for sensitive information that should not be shared with AI tools.

CONTEXT:
- Domain: ${context.domain}
- Industry: ${context.industry}
- User Role: ${context.userRole}
- Risk Level: ${context.riskLevel}
- Compliance: ${context.complianceNote}

DETECTION CRITERIA:
Focus on these high-risk patterns:
${context.riskPatterns.map(p => `- ${p}`).join('\n')}

Industry-specific terms to watch:
${context.contextTerms.map(t => `- ${t}`).join('\n')}

ANALYSIS REQUIREMENTS:
1. Identify ALL sensitive information with precise character positions
2. Assess business context risk (not just pattern matching)
3. Consider data classification levels
4. Provide actionable redaction suggestions
5. Include confidence scores for each detection

TEXT TO ANALYZE:
"${text.substring(0, 4000)}"${text.length > 4000 ? '...[truncated]' : ''}

RESPONSE FORMAT (JSON only):
{
  "overall_risk_score": 0.0-1.0,
  "confidence": "low|medium|high",
  "business_context_risk": "explanation of business impact",
  "detections": [
    {
      "text": "exact text found",
      "category": "pii|financial|auth|medical|business|technical",
      "subcategory": "specific type",
      "risk_level": "low|medium|high|critical",
      "confidence": 0.0-1.0,
      "start_pos": 0,
      "end_pos": 0,
      "reasoning": "why this is sensitive",
      "business_impact": "potential consequences",
      "suggested_replacement": "safe alternative"
    }
  ],
  "safe_version": "complete redacted text",
  "recommendations": [
    {
      "action": "redact|replace|review",
      "reason": "explanation",
      "priority": "low|medium|high"
    }
  ]
}`;

    if (settings.customInstructions) {
      return basePrompt + `\n\nADDITIONAL INSTRUCTIONS:\n${settings.customInstructions}`;
    }

    return basePrompt;
  }

  async callLLMProvider(provider, prompt, apiKey) {
    const config = this.providers[provider];
    
    let requestBody;
    if (provider === 'anthropic') {
      requestBody = {
        model: config.model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      };
    } else if (provider === 'openai') {
      requestBody = {
        model: config.model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      };
    }

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: config.headers(apiKey),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${provider} API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    
    if (provider === 'anthropic') {
      return data.content[0].text;
    } else if (provider === 'openai') {
      return data.choices[0].message.content;
    }
  }

  parseResponse(responseText, settings) {
    try {
      const parsed = JSON.parse(responseText);
      
      return {
        riskScore: parsed.overall_risk_score || 0,
        confidence: parsed.confidence || 'low',
        businessContext: parsed.business_context_risk || '',
        detectedPatterns: (parsed.detections || []).map(d => ({
          type: d.category,
          subtype: d.subcategory,
          text: d.text,
          start: d.start_pos,
          end: d.end_pos,
          confidence: d.confidence,
          severity: d.risk_level,
          reasoning: d.reasoning,
          businessImpact: d.business_impact,
          replacement: d.suggested_replacement
        })),
        safeVersion: parsed.safe_version || '',
        recommendations: parsed.recommendations || []
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      console.log('Raw response:', responseText);
      
      // Fallback parsing for malformed JSON
      return this.fallbackParse(responseText);
    }
  }

  fallbackParse(responseText) {
    // Extract risk score from response
    const riskMatch = responseText.match(/risk[_\s]*score['":\s]*([0-9.]+)/i);
    const riskScore = riskMatch ? parseFloat(riskMatch[1]) : 0.5;
    
    // Extract confidence
    const confMatch = responseText.match(/confidence['":\s]*(low|medium|high)/i);
    const confidence = confMatch ? confMatch[1].toLowerCase() : 'medium';
    
    return {
      riskScore,
      confidence,
      businessContext: 'LLM analysis completed with parsing issues',
      detectedPatterns: [],
      safeVersion: '',
      recommendations: [{
        action: 'review',
        reason: 'Manual review recommended due to parsing issues',
        priority: 'medium'
      }]
    };
  }

  detectIndustry(domain, userRole) {
    // Healthcare
    if (domain.includes('clinic') || domain.includes('hospital') || 
        domain.includes('health') || userRole?.includes('medical')) {
      return 'healthcare';
    }
    
    // Finance
    if (domain.includes('bank') || domain.includes('finance') || 
        domain.includes('payment') || userRole?.includes('finance')) {
      return 'finance';
    }
    
    // Default to tech for AI platforms
    return 'tech';
  }

  async getAPIKey(provider) {
    const stored = await chrome.storage.sync.get([`${provider}_api_key`]);
    return stored[`${provider}_api_key`];
  }

  async setAPIKey(provider, apiKey) {
    await chrome.storage.sync.set({
      [`${provider}_api_key`]: apiKey
    });
  }

  // Privacy-preserving analysis for enterprise
  async analyzeWithPrivacy(text, settings) {
    if (!settings.privacyMode) {
      return this.analyzeWithLLM(text, settings);
    }

    // Use homomorphic encryption or local processing
    const hashedText = await this.createPrivacyHash(text);
    const localAnalysis = await this.performLocalAnalysis(text, settings);
    
    // Only send metadata to LLM, not actual content
    const contextPrompt = this.buildPrivacyPrompt(hashedText, localAnalysis, settings);
    
    try {
      const response = await this.callLLMProvider(
        settings.llmProvider || 'anthropic',
        contextPrompt,
        await this.getAPIKey(settings.llmProvider || 'anthropic')
      );
      
      return this.combinePrivacyResults(localAnalysis, response);
    } catch (error) {
      console.error('Privacy-preserving analysis failed:', error);
      return localAnalysis; // Fallback to local analysis
    }
  }

  async createPrivacyHash(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  buildPrivacyPrompt(hashedText, localAnalysis, settings) {
    return `Analyze this metadata for additional security insights without seeing actual content.

Content Hash: ${hashedText}
Local Analysis Results:
- Pattern Count: ${localAnalysis.detectedPatterns.length}
- Categories Found: ${localAnalysis.detectedPatterns.map(p => p.type).join(', ')}
- Risk Score: ${localAnalysis.riskScore}

Domain Context: ${settings.domain}
Industry: ${this.detectIndustry(settings.domain, settings.userRole)}

Provide additional security recommendations based on this metadata pattern.`;
  }

  combinePrivacyResults(localAnalysis, llmResponse) {
    // Combine local detection with LLM insights while preserving privacy
    return {
      ...localAnalysis,
      privacyMode: true,
      enhancedRecommendations: this.extractRecommendations(llmResponse)
    };
  }

  extractRecommendations(llmResponse) {
    // Extract actionable recommendations from LLM response
    const recommendations = [];
    
    if (llmResponse.includes('high risk')) {
      recommendations.push({
        action: 'block',
        reason: 'High risk pattern detected',
        priority: 'high'
      });
    }
    
    return recommendations;
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LLMIntegration;
} else {
  window.LLMIntegration = LLMIntegration;
}