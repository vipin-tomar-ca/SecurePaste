// Sensitive data pattern detection utilities
const SensitivePatterns = {
  // Credit card patterns (Visa, MasterCard, American Express, Discover)
  creditCard: {
    pattern: /\b(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2}|6(?:011|5[0-9]{2}))[0-9\s\-]{8,16}\b/g,
    name: 'Credit Card Number',
    description: 'Potential credit card number detected'
  },

  // Social Security Number patterns
  ssn: {
    pattern: /\b(?:\d{3}[-\s]?\d{2}[-\s]?\d{4}|\d{9})\b/g,
    name: 'Social Security Number',
    description: 'Potential SSN detected'
  },

  // Email addresses
  email: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    name: 'Email Address',
    description: 'Email address detected'
  },

  // Phone numbers (US format)
  phone: {
    pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    name: 'Phone Number',
    description: 'Phone number detected'
  },

  // Bank account numbers (8-17 digits)
  bankAccount: {
    pattern: /\b\d{8,17}\b/g,
    name: 'Bank Account Number',
    description: 'Potential bank account number detected'
  },

  // Driver's license (various formats)
  driversLicense: {
    pattern: /\b[A-Z]{1,2}\d{6,8}\b|\b\d{8,9}\b/g,
    name: 'Driver\'s License',
    description: 'Potential driver\'s license number detected'
  },

  // IP addresses
  ipAddress: {
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    name: 'IP Address',
    description: 'IP address detected'
  },

  // API keys and tokens (common patterns)
  apiKey: {
    pattern: /\b(?:api[_-]?key|token|secret)[_-]?[:=]\s*['""]?[A-Za-z0-9_-]{16,}['""]?/gi,
    name: 'API Key/Token',
    description: 'Potential API key or token detected'
  },

  // Bitcoin addresses
  bitcoin: {
    pattern: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b|bc1[a-z0-9]{39,59}\b/g,
    name: 'Bitcoin Address',
    description: 'Bitcoin wallet address detected'
  }
};

// Function to analyze text for sensitive patterns
function analyzeSensitiveData(text) {
  const detectedPatterns = [];
  
  for (const [key, pattern] of Object.entries(SensitivePatterns)) {
    const matches = text.match(pattern.pattern);
    if (matches && matches.length > 0) {
      detectedPatterns.push({
        type: key,
        name: pattern.name,
        description: pattern.description,
        matches: matches,
        count: matches.length
      });
    }
  }
  
  return detectedPatterns;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SensitivePatterns, analyzeSensitiveData };
}
