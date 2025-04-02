interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitInfo {
  remaining: number;
  reset: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  private constructor(config: RateLimitConfig) {
    this.config = config;
  }

  static getInstance(config?: RateLimitConfig): RateLimiter {
    if (!RateLimiter.instance && config) {
      RateLimiter.instance = new RateLimiter(config);
    }
    return RateLimiter.instance;
  }

  checkLimit(key: string): RateLimitInfo {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get existing requests for this key
    let keyRequests = this.requests.get(key) || [];

    // Remove expired timestamps
    keyRequests = keyRequests.filter(timestamp => timestamp > windowStart);

    // Check if limit is exceeded
    const remaining = Math.max(0, this.config.maxRequests - keyRequests.length);
    const reset = Math.ceil((windowStart + this.config.windowMs - now) / 1000);

    // Update requests
    this.requests.set(key, keyRequests);

    return { remaining, reset };
  }

  async tryRequest(key: string): Promise<boolean> {
    const { remaining } = this.checkLimit(key);
    
    if (remaining > 0) {
      const now = Date.now();
      const keyRequests = this.requests.get(key) || [];
      keyRequests.push(now);
      this.requests.set(key, keyRequests);
      return true;
    }

    return false;
  }

  clearExpired(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(ts => ts > windowStart);
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }
}