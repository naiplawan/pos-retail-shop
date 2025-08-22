'use client';

import { AdvancedCache, globalCache } from './advanced-cache';
import { logger } from './logger';

// Machine learning-inspired cache prediction
interface CachePattern {
  key: string;
  accessTimes: number[];
  frequency: number;
  recency: number;
  context: string[];
  userBehavior: 'sequential' | 'random' | 'cyclical';
}

interface CachePrediction {
  key: string;
  probability: number;
  confidence: number;
  suggestedAction: 'preload' | 'evict' | 'promote' | 'ignore';
  reasonCode: string;
}

// Smart cache management with predictive capabilities
export class IntelligentCacheManager {
  private patterns = new Map<string, CachePattern>();
  private userSessions = new Map<string, string[]>();
  private predictionHistory = new Map<string, { prediction: number; actual: boolean; timestamp: number }>();
  private learningEnabled = true;
  private predictionAccuracy = 0.5; // Start with 50% baseline

  constructor(private cache: AdvancedCache = globalCache) {
    this.startPatternAnalysis();
    this.startPredictivePreloading();
  }

  // Track access patterns for machine learning
  trackAccess(key: string, context: string[] = [], userId?: string): void {
    if (!this.learningEnabled) return;

    const now = Date.now();
    let pattern = this.patterns.get(key);

    if (!pattern) {
      pattern = {
        key,
        accessTimes: [],
        frequency: 0,
        recency: now,
        context: [],
        userBehavior: 'random'
      };
      this.patterns.set(key, pattern);
    }

    // Update pattern data
    pattern.accessTimes.push(now);
    pattern.frequency++;
    pattern.recency = now;
    pattern.context = [...new Set([...pattern.context, ...context])];

    // Analyze user behavior
    pattern.userBehavior = this.analyzeUserBehavior(pattern.accessTimes);

    // Track user session
    if (userId) {
      let session = this.userSessions.get(userId) || [];
      session.push(key);
      
      // Keep only last 50 accesses per user
      if (session.length > 50) {
        session = session.slice(-50);
      }
      
      this.userSessions.set(userId, session);
    }

    // Cleanup old access times (keep last 100)
    if (pattern.accessTimes.length > 100) {
      pattern.accessTimes = pattern.accessTimes.slice(-100);
    }

    this.updatePredictionAccuracy(key);
  }

  // Predict what to cache next based on patterns
  generatePredictions(limit = 10): CachePrediction[] {
    const predictions: CachePrediction[] = [];
    const now = Date.now();

    for (const [key, pattern] of this.patterns) {
      const prediction = this.calculateCacheProbability(pattern, now);
      
      if (prediction.probability > 0.3) { // Only consider high-probability predictions
        predictions.push({
          key,
          probability: prediction.probability,
          confidence: prediction.confidence,
          suggestedAction: this.determineSuggestedAction(prediction.probability, pattern),
          reasonCode: prediction.reasonCode
        });
      }
    }

    // Sort by probability * confidence score
    return predictions
      .sort((a, b) => (b.probability * b.confidence) - (a.probability * a.confidence))
      .slice(0, limit);
  }

  // Smart preloading based on predictions
  async executeIntelligentPreloading(
    dataLoader: (key: string) => Promise<any>,
    maxConcurrency = 3
  ): Promise<{ loaded: string[]; failed: string[] }> {
    const predictions = this.generatePredictions(maxConcurrency * 2);
    const preloadCandidates = predictions
      .filter(p => p.suggestedAction === 'preload')
      .slice(0, maxConcurrency);

    const loaded: string[] = [];
    const failed: string[] = [];

    const preloadPromises = preloadCandidates.map(async ({ key, probability }) => {
      try {
        // Check if already cached
        const existing = await this.cache.get(key);
        if (existing !== null) {
          return; // Already cached
        }

        logger.debug(`Predictive preloading: ${key} (probability: ${probability.toFixed(2)})`);
        
        const data = await dataLoader(key);
        await this.cache.set(key, data, {
          ttl: this.calculateOptimalTtl(key),
          tags: ['predictive', 'preload'],
          priority: probability > 0.8 ? 'high' : 'medium'
        });

        loaded.push(key);
        this.recordPredictionResult(key, true);
      } catch (error) {
        logger.error(`Failed to preload ${key}:`, error);
        failed.push(key);
        this.recordPredictionResult(key, false);
      }
    });

    await Promise.allSettled(preloadPromises);
    
    if (loaded.length > 0) {
      logger.info(`Intelligently preloaded ${loaded.length} items:`, loaded);
    }

    return { loaded, failed };
  }

