import { createClient } from '@supabase/supabase-js';
import { ErrorHandler } from './errorHandler';

// Singleton Supabase client implementation
class SupabaseClient {
  private static instance: SupabaseClient;
  private client: ReturnType<typeof createClient>;
  private errorHandler: ErrorHandler;
  private initialized: boolean = false;

  private constructor() {
    this.errorHandler = ErrorHandler.getInstance();

    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    this.client = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true
        }
      }
    );
    this.initialized = true;
  }

  public static getInstance(): SupabaseClient {
    if (!SupabaseClient.instance) {
      SupabaseClient.instance = new SupabaseClient();
    }
    return SupabaseClient.instance;
  }

  public getClient(): ReturnType<typeof createClient> {
    if (!this.initialized) {
      throw new Error('Supabase client not initialized');
    }
    return this.client;
  }

  /**
   * Performs a database query with error handling and logging
   */
  public async query<T = any>({
    table,
    operation,
    fields = '*',
    filters = {},
    queryFilters = {},
    order,
    limit
  }: {
    table: string;
    operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
    fields?: string;
    filters?: Record<string, any>;
    queryFilters?: Record<string, any>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
  }): Promise<{ data: T | null; error: any }> {
    try {
      let query = this.client.from(table);

      // Apply operation
      switch (operation) {
        case 'select':
          query = query.select(fields);
          break;
        case 'insert':
          query = query.insert(filters);
          break;
        case 'update':
          // For update, we need separate objects for the data to update and the filters
          query = query.update(filters);
          if (queryFilters && Object.keys(queryFilters).length > 0) {
            Object.entries(queryFilters).forEach(([key, value]) => {
              // @ts-ignore - type issues with filter methods
              query = query.eq(key, value);
            });
          }
          break;
        case 'upsert':
          query = query.upsert(filters);
          break;
        case 'delete':
          query = query.delete();
          break;
      }

      // Apply filters for select operations
      if ((operation === 'select' || operation === 'delete') && Object.keys(filters).length > 0) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            // @ts-ignore - type issues with filter methods
            query = query.eq(key, value);
          }
        });
      }

      // Apply ordering
      if (order) {
        query = query.order(order.column, { ascending: order.ascending ?? true });
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      // Execute query
      const { data, error } = await query;

      if (error) {
        this.errorHandler.handleError(error, {
          context: `SupabaseClient.query.${operation}`,
          table,
          filters
        });
      }

      return { data, error };
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: `SupabaseClient.query.${operation}`,
        table
      });
      return { data: null, error };
    }
  }

  /**
   * Check the database connection health
   */
  public async checkHealth(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // Test a simple query to check connectivity
      const { error } = await this.client
        .from('subscriptions')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      return {
        healthy: !error,
        error: error?.message
      };
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'SupabaseClient.checkHealth'
      });
      
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }
}

// Export a function to get the Supabase client instance
export function getSupabaseClient(): ReturnType<typeof createClient> {
  return SupabaseClient.getInstance().getClient();
}

// Export the query helper
export function useSupabaseQuery() {
  return SupabaseClient.getInstance().query.bind(SupabaseClient.getInstance());
}