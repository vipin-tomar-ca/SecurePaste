// Dictionary Compression using Bloom Filters for 12KB memory footprint
class CompressedDictionary {
  constructor(terms, expectedElements = 10000, falsePositiveRate = 0.01) {
    this.expectedElements = expectedElements;
    this.falsePositiveRate = falsePositiveRate;
    
    // Calculate optimal parameters
    this.bitArraySize = this.calculateBitArraySize(expectedElements, falsePositiveRate);
    this.numHashFunctions = this.calculateHashFunctions(this.bitArraySize, expectedElements);
    
    // Initialize bit array
    this.bitArray = new Uint8Array(Math.ceil(this.bitArraySize / 8));
    
    // Add all terms to the bloom filter
    if (terms && terms.length > 0) {
      terms.forEach(term => this.add(term));
    }
    
    console.log(`Bloom filter initialized: ${this.bitArraySize} bits, ${this.numHashFunctions} hash functions, ~${Math.ceil(this.bitArraySize / 8 / 1024)}KB memory`);
  }

  // Calculate optimal bit array size
  calculateBitArraySize(n, p) {
    return Math.ceil(-n * Math.log(p) / (Math.log(2) * Math.log(2)));
  }

  // Calculate optimal number of hash functions
  calculateHashFunctions(m, n) {
    return Math.ceil((m / n) * Math.log(2));
  }

  // Add term to bloom filter
  add(term) {
    const hashes = this.getHashes(term.toLowerCase());
    hashes.forEach(hash => {
      const bitIndex = hash % this.bitArraySize;
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      this.bitArray[byteIndex] |= (1 << bitOffset);
    });
  }

  // Check if term might be in the set (O(1) lookup)
  mightContain(term) {
    const hashes = this.getHashes(term.toLowerCase());
    return hashes.every(hash => {
      const bitIndex = hash % this.bitArraySize;
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      return (this.bitArray[byteIndex] & (1 << bitOffset)) !== 0;
    });
  }

  // Generate multiple hash values for a term
  getHashes(term) {
    const hashes = [];
    const hash1 = this.djb2Hash(term);
    const hash2 = this.sdbmHash(term);
    
    for (let i = 0; i < this.numHashFunctions; i++) {
      hashes.push(Math.abs(hash1 + i * hash2));
    }
    
    return hashes;
  }

  // DJB2 hash function
  djb2Hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return hash >>> 0; // Convert to unsigned 32-bit integer
  }

  // SDBM hash function
  sdbmHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
    }
    return hash >>> 0; // Convert to unsigned 32-bit integer
  }

  // Serialize bloom filter for storage
  serialize() {
    return {
      bitArray: Array.from(this.bitArray),
      bitArraySize: this.bitArraySize,
      numHashFunctions: this.numHashFunctions,
      expectedElements: this.expectedElements,
      falsePositiveRate: this.falsePositiveRate
    };
  }

  // Deserialize bloom filter from storage
  static deserialize(data) {
    const filter = new CompressedDictionary([], data.expectedElements, data.falsePositiveRate);
    filter.bitArray = new Uint8Array(data.bitArray);
    filter.bitArraySize = data.bitArraySize;
    filter.numHashFunctions = data.numHashFunctions;
    return filter;
  }

  // Get memory usage statistics
  getMemoryStats() {
    const bitArrayBytes = this.bitArray.length;
    const totalBytes = bitArrayBytes + 64; // Approximate overhead
    
    return {
      bitArraySize: this.bitArraySize,
      bitArrayBytes,
      totalBytes,
      totalKB: Math.ceil(totalBytes / 1024),
      efficiency: `${this.expectedElements} terms in ${Math.ceil(totalBytes / 1024)}KB`
    };
  }
}

// Dictionary manager with compression
class DictionaryManager {
  constructor() {
    this.compressedDictionaries = {};
    this.loadingPromises = {};
  }

  // Load and compress dictionaries
  async loadDictionaries(dictionaryConfig) {
    const loadPromises = Object.entries(dictionaryConfig).map(async ([category, terms]) => {
      if (this.loadingPromises[category]) {
        return this.loadingPromises[category];
      }

      this.loadingPromises[category] = this.compressDictionary(category, terms);
      return this.loadingPromises[category];
    });

    await Promise.all(loadPromises);
    
    // Log total memory usage
    const totalMemory = Object.values(this.compressedDictionaries)
      .reduce((sum, dict) => sum + dict.getMemoryStats().totalBytes, 0);
    
    console.log(`All dictionaries loaded: ${Math.ceil(totalMemory / 1024)}KB total memory`);
  }

