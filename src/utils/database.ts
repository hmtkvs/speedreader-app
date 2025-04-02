import { getSupabaseClient, useSupabaseQuery } from './supabase';
import { ErrorHandler } from './errorHandler';

// Database utility service for shared database operations
export class DatabaseService {
  private static instance: DatabaseService;
  private errorHandler: ErrorHandler;
  private query: ReturnType<typeof useSupabaseQuery>;

  private constructor() {
    this.errorHandler = ErrorHandler.getInstance();
    this.query = useSupabaseQuery();
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Get database health status
   */
  async checkHealth(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      
      // Simple query to check connection
      const { data, error } = await supabase
        .from('subscriptions')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      return {
        healthy: !error,
        error: error?.message
      };
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'DatabaseService.checkHealth'
      });
      
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }
}