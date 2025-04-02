import { Analytics } from './analytics';
import { ErrorHandler } from './errorHandler';

interface ReadingSession {
  date: number;
  duration: number;
  wordsRead: number;
  averageWPM: number;
  startWPM: number;
  endWPM: number;
  fontsize: number;
}

interface DailyStats {
  lastUpdated: number;
  totalTimeRead: number;
  totalWordsRead: number;
  averageWPM: number;
  sessionsCompleted: number;
}

export interface UserStats {
  readingSessions: ReadingSession[];
  dailyStats: DailyStats;
}

class StatisticsService {
  private static instance: StatisticsService;
  private analytics: Analytics;
  private errorHandler: ErrorHandler;
  private currentSession: {
    startTime: number;
    startWPM: number;
    wordCount: number;
  } | null = null;
  private readonly STORAGE_KEY = 'speedreader_stats';
  // Key for localStorage caching
  private readonly CACHE_KEY = 'speedreader_stats_cache';
  // Cache TTL in milliseconds (1 hour)
  private readonly CACHE_TTL = 60 * 60 * 1000;

  private constructor() {
    this.analytics = Analytics.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
  }

  static getInstance(): StatisticsService {
    if (!StatisticsService.instance) {
      StatisticsService.instance = new StatisticsService();
    }
    return StatisticsService.instance;
  }

  startSession(startWPM: number): void {
    this.currentSession = {
      startTime: Date.now(),
      startWPM,
      wordCount: 0
    };
    
    // Track session start in analytics
    this.analytics.trackEvent('reading_session', 'started', undefined, startWPM);
  }

  updateWordCount(wordsRead: number): void {
    if (this.currentSession) {
      this.currentSession.wordCount += wordsRead;
      
      // Save a checkpoint to persist progress even if the session doesn't end properly
      if (this.currentSession.wordCount % 100 === 0) { // Save every 100 words
        this.saveCheckpoint(this.currentSession.wordCount);
      }
    }
  }

  private saveCheckpoint(currentWordCount: number): void {
    try {
      // Save progress to localStorage in case the session is interrupted
      if (!this.currentSession) return;
      
      localStorage.setItem('speedreader_checkpoint', JSON.stringify({
        startTime: this.currentSession.startTime,
        startWPM: this.currentSession.startWPM,
        wordCount: currentWordCount,
        timestamp: Date.now()
      }));
    } catch (error) {
      // Silent fail - this is just a backup
      console.warn('Failed to save reading checkpoint', error);
    }
  }
  
  private recoverInterruptedSession(): boolean {
    try {
      const checkpointData = localStorage.getItem('speedreader_checkpoint');
      if (!checkpointData) return false;
      
      const checkpoint = JSON.parse(checkpointData);
      
      // Check if checkpoint is recent (within last 4 hours)
      if (Date.now() - checkpoint.timestamp > 4 * 60 * 60 * 1000) {
        localStorage.removeItem('speedreader_checkpoint');
        return false;
      }
      
      // If session duration is reasonable (5+ seconds) and has words, recover it
      const duration = (checkpoint.timestamp - checkpoint.startTime) / 1000;
      if (duration > 5 && checkpoint.wordCount > 0) {
        const sessionStats: ReadingSession = {
          date: checkpoint.startTime,
          duration: duration,
          wordsRead: checkpoint.wordCount,
          averageWPM: checkpoint.wordCount / (duration / 60),
          startWPM: checkpoint.startWPM,
          endWPM: checkpoint.startWPM, // Use start as end since we don't know actual end
          fontsize: 60 // Default font size since we don't have this info
        };
        
        const stats = this.getStats();
        stats.readingSessions.push(sessionStats);
        
        this.updateDailyStats(stats, sessionStats);
        this.saveStats(stats);
        
        // Clear the checkpoint
        localStorage.removeItem('speedreader_checkpoint');
        
        // Track recovered session
        this.analytics.trackEvent('reading_session', 'recovered', undefined, checkpoint.wordCount);
        
        return true;
      }
      
      return false;
    } catch (error) {
      localStorage.removeItem('speedreader_checkpoint');
      return false;
    }
  }

