import type { User } from '@supabase/supabase-js';
import { ErrorHandler } from './errorHandler';
import { Analytics } from './analytics';
import { Monitoring } from './monitoring';
import { getSupabaseClient } from './supabase';

export class AuthService {
  private static instance: AuthService;
  private errorHandler: ErrorHandler;
  private analytics: Analytics;
  private monitoring: Monitoring;
  private initialized: boolean = false;

  private constructor() {
    this.errorHandler = ErrorHandler.getInstance();
    this.analytics = Analytics.getInstance();
    this.monitoring = Monitoring.getInstance();
    this.initialize();
  }

  private async initialize() {
    if (this.initialized) return;
    
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        this.analytics.setUserProperties({
          userId: user.id,
          email: user.email || ''
        });
        this.monitoring.setUser({
          id: user.id,
          email: user.email || undefined
        });
      }
      
      this.initialized = true;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'AuthService.initialize'
      });
      this.monitoring.captureError(error as Error, {
        context: 'AuthService.initialize'
      });
    }
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async signUp(email: string, password: string): Promise<boolean> {
    try {
      await this.initialize();
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      this.analytics.trackEvent('auth', 'sign_up');
      return true;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'AuthService.signUp'
      });
      return false;
    }
  }

  async signIn(email: string, password: string): Promise<boolean> {
    try {
      await this.initialize();
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      this.analytics.trackEvent('auth', 'sign_in');
      return true;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'AuthService.signIn'
      });
      return false;
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.initialize();
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      this.analytics.trackEvent('auth', 'sign_out');
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'AuthService.signOut'
      });
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      await this.initialize();
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        this.analytics.setUserProperties({
          userId: user.id,
          email: user.email || ''
        });
      }
      
      return user;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'AuthService.getCurrentUser'
      });
      return null;
    }
  }

  onAuthStateChange(callback: (user: any) => void) {
    this.initialize();
    const supabase = getSupabaseClient();
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });
  }
}