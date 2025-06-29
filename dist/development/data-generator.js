// Data generator for creating realistic dummy values
const DataGenerator = {
  // Generate random credit card numbers (using Luhn algorithm for validity)
  generateCreditCard() {
    const prefixes = ['4111', '5555', '3782', '6011']; // Visa, MC, Amex, Discover test numbers
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    let number = prefix;
    while (number.length < 15) {
      number += Math.floor(Math.random() * 10);
    }
    
    // Calculate Luhn check digit
    let sum = 0;
    let alternate = false;
    for (let i = number.length - 1; i >= 0; i--) {
      let n = parseInt(number.charAt(i), 10);
      if (alternate) {
        n *= 2;
        if (n > 9) n = (n % 10) + 1;
      }
      sum += n;
      alternate = !alternate;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return number + checkDigit;
  },

  // Generate random SSN (non-real format)
  generateSSN() {
    const area = Math.floor(Math.random() * 899) + 100; // 100-999 (avoiding real ranges)
    const group = Math.floor(Math.random() * 99) + 10; // 10-99
    const serial = Math.floor(Math.random() * 9999) + 1; // 0001-9999
    return `${area}-${group.toString().padStart(2, '0')}-${serial.toString().padStart(4, '0')}`;
  },

  // Generate random email addresses
  generateEmail() {
    const firstNames = ['john', 'jane', 'alex', 'sarah', 'mike', 'lisa', 'david', 'emma', 'chris', 'anna'];
    const lastNames = ['smith', 'jones', 'brown', 'davis', 'wilson', 'moore', 'taylor', 'thomas', 'white', 'harris'];
    const domains = ['example.com', 'test.org', 'sample.net', 'dummy.io', 'placeholder.dev'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    return `${firstName}.${lastName}@${domain}`;
  },

  // Generate random phone numbers
  generatePhone() {
    const areaCodes = ['555', '123', '456', '789', '321'];
    const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
    const exchange = Math.floor(Math.random() * 899) + 100;
    const number = Math.floor(Math.random() * 9999) + 1;
    return `(${areaCode}) ${exchange}-${number.toString().padStart(4, '0')}`;
  },

  // Generate random bank account numbers
  generateBankAccount() {
    const length = Math.floor(Math.random() * 4) + 8; // 8-12 digits
    let account = '';
    for (let i = 0; i < length; i++) {
      account += Math.floor(Math.random() * 10);
    }
    return account;
  },

  // Generate random driver's license numbers
  generateDriversLicense() {
    const formats = [
      () => {
        // Format: A1234567
        const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        const numbers = Math.floor(Math.random() * 9999999).toString().padStart(7, '0');
        return letter + numbers;
      },
      () => {
        // Format: 12345678
        return Math.floor(Math.random() * 99999999).toString().padStart(8, '0');
      },
      () => {
        // Format: AB123456
        const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + 
                       String.fromCharCode(65 + Math.floor(Math.random() * 26));
        const numbers = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
        return letters + numbers;
      }
    ];
    
    const format = formats[Math.floor(Math.random() * formats.length)];
    return format();
  },

  // Generate random IP addresses
  generateIP() {
    // Generate private IP ranges for safety
    const ranges = [
      () => `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
      () => `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
      () => `172.${Math.floor(Math.random() * 16) + 16}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`
    ];
    
    const range = ranges[Math.floor(Math.random() * ranges.length)];
    return range();
  },

  // Generate random API keys
  generateAPIKey() {
    const prefixes = ['sk_', 'pk_', 'api_', 'key_', ''];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = Math.floor(Math.random() * 16) + 32; // 32-48 characters
    let key = '';
    
    for (let i = 0; i < length; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return prefix + key;
  },

  // Generate random Bitcoin addresses
  generateBitcoin() {
    const prefixes = ['1', '3', 'bc1'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    if (prefix === 'bc1') {
      // Bech32 format
      const chars = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
      let address = 'bc1q';
      for (let i = 0; i < 39; i++) {
        address += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return address;
    } else {
      // Legacy format
      const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let address = prefix;
      const length = Math.floor(Math.random() * 8) + 25; // 25-33 characters
      
      for (let i = 0; i < length; i++) {
        address += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return address;
    }
  },

  // Generate random passwords
  generatePassword() {
    const patterns = [
      () => '*'.repeat(8),
      () => '*'.repeat(12),
      () => '[HIDDEN]',
      () => '[REDACTED]',
      () => '••••••••',
      () => 'DummyPass123!',
      () => 'TestPassword456',
      () => 'PlaceholderPwd789'
    ];
    
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    return pattern();
  },

  // Generate development secrets
  generateDevSecret() {
    const types = [
      () => `dev_${this.generateRandomString(32)}`,
      () => `test_${this.generateRandomString(40)}`,
      () => `local_${this.generateRandomString(28)}`,
      () => `staging_${this.generateRandomString(36)}`,
      () => `Bearer ${this.generateRandomString(32)}`,
      () => `jwt_${this.generateRandomString(44)}`,
      () => `oauth_${this.generateRandomString(30)}`
    ];
    
    const type = types[Math.floor(Math.random() * types.length)];
    return type();
  },

  // Generate random string helper
  generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Generate data by type
  generateByType(type) {
    switch (type) {
      case 'creditCard':
        return this.generateCreditCard();
      case 'ssn':
        return this.generateSSN();
      case 'email':
        return this.generateEmail();
      case 'phone':
        return this.generatePhone();
      case 'bankAccount':
        return this.generateBankAccount();
      case 'driversLicense':
        return this.generateDriversLicense();
      case 'ipAddress':
        return this.generateIP();
      case 'apiKey':
        return this.generateAPIKey();
      case 'bitcoin':
        return this.generateBitcoin();
      case 'password':
        return this.generatePassword();
      case 'devSecret':
        return this.generateDevSecret();
      default:
        return '[PLACEHOLDER]';
    }
  },

  // Generate complete set of dummy data
  generateAll() {
    return {
      creditCard: this.generateCreditCard(),
      ssn: this.generateSSN(),
      email: this.generateEmail(),
      phone: this.generatePhone(),
      bankAccount: this.generateBankAccount(),
      driversLicense: this.generateDriversLicense(),
      ipAddress: this.generateIP(),
      apiKey: this.generateAPIKey(),
      bitcoin: this.generateBitcoin(),
      password: this.generatePassword(),
      devSecret: this.generateDevSecret()
    };
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DataGenerator };
}