  // Compress a dictionary category
  async compressDictionary(category, terms) {
    try {
      // Check if already compressed and stored
      const stored = await chrome.storage.local.get([`compressed_dict_${category}`]);
      
      if (stored[`compressed_dict_${category}`]) {
        this.compressedDictionaries[category] = CompressedDictionary.deserialize(
          stored[`compressed_dict_${category}`]
        );
        console.log(`Loaded compressed ${category} dictionary from storage`);
        return;
      }

      // Create new compressed dictionary
      const compressed = new CompressedDictionary(terms, terms.length * 1.5, 0.01);
      this.compressedDictionaries[category] = compressed;

      // Store compressed dictionary
      await chrome.storage.local.set({
        [`compressed_dict_${category}`]: compressed.serialize()
      });

      console.log(`Compressed ${category} dictionary: ${terms.length} terms -> ${compressed.getMemoryStats().totalKB}KB`);
    } catch (error) {
      console.error(`Failed to compress ${category} dictionary:`, error);
      // Fallback to uncompressed
      this.compressedDictionaries[category] = { 
        terms, 
        mightContain: (term) => terms.includes(term.toLowerCase())
      };
    }
  }

  // Fast lookup across all dictionaries
  findMatches(text, categories = null) {
    const matches = [];
    const searchCategories = categories || Object.keys(this.compressedDictionaries);
    
    // Split text into words for efficient searching
    const words = text.toLowerCase().split(/\s+/);
    
    searchCategories.forEach(category => {
      const dict = this.compressedDictionaries[category];
      if (!dict) return;

      words.forEach(word => {
        if (word.length >= 3 && dict.mightContain(word)) {
          matches.push({
            category,
            term: word,
            confidence: 0.8 // Slight reduction due to bloom filter false positives
          });
        }
      });

      // Also check multi-word phrases
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = words[i] + ' ' + words[i + 1];
        if (dict.mightContain(phrase)) {
          matches.push({
            category,
            term: phrase,
            confidence: 0.85
          });
        }
      }
    });

    return this.deduplicateMatches(matches);
  }

  // Remove duplicate matches
  deduplicateMatches(matches) {
    const seen = new Set();
    return matches.filter(match => {
      const key = `${match.category}:${match.term}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Add custom terms to a category
  async addCustomTerms(category, newTerms) {
    if (!this.compressedDictionaries[category]) {
      await this.compressDictionary(category, newTerms);
      return;
    }

    // Add terms to existing compressed dictionary
    newTerms.forEach(term => {
      this.compressedDictionaries[category].add(term);
    });

    // Update storage
    await chrome.storage.local.set({
      [`compressed_dict_${category}`]: this.compressedDictionaries[category].serialize()
    });

    console.log(`Added ${newTerms.length} custom terms to ${category} dictionary`);
  }

  // Get memory usage for all dictionaries
  getTotalMemoryUsage() {
    const stats = {};
    let totalBytes = 0;

    Object.entries(this.compressedDictionaries).forEach(([category, dict]) => {
      const memStats = dict.getMemoryStats ? dict.getMemoryStats() : { totalBytes: 0 };
      stats[category] = memStats;
      totalBytes += memStats.totalBytes || 0;
    });

    return {
      categories: stats,
      totalBytes,
      totalKB: Math.ceil(totalBytes / 1024),
      efficiency: `${Object.keys(this.compressedDictionaries).length} dictionaries in ${Math.ceil(totalBytes / 1024)}KB`
    };
  }

  // Clean up old compressed dictionaries
  async cleanup() {
    const keys = await chrome.storage.local.get();
    const keysToRemove = Object.keys(keys).filter(key => 
      key.startsWith('compressed_dict_') && 
      !Object.keys(this.compressedDictionaries).some(cat => key === `compressed_dict_${cat}`)
    );

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log(`Cleaned up ${keysToRemove.length} obsolete compressed dictionaries`);
    }
  }
}

// Export for use in detection engine
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CompressedDictionary, DictionaryManager };
} else {
  window.CompressedDictionary = CompressedDictionary;
  window.DictionaryManager = DictionaryManager;
}