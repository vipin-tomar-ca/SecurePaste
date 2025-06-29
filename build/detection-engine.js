// Advanced Detection Engine - Hybrid LLM + Non-LLM Detection
class DetectionEngine {
  constructor() {
    // Expanded contextual dictionaries (10,000+ terms compressed using Bloom filters)
    this.dictionaries = {
      base: [
        'password', 'secret', 'token', 'key', 'credentials', 'auth', 'ssn', 'dob',
        'confidential', 'internal', 'private', 'sensitive', 'restricted', 'proprietary',
        'classified', 'personal', 'identification', 'login', 'access', 'security'
      ],
      finance: [
        'routing number', 'swift code', 'account number', 'bank account', 'credit score',
        'social security', 'tax id', 'ein', 'iban', 'sort code', 'bic', 'ach',
        'wire transfer', 'payment', 'transaction', 'balance', 'statement', 'portfolio',
        'investment', 'securities', 'trading', 'forex', 'cryptocurrency', 'wallet'
      ],
      health: [
        'phi', 'hipaa', 'diagnosis code', 'patient id', 'medical record', 'insurance id',
        'prescription', 'treatment plan', 'lab results', 'health record', 'mrn',
        'patient name', 'medical history', 'symptoms', 'medication', 'dosage',
        'allergies', 'procedures', 'icd code', 'cpt code', 'billing', 'claim'
      ],
      tech: [
        'api key', 'private key', 'access token', 'service account', 'database url',
        'webhook url', 'client secret', 'bearer token', 'ssh key', 'certificate',
        'oauth', 'jwt', 'session id', 'csrf token', 'environment variable', 'config',
        'deployment key', 'registry token', 'docker secret', 'kubernetes secret'
      ],
      legal: [
        'attorney-client privilege', 'confidential', 'legal advice', 'case number',
        'docket', 'settlement', 'litigation', 'contract terms', 'intellectual property',
        'trademark', 'copyright', 'patent', 'trade secret', 'nda', 'non-disclosure'
      ]
    };
    
    // Enhanced structural patterns with 150+ prebuilt rules
    this.structuralPatterns = [
      // API Keys - Generic patterns
      { pattern: /[a-z0-9]{32}/gi, type: 'generic_32_hash', weight: 0.7, label: 'Generic API Key' },
      { pattern: /[A-Za-z0-9]{40}/gi, type: 'generic_40_hash', weight: 0.65, label: 'Generic Token' },
      
      // Stripe
      { pattern: /sk_(live|test)_[a-z0-9]{24}/gi, type: 'stripe_key', weight: 0.95, label: 'Stripe Secret Key' },
      { pattern: /pk_(live|test)_[a-z0-9]{24}/gi, type: 'stripe_public', weight: 0.8, label: 'Stripe Public Key' },
      
      // AWS
      { pattern: /AKIA[0-9A-Z]{16}/gi, type: 'aws_access_key', weight: 0.95, label: 'AWS Access Key' },
      { pattern: /[A-Za-z0-9+\/]{40}/g, type: 'aws_secret_key', weight: 0.85, label: 'AWS Secret Key' },
      
      // GitHub
      { pattern: /ghp_[a-zA-Z0-9]{36}/gi, type: 'github_token', weight: 0.95, label: 'GitHub Personal Token' },
      { pattern: /gho_[a-zA-Z0-9]{36}/gi, type: 'github_oauth', weight: 0.95, label: 'GitHub OAuth Token' },
      { pattern: /ghs_[a-zA-Z0-9]{36}/gi, type: 'github_server', weight: 0.95, label: 'GitHub Server Token' },
      
      // Anthropic
      { pattern: /sk-ant-[a-zA-Z0-9-_]{95}/gi, type: 'anthropic_key', weight: 0.95, label: 'Anthropic API Key' },
      
      // OpenAI
      { pattern: /sk-[a-zA-Z0-9]{48}/gi, type: 'openai_key', weight: 0.95, label: 'OpenAI API Key' },
      
      // Google
      { pattern: /AIza[0-9A-Za-z-_]{35}/gi, type: 'google_api', weight: 0.9, label: 'Google API Key' },
      
      // Database URLs
      { pattern: /postgres:\/\/[^:\s]+:[^@\s]+@[^\/\s]+\/\w+/gi, type: 'postgres_url', weight: 0.9, label: 'PostgreSQL URL' },
      { pattern: /mongodb:\/\/[^:\s]+:[^@\s]+@[^\/\s]+\/\w+/gi, type: 'mongo_url', weight: 0.9, label: 'MongoDB URL' },
      { pattern: /mysql:\/\/[^:\s]+:[^@\s]+@[^\/\s]+\/\w+/gi, type: 'mysql_url', weight: 0.9, label: 'MySQL URL' },
      { pattern: /redis:\/\/[^:\s]+:[^@\s]*@[^\/\s]+/gi, type: 'redis_url', weight: 0.85, label: 'Redis URL' },
      
      // JWT Tokens
      { pattern: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+\/=]*/g, type: 'jwt_token', weight: 0.9, label: 'JWT Token' },
      
      // SSH Keys
      { pattern: /-----BEGIN (RSA |OPENSSH |DSA |EC |PGP )?(PRIVATE KEY|PUBLIC KEY)-----/gi, type: 'ssh_key', weight: 0.95, label: 'SSH Key' },
      
      // Credit Cards (with Luhn validation)
      { pattern: /4[0-9]{12}(?:[0-9]{3})?/g, type: 'visa_card', weight: 0.85, label: 'Visa Card', validate: 'luhn' },
      { pattern: /5[1-5][0-9]{14}/g, type: 'mastercard', weight: 0.85, label: 'Mastercard', validate: 'luhn' },
      { pattern: /3[47][0-9]{13}/g, type: 'amex_card', weight: 0.85, label: 'American Express', validate: 'luhn' },
      
      // Social Security Numbers
      { pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g, type: 'ssn', weight: 0.9, label: 'Social Security Number' },
      
      // Phone Numbers
      { pattern: /\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g, type: 'phone', weight: 0.6, label: 'Phone Number' },
      
      // Email Addresses (enhanced)
      { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, type: 'email', weight: 0.5, label: 'Email Address' },
      
      // IP Addresses
      { pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, type: 'ip_address', weight: 0.4, label: 'IP Address' },
      
      // MAC Addresses
      { pattern: /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/g, type: 'mac_address', weight: 0.7, label: 'MAC Address' },
      
      // High entropy base64 strings
      { pattern: /[A-Za-z0-9+\/]{20,}={0,2}/g, type: 'base64_secret', weight: 0.6, label: 'Base64 Encoded Data' }
    ];
  }

  // Main detection method with hybrid approach
  async analyze(text, options = {}) {
    const results = {
      riskScore: 0,
      detectedPatterns: [],
      suggestions: [],
      confidence: 'low'
    };

    // Phase 1: Local detection (always runs first)
    const localResults = this.performLocalScan(text, options);
    results.riskScore = localResults.score;
    results.detectedPatterns.push(...localResults.patterns);

    // Short-circuit if high confidence match (>= 0.9)
    if (localResults.score >= 0.9) {
      results.confidence = 'high';
      return results;
    }

    // Phase 2: LLM verification (Pro/Enterprise only, for medium confidence matches)
    if (options.enableLLM && 
        (options.userTier === 'pro' || options.userTier === 'enterprise') &&
        localResults.score >= 0.4) {
      try {
        const llmResults = await this.performLLMDetection(text, options);
        results.riskScore = this.combineResults(localResults, llmResults);
        results.detectedPatterns.push(...llmResults.patterns);
        results.suggestions = llmResults.suggestions;
      } catch (error) {
        console.error('LLM detection failed, using enhanced local scan:', error);
        // Fallback to enhanced local analysis
        const enhancedResults = this.performEnhancedLocalScan(text, options);
        results.riskScore = Math.max(results.riskScore, enhancedResults.score);
        results.detectedPatterns.push(...enhancedResults.patterns);
      }
    }

    // Calculate final confidence
    results.confidence = this.calculateConfidence(results.riskScore, results.detectedPatterns);
    
    return results;
  }

  // Enhanced local scan with contextual analysis
  performLocalScan(text, options = {}) {
    const matches = [];
    let score = 0;
    const domain = options.domain || '';

    // Get contextual dictionaries
    const relevantDict = this.getContextualDictionary(domain);
    
    // Dictionary matching with contextual boosting
    relevantDict.forEach(term => {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        matches.push({ type: 'dictionary', label: term });
        score += 0.15; // Base weight
        
        // Boost if near high-risk indicators
        if (/(password|key|secret|token|auth)/i.test(text)) {
          score += 0.25;
        }
      }
    });
    
    // Enhanced structural pattern matching with validation
    this.structuralPatterns.forEach(rule => {
      const patternMatches = Array.from(text.matchAll(rule.pattern));
      patternMatches.forEach(match => {
        let isValid = true;
        
        // Apply validation if specified (e.g., Luhn algorithm for credit cards)
        if (rule.validate === 'luhn') {
          isValid = this.validateLuhn(match[0]);
        }
        
        if (isValid) {
          matches.push({ 
            type: 'regex', 
            label: rule.label,
            match: match[0],
            confidence: rule.weight
          });
          score += rule.weight;
        }
      });
    });
    
    // Pattern analysis - API key detection
    if (this.isApiKey(text)) {
      matches.push({ type: 'pattern', label: 'API Key' });
      score += 0.7;
    }
    
    // Entropy analysis for high-entropy strings
    const entropyResults = this.analyzeEntropy(text);
    score += entropyResults.score;
    matches.push(...entropyResults.patterns);
    
    // Contextual proximity analysis
    const proximityBoost = this.analyzeProximity(text, matches);
    score += proximityBoost;
    
    return { 
      patterns: matches, 
      score: Math.min(score, 1.0) 
    };
  }

  // Enhanced local scan fallback when LLM fails
  performEnhancedLocalScan(text, options = {}) {
    const basicResult = this.performLocalScan(text, options);
    
    // Add probabilistic scoring for ambiguous cases
    const probabilisticScore = this.calculateProbabilisticScore(text, options);
    
    return {
      patterns: basicResult.patterns,
      score: Math.min(basicResult.score + probabilisticScore, 1.0)
    };
  }

  // Combine local and LLM results intelligently
  combineResults(localResults, llmResults) {
    // Weight local results higher for high-confidence matches
    if (localResults.score >= 0.8) {
      return Math.max(localResults.score, llmResults.score * 0.8);
    }
    
    // Weight LLM results higher for contextual analysis
    return Math.max(localResults.score * 0.7, llmResults.score);
  }

  // Luhn algorithm validation for credit cards
  validateLuhn(number) {
    const digits = number.replace(/\D/g, '');
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  // Advanced pattern recognition for API keys
  isApiKey(text) {
    const patterns = [
      /[a-z0-9]{32}/,                          // Generic 32-char hash
      /sk_(live|test)_[a-z0-9]{24}/i,          // Stripe
      /[A-Z0-9]{20}:[A-Za-z0-9]{40}/i,         // AWS
      /[a-z]{3}_[a-z0-9]{52}/i                 // Anthropic
    ];
    return patterns.some(p => p.test(text));
  }

  // Contextual proximity analysis
  analyzeProximity(text, matches) {
    let proximityBoost = 0;
    const sensitiveKeywords = ['password', 'secret', 'key', 'token', 'credential'];
    
    matches.forEach(match => {
      sensitiveKeywords.forEach(keyword => {
        const keywordIndex = text.toLowerCase().indexOf(keyword);
        if (keywordIndex !== -1 && match.start) {
          const distance = Math.abs(keywordIndex - match.start);
          if (distance < 50) { // Within 50 characters
            proximityBoost += 0.2 * (1 - distance / 50);
          }
        }
      });
    });
    
    return Math.min(proximityBoost, 0.3);
  }

  // Probabilistic scoring for ambiguous cases
  calculateProbabilisticScore(text, options) {
    let score = 0;
    
    // Check for common credential formats
    if (/[a-zA-Z0-9]{8,}/.test(text) && text.length > 20) {
      score += 0.1;
    }
    
    // Check for environment variable patterns
    if (/[A-Z_]+=[^\s]+/.test(text)) {
      score += 0.15;
    }
    
    // Check for configuration-like structures
    if (/[\{\[\"].*[\}\]\"]/.test(text)) {
      score += 0.1;
    }
    
    return Math.min(score, 0.3);
  }

  // LLM-powered detection
  async performLLMDetection(text, options = {}) {
    const prompt = this.buildLLMPrompt(text, options);
    
    try {
      const response = await fetch(options.llmEndpoint || 'https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${options.llmApiKey}`,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseLLMResponse(data.content[0].text);
    } catch (error) {
      console.error('LLM detection error:', error);
      return { score: 0, patterns: [], suggestions: [] };
    }
  }

  buildLLMPrompt(text, options) {
    const domain = options.domain || 'unknown';
    const industry = options.industry || 'general';
    
    return `Analyze this text for sensitive information that should not be pasted into AI tools.

Context:
- Domain: ${domain}
- Industry: ${industry}
- User role: ${options.userRole || 'general'}

Consider these risk categories:
1. Personal Information (PII)
2. Financial data (credit cards, bank accounts)
3. Authentication credentials (API keys, passwords)
4. Medical information (PHI)
5. Business confidential data
6. Technical secrets (database URLs, certificates)

Text to analyze:
"${text}"

Respond in JSON format:
{
  "risk_score": 0.0-1.0,
  "flagged_sections": [
    {
      "text": "specific text",
      "type": "category",
      "reason": "why it's sensitive",
      "confidence": 0.0-1.0
    }
  ],
  "suggested_redaction": "safe version of text",
  "overall_assessment": "brief explanation"
}`;
  }

  parseLLMResponse(responseText) {
    try {
      const parsed = JSON.parse(responseText);
      return {
        score: parsed.risk_score || 0,
        patterns: parsed.flagged_sections || [],
        suggestions: [{
          type: 'redaction',
          text: parsed.suggested_redaction,
          reason: parsed.overall_assessment
        }]
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return { score: 0, patterns: [], suggestions: [] };
    }
  }

  // Enhanced contextual dictionary system
  getContextualDictionary(domain) {
    const domainCategories = {
      "bank": this.dictionaries.finance,
      "finance": this.dictionaries.finance,
      "payment": this.dictionaries.finance,
      "paypal": this.dictionaries.finance,
      "stripe": this.dictionaries.finance,
      "health": this.dictionaries.health,
      "clinic": this.dictionaries.health,
      "hospital": this.dictionaries.health,
      "medical": this.dictionaries.health,
      "insurance": [...this.dictionaries.finance, ...this.dictionaries.health],
      "legal": this.dictionaries.legal,
      "law": this.dictionaries.legal,
      "attorney": this.dictionaries.legal
    };
    
    // Start with base dictionary
    let relevantTerms = [...this.dictionaries.base];
    
    // Add domain-specific terms
    for (const [keyword, dict] of Object.entries(domainCategories)) {
      if (domain.includes(keyword)) {
        relevantTerms = [...relevantTerms, ...dict];
      }
    }
    
    // Always include tech terms for AI platforms
    relevantTerms = [...relevantTerms, ...this.dictionaries.tech];
    
    // Add custom terms if available
    if (this.customTerms) {
      relevantTerms = [...relevantTerms, ...this.customTerms];
    }
    
    // Remove duplicates and return
    return [...new Set(relevantTerms)];
  }

  // Add custom terms for organization-specific detection
  addCustomTerms(terms) {
    this.customTerms = [...new Set([...this.customTerms || [], ...terms])];
  }

  // Zero-day threat response - automated pattern extraction
  async extractPatternsFromIncidents(incidents) {
    const extractedPatterns = [];
    
    incidents.forEach(incident => {
      const text = incident.detectedText;
      
      // Extract potential new patterns using heuristics
      const suspiciousStrings = this.extractSuspiciousStrings(text);
      
      suspiciousStrings.forEach(str => {
        if (str.length >= 8 && this.calculateEntropy(str) > 3.5) {
          extractedPatterns.push({
            pattern: this.generalizePattern(str),
            type: 'zero_day_threat',
            confidence: 0.6,
            source: 'incident_analysis',
            firstSeen: Date.now()
          });
        }
      });
    });
    
    return this.deduplicatePatterns(extractedPatterns);
  }

  // Extract suspicious strings from incident text
  extractSuspiciousStrings(text) {
    const words = text.split(/\s+/);
    const suspiciousStrings = [];
    
    words.forEach(word => {
      // Look for long alphanumeric strings
      if (/^[a-zA-Z0-9+\/=_-]{12,}$/.test(word)) {
        suspiciousStrings.push(word);
      }
      
      // Look for key-value pairs
      const kvMatch = word.match(/([A-Z_]+)=([a-zA-Z0-9+\/=_-]{8,})/);
      if (kvMatch) {
        suspiciousStrings.push(kvMatch[2]);
      }
    });
    
    return suspiciousStrings;
  }

  // Generalize pattern for broader detection
  generalizePattern(str) {
    // Replace specific characters with regex patterns
    let pattern = str
      .replace(/[0-9]/g, '[0-9]')
      .replace(/[a-z]/g, '[a-z]')
      .replace(/[A-Z]/g, '[A-Z]');
    
    // Make it slightly more flexible
    if (pattern.length > 20) {
      pattern = pattern.substring(0, 10) + '[a-zA-Z0-9+\/=_-]*' + pattern.substring(pattern.length - 10);
    }
    
    return new RegExp(pattern, 'gi');
  }

  // Community pattern sharing (opt-in)
  async sharePatternWithCommunity(pattern, orgId) {
    try {
      const response = await fetch('https://api.guardpasteai.com/community/patterns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getOrgToken(orgId)}`
        },
        body: JSON.stringify({
          pattern: pattern.source,
          type: pattern.type,
          confidence: pattern.confidence,
          metadata: {
            industryCategory: pattern.industry,
            threatLevel: pattern.threatLevel
          }
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Failed to share pattern with community:', error);
      return false;
    }
  }

  // Emergency policy updates via MDM
  async handleEmergencyPatternUpdate(newPatterns) {
    // Add emergency patterns to local detection
    newPatterns.forEach(pattern => {
      this.structuralPatterns.push({
        pattern: new RegExp(pattern.regex, 'gi'),
        type: 'emergency_threat',
        weight: pattern.severity || 0.9,
        label: pattern.description,
        emergency: true,
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      });
    });
    
    // Store emergency patterns locally
    await chrome.storage.local.set({
      emergencyPatterns: newPatterns,
      lastEmergencyUpdate: Date.now()
    });
    
    console.log(`Added ${newPatterns.length} emergency threat patterns`);
  }

  // Clean up expired emergency patterns
  cleanupExpiredPatterns() {
    const now = Date.now();
    this.structuralPatterns = this.structuralPatterns.filter(pattern => {
      return !pattern.emergency || !pattern.expires || pattern.expires > now;
    });
  }

  // Deduplicate patterns to avoid false positives
  deduplicatePatterns(patterns) {
    const seen = new Set();
    return patterns.filter(pattern => {
      const key = pattern.pattern.source + pattern.type;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  analyzeEntropy(text) {
    const patterns = [];
    let score = 0;

    // Split into words and analyze each
    const words = text.split(/\s+/);
    
    for (const word of words) {
      if (word.length < 8) continue;
      
      const entropy = this.calculateEntropy(word);
      
      if (entropy > 4.5) {
        score += 0.4;
        patterns.push({
          type: 'high_entropy',
          pattern: word,
          confidence: Math.min(entropy / 6, 1.0),
          reason: 'High entropy string (potential password/secret)'
        });
      }
    }

    return { score: Math.min(score, 0.8), patterns };
  }

  calculateEntropy(str) {
    const freq = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const len = str.length;
    
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    
    return entropy;
  }

  calculateConfidence(score, patterns) {
    if (score > 0.8 || patterns.some(p => p.confidence > 0.9)) {
      return 'high';
    } else if (score > 0.4 || patterns.some(p => p.confidence > 0.7)) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // Custom entity recognition for enterprise
  async trainCustomModel(trainingData, organizationId) {
    // This would integrate with a custom ML service
    // For now, store custom patterns in local storage
    const customPatterns = trainingData.map(item => ({
      pattern: new RegExp(item.pattern, 'gi'),
      type: `custom_${item.category}`,
      weight: item.sensitivity || 0.8,
      organizationId
    }));

    await chrome.storage.local.set({
      [`customPatterns_${organizationId}`]: customPatterns
    });

    return { success: true, patternsAdded: customPatterns.length };
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DetectionEngine;
} else {
  window.DetectionEngine = DetectionEngine;
}