  // Context-aware cache warming
  async warmCacheByContext(
    context: string[],
    dataLoader: (key: string) => Promise<any>,
    options: {
      maxItems?: number;
      minProbability?: number;
      userId?: string;
    } = {}
  ): Promise<void> {
    const { maxItems = 5, minProbability = 0.5, userId } = options;

    // Find patterns matching the context
    const contextualPatterns = Array.from(this.patterns.values())
      .filter(pattern => 
        pattern.context.some(ctx => context.includes(ctx)) &&
        this.calculateTimeProbability(pattern) > minProbability
      )
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, maxItems);

    // Include user-specific patterns
    if (userId) {
      const userSession = this.userSessions.get(userId) || [];
      const recentKeys = userSession.slice(-10); // Last 10 accesses
      
      for (const key of recentKeys) {
        const pattern = this.patterns.get(key);
        if (pattern && !contextualPatterns.includes(pattern)) {
          contextualPatterns.push(pattern);
        }
      }
    }

    // Warm cache for selected patterns
    const warmingPromises = contextualPatterns.map(async (pattern) => {
      try {
        const existing = await this.cache.get(pattern.key);
        if (existing === null) {
          const data = await dataLoader(pattern.key);
          await this.cache.set(pattern.key, data, {
            ttl: this.calculateOptimalTtl(pattern.key),
            tags: ['contextual', ...context],
            priority: 'medium'
          });
          
          logger.debug(`Context warmed: ${pattern.key} for context [${context.join(', ')}]`);
        }
      } catch (error) {
        logger.error(`Failed to warm cache for ${pattern.key}:`, error);
      }
    });

