// Pattern detection and testing module
(function() {
  'use strict';

  // Simple pattern testing function
  function testPatternsSimple(text) {
    const patterns = [
      {
        name: 'Credit Card',
        regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/,
        description: 'Credit card numbers (Visa, MasterCard, Amex, Discover)'
      },
      {
        name: 'SSN',
        regex: /\b\d{3}-\d{2}-\d{4}\b/,
        description: 'Social Security Numbers'
      },
      {
        name: 'Email',
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
        description: 'Email addresses'
      },
      {
        name: 'Phone',
        regex: /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/,
        description: 'Phone numbers'
      },
      {
        name: 'IP Address',
        regex: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/,
        description: 'IP addresses'
      },
      {
        name: 'API Key',
        regex: /\b(?:sk-|pk_|api_key|apikey)[a-zA-Z0-9]{20,}\b/i,
        description: 'API keys'
      },
      {
        name: 'Password',
        regex: /\b(?:password|passwd|pwd)\s*[:=]\s*[^\s]+\b/i,
        description: 'Password patterns'
      },
      {
        name: 'Private Key',
        regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
        description: 'Private keys'
      },
      {
        name: 'Database URL',
        regex: /\b(?:mysql|postgresql|mongodb)://[^\s]+\b/i,
        description: 'Database connection strings'
      },
      {
        name: 'AWS Key',
        regex: /\bAKIA[0-9A-Z]{16}\b/,
        description: 'AWS access keys'
      },
      {
        name: 'GitHub Token',
        regex: /\bghp_[a-zA-Z0-9]{36}\b/,
        description: 'GitHub personal access tokens'
      },
      {
        name: 'JWT Token',
        regex: /\beyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*\b/,
        description: 'JWT tokens'
      },
      {
        name: 'UUID',
        regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
        description: 'UUIDs'
      },
      {
        name: 'Date of Birth',
        regex: /\b(?:birth|dob|date\s+of\s+birth).*?(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/i,
        description: 'Date of birth patterns'
      },
      {
        name: 'Address',
        regex: /\b\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd|court|ct|place|pl)\b/i,
        description: 'Street addresses'
      },
      {
        name: 'License Plate',
        regex: /\b[A-Z]{1,3}\s*\d{1,4}\s*[A-Z]{1,3}\b/,
        description: 'License plate numbers'
      },
      {
        name: 'Medical ID',
        regex: /\b(?:patient|medical|health)\s+(?:id|number|identifier).*?\d{6,}\b/i,
        description: 'Medical identifiers'
      },
      {
        name: 'Financial Account',
        regex: /\b(?:account|acct|routing)\s+(?:number|#).*?\d{4,}\b/i,
        description: 'Financial account numbers'
      },
      {
        name: 'Driver License',
        regex: /\b(?:driver|driving)\s+(?:license|licence|id).*?[A-Z0-9]{6,}\b/i,
        description: 'Driver license numbers'
      },
      {
        name: 'Passport',
        regex: /\b(?:passport|travel)\s+(?:number|#).*?[A-Z0-9]{6,}\b/i,
        description: 'Passport numbers'
      }
    ];

    const detectedPatterns = [];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern.regex);
      if (matches) {
        detectedPatterns.push({
          name: pattern.name,
          description: pattern.description,
          matches: matches.slice(0, 5), // Limit to first 5 matches
          count: matches.length
        });
      }
    }

    return detectedPatterns;
  }

  // Test all patterns with detailed analysis
  function testAllPatterns(text) {
    const patterns = [
      {
        name: 'Credit Card',
        regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/,
        description: 'Credit card numbers (Visa, MasterCard, Amex, Discover)',
        severity: 'high'
      },
      {
        name: 'SSN',
        regex: /\b\d{3}-\d{2}-\d{4}\b/,
        description: 'Social Security Numbers',
        severity: 'high'
      },
      {
        name: 'Email',
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
        description: 'Email addresses',
        severity: 'medium'
      },
      {
        name: 'Phone',
        regex: /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/,
        description: 'Phone numbers',
        severity: 'medium'
      },
      {
        name: 'IP Address',
        regex: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/,
        description: 'IP addresses',
        severity: 'medium'
      },
      {
        name: 'API Key',
        regex: /\b(?:sk-|pk_|api_key|apikey)[a-zA-Z0-9]{20,}\b/i,
        description: 'API keys',
        severity: 'high'
      },
      {
        name: 'Password',
        regex: /\b(?:password|passwd|pwd)\s*[:=]\s*[^\s]+\b/i,
        description: 'Password patterns',
        severity: 'high'
      },
      {
        name: 'Private Key',
        regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
        description: 'Private keys',
        severity: 'critical'
      },
      {
        name: 'Database URL',
        regex: /\b(?:mysql|postgresql|mongodb)://[^\s]+\b/i,
        description: 'Database connection strings',
        severity: 'high'
      },
      {
        name: 'AWS Key',
        regex: /\bAKIA[0-9A-Z]{16}\b/,
        description: 'AWS access keys',
        severity: 'high'
      },
      {
        name: 'GitHub Token',
        regex: /\bghp_[a-zA-Z0-9]{36}\b/,
        description: 'GitHub personal access tokens',
        severity: 'high'
      },
      {
        name: 'JWT Token',
        regex: /\beyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*\b/,
        description: 'JWT tokens',
        severity: 'high'
      },
      {
        name: 'UUID',
        regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
        description: 'UUIDs',
        severity: 'low'
      },
      {
        name: 'Date of Birth',
        regex: /\b(?:birth|dob|date\s+of\s+birth).*?(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/i,
        description: 'Date of birth patterns',
        severity: 'medium'
      },
      {
        name: 'Address',
        regex: /\b\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd|court|ct|place|pl)\b/i,
        description: 'Street addresses',
        severity: 'medium'
      },
      {
        name: 'License Plate',
        regex: /\b[A-Z]{1,3}\s*\d{1,4}\s*[A-Z]{1,3}\b/,
        description: 'License plate numbers',
        severity: 'low'
      },
      {
        name: 'Medical ID',
        regex: /\b(?:patient|medical|health)\s+(?:id|number|identifier).*?\d{6,}\b/i,
        description: 'Medical identifiers',
        severity: 'high'
      },
      {
        name: 'Financial Account',
        regex: /\b(?:account|acct|routing)\s+(?:number|#).*?\d{4,}\b/i,
        description: 'Financial account numbers',
        severity: 'high'
      },
      {
        name: 'Driver License',
        regex: /\b(?:driver|driving)\s+(?:license|licence|id).*?[A-Z0-9]{6,}\b/i,
        description: 'Driver license numbers',
        severity: 'high'
      },
      {
        name: 'Passport',
        regex: /\b(?:passport|travel)\s+(?:number|#).*?[A-Z0-9]{6,}\b/i,
        description: 'Passport numbers',
        severity: 'high'
      }
    ];

    const detectedPatterns = [];
    let totalRiskScore = 0;
    
    for (const pattern of patterns) {
      const matches = text.match(pattern.regex);
      if (matches) {
        const riskScore = getRiskScore(pattern.severity) * matches.length;
        totalRiskScore += riskScore;
        
        detectedPatterns.push({
          name: pattern.name,
          description: pattern.description,
          severity: pattern.severity,
          matches: matches.slice(0, 5), // Limit to first 5 matches
          count: matches.length,
          riskScore: riskScore
        });
      }
    }

    return {
      patterns: detectedPatterns,
      totalRiskScore: totalRiskScore,
      riskLevel: getRiskLevel(totalRiskScore)
    };
  }

  // Get risk score based on severity
  function getRiskScore(severity) {
    const scores = {
      'critical': 10,
      'high': 7,
      'medium': 4,
      'low': 1
    };
    return scores[severity] || 1;
  }

  // Get risk level based on total score
  function getRiskLevel(totalScore) {
    if (totalScore >= 20) return 'critical';
    if (totalScore >= 10) return 'high';
    if (totalScore >= 5) return 'medium';
    return 'low';
  }

  // Check if text contains sensitive data
  function hasSensitiveData(text) {
    const patterns = testPatternsSimple(text);
    return patterns.length > 0;
  }

  // Get sensitive data summary
  function getSensitiveDataSummary(text) {
    const analysis = testAllPatterns(text);
    return {
      hasSensitiveData: analysis.patterns.length > 0,
      patternCount: analysis.patterns.length,
      totalMatches: analysis.patterns.reduce((sum, p) => sum + p.count, 0),
      riskLevel: analysis.riskLevel,
      totalRiskScore: analysis.totalRiskScore
    };
  }

  // Export functions to global scope
  window.PatternDetector = {
    testPatternsSimple,
    testAllPatterns,
    hasSensitiveData,
    getSensitiveDataSummary,
    getRiskScore,
    getRiskLevel
  };

})(); 