import type { Stripe } from '@stripe/stripe-js';
import { ErrorHandler } from './errorHandler';
import { Analytics } from './analytics';
import { AuthService } from './auth';
import { getSupabaseClient, useSupabaseQuery } from './supabase';

export class StripeService {
  private static instance: StripeService;
  private stripe: Stripe | null = null;
  private errorHandler: ErrorHandler;
  private analytics: Analytics;
  private auth: AuthService;
  private query: ReturnType<typeof useSupabaseQuery>;

  private constructor() {
    this.errorHandler = ErrorHandler.getInstance();
    this.analytics = Analytics.getInstance();
    this.auth = AuthService.getInstance();
    this.query = useSupabaseQuery();
    this.initialize();
  }

  static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  private async initialize() {
    try {
      const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
      
      // Check if Stripe key is available and valid
      if (!stripeKey || typeof stripeKey !== 'string' || stripeKey.trim() === '') {
        console.warn('Stripe public key is missing or invalid. Stripe functionality will be unavailable.');
        return;
      }
      
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(stripeKey);
      this.stripe = stripe;
      
      if (!this.stripe) {
        throw new Error('Failed to initialize Stripe');
      }
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'StripeService.initialize'
      });
    }
  }

  async createSubscription(priceId: string): Promise<string | null> {
    try {
      if (!this.stripe) {
        console.warn('Stripe is not initialized. Subscription cannot be created.');
        return null;
      }
      
      const user = await this.auth.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Create subscription checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server responded with ${response.status}`);
      }

      const { sessionId } = await response.json();

      // Redirect to checkout
      if (this.stripe) {
        const { error } = await this.stripe.redirectToCheckout({
          sessionId
        });

        if (error) throw error;
      }

      this.analytics.trackEvent('subscription', 'checkout_started', priceId);
      return sessionId;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'StripeService.createSubscription',
        priceId
      });
      return null;
    }
  }

  async cancelSubscription(): Promise<boolean> {
    try {
      if (!this.stripe) {
        console.warn('Stripe is not initialized. Subscription cannot be cancelled.');
        return false;
      }
      
      const user = await this.auth.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Get current subscription to update the database
      const { data: subscription } = await this.query({
        table: 'subscriptions',
        operation: 'select',
        filters: { user_id: user.id }
      });

      if (!subscription || !subscription[0]?.stripe_subscription_id) {
        throw new Error('No active subscription found');
      }

      const stripeSubscriptionId = subscription[0].stripe_subscription_id;

      // Call Stripe API to cancel
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          subscriptionId: stripeSubscriptionId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server responded with ${response.status}`);
      }

      // Update local subscription record
      await this.query({
        table: 'subscriptions',
        operation: 'update',
        filters: {
          status: 'canceled',
          cancel_at: new Date().toISOString()
        },
        queryFilters: { user_id: user.id }
      });

      this.analytics.trackEvent('subscription', 'cancelled');
      return true;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'StripeService.cancelSubscription'
      });
      return false;
    }
  }

  async getSubscriptionStatus(): Promise<{
    active: boolean;
    trialEnd?: number;
    subscriptionEnd?: number;
  }> {
    try {
      const user = await this.auth.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Check database first
      const { data: subscription } = await this.query({
        table: 'subscriptions',
        operation: 'select',
        filters: { user_id: user.id }
      });

      if (subscription && subscription.length > 0) {
        const sub = subscription[0];
        
        // Convert database dates to timestamps
        const trialEnd = sub.trial_end ? new Date(sub.trial_end).getTime() : undefined;
        const subscriptionEnd = sub.current_period_end ? new Date(sub.current_period_end).getTime() : undefined;
        
        // Check if subscription is active based on status and dates
        const now = Date.now();
        const active = (
          (sub.status === 'trialing' && trialEnd && now < trialEnd) ||
          (sub.status === 'active' && subscriptionEnd && now < subscriptionEnd)
        );
        
        return {
          active,
          trialEnd,
          subscriptionEnd
        };
      }
      
      // If Stripe is not initialized, return inactive status
      if (!this.stripe) {
        return { active: false };
      }
      
      // Fallback to API call if no local data
      const response = await fetch(`/api/subscription-status?userId=${user.id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch subscription status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'StripeService.getSubscriptionStatus'
      });
      return { active: false };
    }
  }

  /**
   * Get prices from Stripe
   */
  async getPrices(): Promise<Array<{
    id: string; 
    product: string;
    amount: number;
    currency: string;
    interval: string;
    name: string;
  }>> {
    try {
      if (!this.stripe) {
        console.warn('Stripe is not initialized. Price data cannot be retrieved.');
        return [];
      }
      
      const response = await fetch('/api/get-prices');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.status}`);
      }
      
      const { prices } = await response.json();
      return prices || [];
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'StripeService.getPrices'
      });
      return [];
    }
  }
}