    await Promise.allSettled(warmingPromises);
  }

  // Adaptive TTL calculation based on access patterns
  calculateOptimalTtl(key: string): number {
    const pattern = this.patterns.get(key);
    if (!pattern || pattern.accessTimes.length < 2) {
      return 5 * 60 * 1000; // Default 5 minutes
    }

    // Calculate average time between accesses
    const intervals = [];
    for (let i = 1; i < pattern.accessTimes.length; i++) {
      intervals.push(pattern.accessTimes[i] - pattern.accessTimes[i - 1]);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
    // Base TTL on access frequency
    let ttl = avgInterval * 0.8; // 80% of average interval

    // Adjust based on user behavior
    switch (pattern.userBehavior) {
      case 'sequential':
        ttl *= 1.5; // Keep longer for sequential access
        break;
      case 'cyclical':
        ttl *= 2; // Keep much longer for cyclical patterns
        break;
      case 'random':
        ttl *= 0.6; // Shorter for random access
        break;
    }

    // Clamp between 1 minute and 2 hours
    return Math.max(60 * 1000, Math.min(ttl, 2 * 60 * 60 * 1000));
  }

  // Intelligent cache eviction based on predicted future use
  async intelligentEviction(targetMemoryReduction: number): Promise<number> {
    const entries = this.cache.exportCache();
    const now = Date.now();

    // Score each entry for eviction probability
    const scoredEntries = entries.map(({ key, entry }) => {
      const pattern = this.patterns.get(key);
      const futureUseProbability = pattern 
        ? this.calculateCacheProbability(pattern, now).probability
        : 0.1;

      const score = {
        key,
        entry,
        evictionScore: this.calculateEvictionScore(entry, futureUseProbability, now),
        futureUseProbability
      };

      return score;
    }).sort((a, b) => a.evictionScore - b.evictionScore); // Lower score = higher eviction priority

    let freedMemory = 0;
    let evicted = 0;

    for (const { key, entry, futureUseProbability } of scoredEntries) {
      if (freedMemory >= targetMemoryReduction) break;
      
      // Don't evict high-probability future use items
      if (futureUseProbability > 0.7) continue;
      
      // Don't evict critical priority items
      if (entry.priority === 'critical') continue;

      this.cache.delete(key);
      freedMemory += entry.size;
      evicted++;

      logger.debug(`Intelligently evicted: ${key} (future use probability: ${futureUseProbability.toFixed(2)})`);
    }

    logger.info(`Intelligent eviction freed ${freedMemory} bytes by removing ${evicted} entries`);
    return freedMemory;
  }

  // Private helper methods
  private calculateCacheProbability(pattern: CachePattern, now: number): {
    probability: number;
    confidence: number;
    reasonCode: string;
  } {
    if (pattern.accessTimes.length < 2) {
      return { probability: 0.1, confidence: 0.1, reasonCode: 'insufficient_data' };
    }

    // Time-based probability
    const timeProbability = this.calculateTimeProbability(pattern);
    
    // Frequency-based probability
    const frequencyProbability = Math.min(pattern.frequency / 10, 1);
    
    // Recency-based probability
    const recencyProbability = Math.max(0, 1 - (now - pattern.recency) / (24 * 60 * 60 * 1000));
    
    // Behavior-based adjustment
    let behaviorMultiplier = 1;
    switch (pattern.userBehavior) {
      case 'sequential':
        behaviorMultiplier = 1.2;
        break;
      case 'cyclical':
        behaviorMultiplier = 1.5;
        break;
      case 'random':
        behaviorMultiplier = 0.8;
        break;
    }

    // Combined probability with weighted factors
    const probability = (
      timeProbability * 0.4 +
      frequencyProbability * 0.3 +
      recencyProbability * 0.3
    ) * behaviorMultiplier;

    // Confidence based on data quality
    const confidence = Math.min(pattern.accessTimes.length / 20, 1) * this.predictionAccuracy;

    let reasonCode = 'pattern_analysis';
    if (pattern.userBehavior === 'cyclical') reasonCode = 'cyclical_pattern';
    if (frequencyProbability > 0.8) reasonCode = 'high_frequency';
    if (recencyProbability > 0.9) reasonCode = 'recent_access';

    return { probability, confidence, reasonCode };
  }

  private calculateTimeProbability(pattern: CachePattern): number {
    if (pattern.accessTimes.length < 3) return 0.3;

    const now = Date.now();
    const intervals = [];
    
    for (let i = 1; i < pattern.accessTimes.length; i++) {
      intervals.push(pattern.accessTimes[i] - pattern.accessTimes[i - 1]);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const timeSinceLastAccess = now - pattern.recency;

    // Higher probability if we're approaching the expected next access time
    const expectedNextAccess = pattern.recency + avgInterval;
    const timeToExpected = expectedNextAccess - now;

    if (timeToExpected <= 0) {
      return 0.9; // Overdue for access
    } else if (timeToExpected <= avgInterval * 0.2) {
      return 0.8; // Very close to expected time
    } else if (timeToExpected <= avgInterval * 0.5) {
      return 0.6; // Moderately close
    } else {
      return 0.2; // Still far from expected time
    }
  }

  private analyzeUserBehavior(accessTimes: number[]): 'sequential' | 'random' | 'cyclical' {
    if (accessTimes.length < 5) return 'random';

    const intervals = [];
    for (let i = 1; i < accessTimes.length; i++) {
      intervals.push(accessTimes[i] - accessTimes[i - 1]);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avgInterval;

    // Sequential: consistent short intervals
    if (avgInterval < 5 * 60 * 1000 && coefficientOfVariation < 0.3) {
      return 'sequential';
    }

    // Cyclical: consistent longer intervals
    if (coefficientOfVariation < 0.5) {
      return 'cyclical';
    }

    return 'random';
  }

  private determineSuggestedAction(probability: number, pattern: CachePattern): CachePrediction['suggestedAction'] {
    if (probability > 0.8) return 'preload';
    if (probability > 0.6 && pattern.frequency > 5) return 'promote';
    if (probability < 0.2 && pattern.frequency < 2) return 'evict';
    return 'ignore';
  }

  private calculateEvictionScore(entry: any, futureUseProbability: number, now: number): number {
    const ageScore = (now - entry.timestamp) / entry.ttl; // Higher age = higher eviction score
    const sizeScore = Math.log(entry.size + 1) / 10; // Larger size = higher eviction score
    const priorityScore = { low: 3, medium: 2, high: 1, critical: 0 }[entry.priority] || 2;
    const futureUseScore = 1 - futureUseProbability; // Lower future use = higher eviction score
    const hitScore = Math.max(0, 1 - entry.hits / 10); // Fewer hits = higher eviction score

    return ageScore + sizeScore + priorityScore + futureUseScore + hitScore;
  }

  private recordPredictionResult(key: string, wasAccessed: boolean): void {
    const prediction = this.predictionHistory.get(key);
    if (prediction) {
      // Update prediction accuracy
      const correct = (prediction.prediction > 0.5) === wasAccessed;
      const historySize = this.predictionHistory.size;
      
      this.predictionAccuracy = (this.predictionAccuracy * historySize + (correct ? 1 : 0)) / (historySize + 1);
    }

    this.predictionHistory.set(key, {
      prediction: prediction?.prediction || 0.5,
      actual: wasAccessed,
      timestamp: Date.now()
    });

    // Cleanup old predictions (keep last 1000)
    if (this.predictionHistory.size > 1000) {
      const entries = Array.from(this.predictionHistory.entries())
        .sort(([, a], [, b]) => b.timestamp - a.timestamp)
        .slice(0, 1000);
      
      this.predictionHistory.clear();
      entries.forEach(([key, value]) => this.predictionHistory.set(key, value));
    }
  }

  private updatePredictionAccuracy(key: string): void {
    // Check if we had a prediction for this access
    const prediction = this.predictionHistory.get(key);
    if (prediction) {
      const wasCorrect = prediction.prediction > 0.5; // We predicted it would be accessed
      const weight = 0.1; // Learning rate
      
      this.predictionAccuracy = this.predictionAccuracy * (1 - weight) + (wasCorrect ? 1 : 0) * weight;
    }
  }

  private startPatternAnalysis(): void {
    // Analyze patterns every 5 minutes
    setInterval(() => {
      this.analyzeAndOptimize();
    }, 5 * 60 * 1000);
  }

  private startPredictivePreloading(): void {
    // Run predictive preloading every 2 minutes
    setInterval(() => {
      const predictions = this.generatePredictions(3);
      const highConfidencePredictions = predictions.filter(p => 
        p.confidence > 0.7 && p.suggestedAction === 'preload'
      );

      if (highConfidencePredictions.length > 0) {
        logger.debug(`Found ${highConfidencePredictions.length} high-confidence preload opportunities`);
      }
    }, 2 * 60 * 1000);
  }

  private analyzeAndOptimize(): void {
    const patterns = Array.from(this.patterns.values());
    const now = Date.now();

    // Clean up old patterns (not accessed in 24 hours)
    const stalePatterns = patterns.filter(p => now - p.recency > 24 * 60 * 60 * 1000);
    stalePatterns.forEach(p => this.patterns.delete(p.key));

    if (stalePatterns.length > 0) {
      logger.debug(`Cleaned up ${stalePatterns.length} stale access patterns`);
    }

    // Log performance metrics
    logger.debug(`Cache Intelligence Stats: ${patterns.length} patterns tracked, ${this.predictionAccuracy.toFixed(2)} prediction accuracy`);
  }

  // Public API methods
  getPatternStats(): { totalPatterns: number; predictionAccuracy: number; userSessions: number } {
    return {
      totalPatterns: this.patterns.size,
      predictionAccuracy: this.predictionAccuracy,
      userSessions: this.userSessions.size
    };
  }

  enableLearning(): void {
    this.learningEnabled = true;
    logger.info('Cache learning enabled');
  }

  disableLearning(): void {
    this.learningEnabled = false;
    logger.info('Cache learning disabled');
  }

  exportPatterns(): Array<{ key: string; pattern: CachePattern }> {
    return Array.from(this.patterns.entries()).map(([key, pattern]) => ({ key, pattern }));
  }

  clearPatterns(): void {
    this.patterns.clear();
    this.userSessions.clear();
    this.predictionHistory.clear();
    this.predictionAccuracy = 0.5;
    logger.info('Cache patterns cleared');
  }
}

// Global intelligent cache manager
export const intelligentCache = new IntelligentCacheManager(globalCache);

// React hook for intelligent caching
export function useIntelligentCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    context?: string[];
    userId?: string;
    enablePredict?: boolean;
  } = {}
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { context = [], userId, enablePredict = true } = options;

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Track access pattern
        if (enablePredict) {
          intelligentCache.trackAccess(key, context, userId);
        }

        // Try cache first
        let result = await globalCache.get<T>(key);
        
        if (result === null) {
          // Cache miss - fetch data
          result = await fetcher();
          
          // Cache with intelligent TTL
          const ttl = enablePredict 
            ? intelligentCache.calculateOptimalTtl(key)
            : 5 * 60 * 1000;

          await globalCache.set(key, result, {
            ttl,
            tags: context,
            priority: 'medium'
          });
        }

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [key, JSON.stringify(context), userId, enablePredict]);

  return { data, loading, error };
}

export default intelligentCache;