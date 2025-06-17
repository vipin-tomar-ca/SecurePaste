// Advanced Detection Engine - Hybrid LLM + Non-LLM Detection
class DetectionEngine {
  constructor() {
    this.dictionaries = {
      core: [
        'password', 'secret', 'token', 'key', 'credentials', 'auth',
        'confidential', 'internal', 'private', 'sensitive', 'restricted'
      ],
      finance: [
        'SWIFT code', 'routing number', 'SIN', 'bank account', 'credit score',
        'social security', 'tax ID', 'EIN', 'IBAN', 'sort code'
      ],
      health: [
        'PHI', 'diagnosis code', 'patient ID', 'medical record', 'insurance ID',
        'prescription', 'treatment plan', 'lab results', 'health record'
      ],
      tech: [
        'API key', 'private key', 'access token', 'service account', 'database URL',
        'webhook URL', 'client secret', 'bearer token', 'ssh key', 'certificate'
      ]
    };
    
    this.structuralPatterns = [
      // API Keys
      { pattern: /[a-z0-9]{32}/gi, type: 'api_key', weight: 0.7 },
      { pattern: /sk_[a-z0-9]{40}/gi, type: 'stripe_key', weight: 0.95 },
      { pattern: /AKIA[0-9A-Z]{16}/gi, type: 'aws_key', weight: 0.95 },
      { pattern: /ghp_[a-zA-Z0-9]{36}/gi, type: 'github_token', weight: 0.95 },
      
      // Database URLs
      { pattern: /postgres:\/\/[^:\s]+:[^@\s]+@[^\/\s]+\/\w+/gi, type: 'db_url', weight: 0.9 },
      { pattern: /mongodb:\/\/[^:\s]+:[^@\s]+@[^\/\s]+\/\w+/gi, type: 'db_url', weight: 0.9 },
      
      // High entropy strings (potential passwords/secrets)
      { pattern: /[A-Za-z0-9+\/]{20,}={0,2}/g, type: 'base64_secret', weight: 0.6 },
      
      // JWT Tokens
      { pattern: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+\/=]*/g, type: 'jwt_token', weight: 0.9 }
    ];
  }

  // Main detection method
  async analyze(text, options = {}) {
    const results = {
      riskScore: 0,
      detectedPatterns: [],
      suggestions: [],
      confidence: 'low'
    };

    // Non-LLM detection (always runs)
    const basicResults = this.performBasicDetection(text, options);
    results.riskScore += basicResults.score;
    results.detectedPatterns.push(...basicResults.patterns);

    // LLM detection (Pro/Enterprise only)
    if (options.enableLLM && (options.userTier === 'pro' || options.userTier === 'enterprise')) {
      try {
        const llmResults = await this.performLLMDetection(text, options);
        results.riskScore = Math.max(results.riskScore, llmResults.score);
        results.detectedPatterns.push(...llmResults.patterns);
        results.suggestions = llmResults.suggestions;
      } catch (error) {
        console.error('LLM detection failed:', error);
      }
    }

    // Calculate final confidence
    results.confidence = this.calculateConfidence(results.riskScore, results.detectedPatterns);
    
    return results;
  }

  // Non-LLM detection engine
  performBasicDetection(text, options = {}) {
    let score = 0;
    const patterns = [];
    const domain = options.domain || '';

    // Get relevant dictionaries based on domain
    const relevantDictionaries = this.getRelevantDictionaries(domain);
    
    // Dictionary matching
    for (const dict of relevantDictionaries) {
      for (const term of dict.terms) {
        if (text.toLowerCase().includes(term.toLowerCase())) {
          score += 0.3;
          patterns.push({
            type: dict.category,
            pattern: term,
            confidence: 0.7,
            start: text.toLowerCase().indexOf(term.toLowerCase()),
            end: text.toLowerCase().indexOf(term.toLowerCase()) + term.length
          });
        }
      }
    }

    // Structural pattern matching
    for (const pattern of this.structuralPatterns) {
      const matches = Array.from(text.matchAll(pattern.pattern));
      for (const match of matches) {
        score += pattern.weight;
        patterns.push({
          type: pattern.type,
          pattern: match[0],
          confidence: pattern.weight,
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    // Entropy analysis for password-like strings
    const entropyResults = this.analyzeEntropy(text);
    score += entropyResults.score;
    patterns.push(...entropyResults.patterns);

    return { score: Math.min(score, 1.0), patterns };
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

  getRelevantDictionaries(domain) {
    const dictionaries = [
      { category: 'core', terms: this.dictionaries.core }
    ];

    // Domain-specific dictionary selection
    if (domain.includes('bank') || domain.includes('finance') || domain.includes('payment')) {
      dictionaries.push({ category: 'finance', terms: this.dictionaries.finance });
    }
    
    if (domain.includes('clinic') || domain.includes('hospital') || domain.includes('health')) {
      dictionaries.push({ category: 'health', terms: this.dictionaries.health });
    }
    
    // Always include tech terms for AI platforms
    dictionaries.push({ category: 'tech', terms: this.dictionaries.tech });

    return dictionaries;
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