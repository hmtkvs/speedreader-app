import { Analytics } from './analytics';
import { ErrorHandler } from './errorHandler';
import { StripeService } from './stripe';
import { AuthService } from './auth';
import { getSupabaseClient, useSupabaseQuery } from './supabase';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Pro Monthly',
    price: 4.99,
    interval: 'month',
    features: [
      'Unlimited reading',
      'PDF support',
      'Text-to-speech',
      'Translation features',
      'Cloud backup',
      'Priority support'
    ]
  },
  {
    id: 'yearly',
    name: 'Pro Yearly',
    price: 49.99,
    interval: 'year',
    features: [
      'All monthly features',
      '2 months free',
      'Early access to new features',
      'Advanced statistics'
    ]
  }
];

export class SubscriptionService {
  private static instance: SubscriptionService;
  private analytics: Analytics;
  private errorHandler: ErrorHandler;
  private stripe: StripeService;
  private auth: AuthService;
  private query: ReturnType<typeof useSupabaseQuery>;
  private readonly TRIAL_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

  private constructor() {
    this.analytics = Analytics.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.stripe = StripeService.getInstance();
    this.auth = AuthService.getInstance();
    this.query = useSupabaseQuery();
  }

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  async initialize(): Promise<void> {
    try {
      const user = await this.auth.getCurrentUser();
      if (!user) return;

      // Check if user already has a subscription record
      const { data: subscription } = await this.query({
        table: 'subscriptions',
        operation: 'select',
        filters: { user_id: user.id }
      });

      // If no subscription, create a trial
      if (!subscription || subscription.length === 0) {
        const status = await this.stripe.getSubscriptionStatus();
        if (!status.active && !status.trialEnd) {
          // Start trial
          const trialEnd = new Date(Date.now() + this.TRIAL_DURATION);
          
          // Create trial subscription in database
          await this.query({
            table: 'subscriptions',
            operation: 'insert',
            filters: {
              user_id: user.id,
              status: 'trialing',
              plan_id: 'trial',
              trial_end: trialEnd.toISOString()
            }
          });
          
          this.analytics.trackEvent('subscription', 'trial_started');
        }
      }
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'SubscriptionService.initialize'
      });
    }
  }

  async checkAccess(): Promise<{
    hasAccess: boolean;
    trialDaysLeft: number | null;
    subscriptionDaysLeft: number | null;
  }> {
    try {
      const user = await this.auth.getCurrentUser();
      if (!user) return { hasAccess: false, trialDaysLeft: null, subscriptionDaysLeft: null };

      // Get current subscription from database
      const { data: subscription } = await this.query({
        table: 'subscriptions',
        operation: 'select',
        filters: { user_id: user.id }
      });

      const now = Date.now();
      
      // If subscription exists, check status and dates
      if (subscription && subscription.length > 0) {
        const sub = subscription[0];
        
        // Convert database dates to timestamps
        const trialEnd = sub.trial_end ? new Date(sub.trial_end).getTime() : undefined;
        const subscriptionEnd = sub.current_period_end ? new Date(sub.current_period_end).getTime() : undefined;
        
        // Check if subscription is active based on status and dates
        if (sub.status === 'trialing' && trialEnd && now < trialEnd) {
          const daysLeft = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));
          return { hasAccess: true, trialDaysLeft: daysLeft, subscriptionDaysLeft: null };
        }

        if (sub.status === 'active' && subscriptionEnd && now < subscriptionEnd) {
          const daysLeft = Math.ceil((subscriptionEnd - now) / (24 * 60 * 60 * 1000));
          return { hasAccess: true, trialDaysLeft: null, subscriptionDaysLeft: daysLeft };
        }
      }

      // Fallback to Stripe check if no valid subscription found
      const status = await this.stripe.getSubscriptionStatus();
      
      if (status.trialEnd && now < status.trialEnd) {
        const daysLeft = Math.ceil((status.trialEnd - now) / (24 * 60 * 60 * 1000));
        return { hasAccess: true, trialDaysLeft: daysLeft, subscriptionDaysLeft: null };
      }

      if (status.active && status.subscriptionEnd && now < status.subscriptionEnd) {
        const daysLeft = Math.ceil((status.subscriptionEnd - now) / (24 * 60 * 60 * 1000));
        return { hasAccess: true, trialDaysLeft: null, subscriptionDaysLeft: daysLeft };
      }

      return { hasAccess: false, trialDaysLeft: null, subscriptionDaysLeft: null };
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'SubscriptionService.checkAccess'
      });
      return { hasAccess: false, trialDaysLeft: null, subscriptionDaysLeft: null };
    }
  }

  async subscribe(planId: string): Promise<boolean> {
    try {
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan) throw new Error('Invalid plan');

      // Create Stripe checkout session
      const sessionId = await this.stripe.createSubscription(planId);
      if (!sessionId) throw new Error('Failed to create subscription');

      // Track event
      this.analytics.trackEvent('subscription', 'subscribed', planId);
      return true;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'SubscriptionService.subscribe',
        planId
      });
      return false;
    }
  }

  async cancelSubscription(): Promise<boolean> {
    try {
      const success = await this.stripe.cancelSubscription();
      if (!success) throw new Error('Failed to cancel subscription');

      // Update local subscription record
      const user = await this.auth.getCurrentUser();
      if (user) {
        await this.query({
          table: 'subscriptions',
          operation: 'update',
          filters: {
            status: 'canceled',
            cancel_at: new Date().toISOString()
          },
          queryFilters: { user_id: user.id }
        });
      }

      this.analytics.trackEvent('subscription', 'cancelled');
      return true;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'SubscriptionService.cancelSubscription'
      });
      return false;
    }
  }

  /**
   * Get detailed subscription information
   */
  async getSubscriptionDetails(): Promise<{
    status: string;
    planId: string;
    trialEnd?: Date;
    currentPeriodEnd?: Date;
    cancelAt?: Date;
    createdAt?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  } | null> {
    try {
      const user = await this.auth.getCurrentUser();
      if (!user) return null;

      const { data, error } = await this.query({
        table: 'subscriptions',
        operation: 'select',
        filters: { user_id: user.id }
      });

      if (error || !data || data.length === 0) return null;

      const subscription = data[0];
      
      return {
        status: subscription.status,
        planId: subscription.plan_id,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end) : undefined,
        currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end) : undefined,
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at) : undefined,
        createdAt: subscription.created_at ? new Date(subscription.created_at) : undefined,
        stripeCustomerId: subscription.stripe_customer_id,
        stripeSubscriptionId: subscription.stripe_subscription_id
      };
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'SubscriptionService.getSubscriptionDetails'
      });
      return null;
    }
  }

  /**
   * Update subscription record with Stripe data
   */
  async updateSubscriptionFromStripe(stripeData: {
    subscriptionId: string;
    customerId: string;
    status: string;
    planId: string;
    currentPeriodEnd: string;
    cancelAt?: string;
  }): Promise<boolean> {
    try {
      const user = await this.auth.getCurrentUser();
      if (!user) return false;

      const { error } = await this.query({
        table: 'subscriptions',
        operation: 'update',
        filters: {
          stripe_subscription_id: stripeData.subscriptionId,
          stripe_customer_id: stripeData.customerId,
          status: stripeData.status,
          plan_id: stripeData.planId,
          current_period_end: stripeData.currentPeriodEnd,
          cancel_at: stripeData.cancelAt || null,
          updated_at: new Date().toISOString()
        },
        queryFilters: { user_id: user.id }
      });

      return !error;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'SubscriptionService.updateSubscriptionFromStripe'
      });
      return false;
    }
  }
}