  endSession(endWPM: number, fontSize: number): void {
    if (!this.currentSession) return;

    try {
      const duration = (Date.now() - this.currentSession.startTime) / 1000;
      
      // Only record sessions that have meaningful duration and word count
      if (duration < 3 || this.currentSession.wordCount < 5) {
        this.currentSession = null;
        return;
      }
      
      const sessionStats: ReadingSession = {
        date: Date.now(),
        duration,
        wordsRead: this.currentSession.wordCount,
        averageWPM: this.currentSession.wordCount / (duration / 60),
        startWPM: this.currentSession.startWPM,
        endWPM,
        fontsize: fontSize
      };

      const stats = this.getStats();
      stats.readingSessions.push(sessionStats);
      
      this.updateDailyStats(stats, sessionStats);
      
      this.saveStats(stats);
      
      // Clear any checkpoint
      localStorage.removeItem('speedreader_checkpoint');
      
      // Clear cache to ensure fresh data
      this.clearCache();
      
      // Track analytics
      this.analytics.trackEvent('reading_session', 'completed', undefined, sessionStats.wordsRead);
      
      this.currentSession = null;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'StatisticsService.endSession'
      });
      this.currentSession = null;
    }
  }

  private getStats(): UserStats {
    try {
      // Try to get data from cache first
      const cachedStats = this.getFromCache();
      if (cachedStats) {
        return cachedStats;
      }
      
      // Attempt to recover any interrupted sessions
      this.recoverInterruptedSession();
      
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const today = new Date();
      
      // Create mock data only if no data exists
      if (!stored) {
        const mockData = this.createInitialMockData(today);
        // Cache the result
        this.saveToCache(mockData);
        return mockData;
      }
      
      const parsedData = JSON.parse(stored);
      
      // Ensure data structure is valid, fix if needed
      if (!parsedData.readingSessions) {
        parsedData.readingSessions = [];
      }
      
      if (!parsedData.dailyStats) {
        parsedData.dailyStats = {
          lastUpdated: today.getTime(),
          totalTimeRead: 0,
          totalWordsRead: 0,
          averageWPM: 0,
          sessionsCompleted: 0
        };
      }
      
      // Sort sessions by date (newest first)
      parsedData.readingSessions.sort((a: ReadingSession, b: ReadingSession) => b.date - a.date);
      
      // Cache the result
      this.saveToCache(parsedData);
      
      return parsedData;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'StatisticsService.getStats'
      });
      const today = new Date();
      const defaultStats = {
        readingSessions: [],
        dailyStats: {
          lastUpdated: today.getTime(),
          totalTimeRead: 0,
          totalWordsRead: 0,
          averageWPM: 0,
          sessionsCompleted: 0
        }
      };
      return defaultStats;
    }
  }

  private createInitialMockData(today: Date): UserStats {
    return {
      readingSessions: [
        {
          date: today.getTime() - 6 * 24 * 60 * 60 * 1000, // 6 days ago
          duration: 1200,
          wordsRead: 3000,
          averageWPM: 195,
          startWPM: 180,
          endWPM: 195,
          fontsize: 60
        },
        {
          date: today.getTime() - 4 * 24 * 60 * 60 * 1000, // 4 days ago
          duration: 1800,
          wordsRead: 4200,
          averageWPM: 245,
          startWPM: 220,
          endWPM: 245,
          fontsize: 60
        },
        {
          date: today.getTime() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
          duration: 1600,
          wordsRead: 3800,
          averageWPM: 230,
          startWPM: 245,
          endWPM: 230,
          fontsize: 60
        },
        {
          date: today.getTime(), // Today
          duration: 2000,
          wordsRead: 4800,
          averageWPM: 260,
          startWPM: 230,
          endWPM: 260,
          fontsize: 60
        }
      ],
      dailyStats: {
        lastUpdated: today.getTime(),
        totalTimeRead: 2000,
        totalWordsRead: 4800,
        averageWPM: 260,
        sessionsCompleted: 1
      }
    };
  }

  private saveStats(stats: UserStats): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats));
      // Update cache
      this.saveToCache(stats);
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'StatisticsService.saveStats'
      });
    }
  }

  private updateDailyStats(stats: UserStats, session: ReadingSession): void {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastUpdate = new Date(stats.dailyStats.lastUpdated).toISOString().split('T')[0];

      if (today !== lastUpdate) {
        // Reset daily stats for new day
        stats.dailyStats = {
          lastUpdated: Date.now(),
          totalTimeRead: session.duration,
          totalWordsRead: session.wordsRead,
          averageWPM: session.averageWPM,
          sessionsCompleted: 1
        };
      } else {
        // Update existing daily stats
        const { dailyStats } = stats;
        dailyStats.totalTimeRead += session.duration;
        dailyStats.totalWordsRead += session.wordsRead;
        
        // Weighted average based on word count
        const totalWords = dailyStats.totalWordsRead;
        const prevWords = totalWords - session.wordsRead;
        
        if (totalWords > 0) {
          dailyStats.averageWPM = (
            (dailyStats.averageWPM * prevWords) + 
            (session.averageWPM * session.wordsRead)
          ) / totalWords;
        } else {
          dailyStats.averageWPM = session.averageWPM;
        }
        
        dailyStats.sessionsCompleted += 1;
        dailyStats.lastUpdated = Date.now();
      }
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'StatisticsService.updateDailyStats'
      });
    }
  }

  // Cache methods to improve performance
  private saveToCache(stats: UserStats): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify({
        data: stats,
        timestamp: Date.now()
      }));
    } catch (error) {
      // Silent fail for cache operations
      console.warn('Failed to cache reading stats', error);
    }
  }
  
  private getFromCache(): UserStats | null {
    try {
      const cachedData = localStorage.getItem(this.CACHE_KEY);
      if (!cachedData) return null;
      
      const { data, timestamp } = JSON.parse(cachedData);
      
      // Check if cache is still valid
      if (Date.now() - timestamp > this.CACHE_TTL) {
        this.clearCache();
        return null;
      }
      
      return data;
    } catch (error) {
      this.clearCache();
      return null;
    }
  }
  
  private clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      // Silent fail
    }
  }

  getReadingStats(): UserStats {
    return this.getStats();
  }

  getProgressTrend(): { improvement: number; lastWeekAverage: number; thisWeekAverage: number } {
    try {
      const stats = this.getStats();
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
      
      // Get sessions from this week and last week
      const thisWeekSessions = stats.readingSessions.filter(s => s.date >= oneWeekAgo && s.date <= now);
      const lastWeekSessions = stats.readingSessions.filter(s => s.date >= twoWeeksAgo && s.date < oneWeekAgo);
      
      // Calculate averages with word count weighting
      const calculateWeightedAverage = (sessions: ReadingSession[]): number => {
        if (sessions.length === 0) return 0;
        
        const totalWords = sessions.reduce((sum, s) => sum + s.wordsRead, 0);
        if (totalWords === 0) return 0;
        
        const weightedSum = sessions.reduce((sum, s) => sum + (s.averageWPM * s.wordsRead), 0);
        return weightedSum / totalWords;
      };
      
      const thisWeekAverage = calculateWeightedAverage(thisWeekSessions);
      const lastWeekAverage = calculateWeightedAverage(lastWeekSessions);
      
      // Calculate improvement percentage
      const improvement = lastWeekAverage > 0 
        ? ((thisWeekAverage - lastWeekAverage) / lastWeekAverage) * 100 
        : 0;
      
      return {
        improvement,
        lastWeekAverage,
        thisWeekAverage
      };
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'StatisticsService.getProgressTrend'
      });
      
      return {
        improvement: 0,
        lastWeekAverage: 0,
        thisWeekAverage: 0
      };
    }
  }
  
  /**
   * Get reading data for specific date range
   */
  getReadingDataForRange(
    startDate: Date,
    endDate: Date
  ): { sessions: ReadingSession[]; totalWords: number; totalTime: number; avgWPM: number } {
    try {
      const stats = this.getStats();
      
      const startTime = startDate.getTime();
      const endTime = endDate.getTime();
      
      const sessions = stats.readingSessions.filter(
        s => s.date >= startTime && s.date <= endTime
      );
      
      const totalWords = sessions.reduce((sum, s) => sum + s.wordsRead, 0);
      const totalTime = sessions.reduce((sum, s) => sum + s.duration, 0);
      
      const avgWPM = totalTime > 0 
        ? totalWords / (totalTime / 60)
        : 0;
      
      return {
        sessions,
        totalWords,
        totalTime,
        avgWPM
      };
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'StatisticsService.getReadingDataForRange'
      });
      
      return {
        sessions: [],
        totalWords: 0,
        totalTime: 0,
        avgWPM: 0
      };
    }
  }
  
  /**
   * Clear all reading statistics (for testing or user request)
   */
  clearAllStats(): boolean {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem('speedreader_checkpoint');
      return true;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'StatisticsService.clearAllStats'
      });
      return false;
    }
  }
}

export { StatisticsService }