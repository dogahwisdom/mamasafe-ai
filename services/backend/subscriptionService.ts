/**
 * Subscription Service
 * 
 * Manages facility subscriptions, billing, and plan management
 */

import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';

export interface Subscription {
  id: string;
  facilityId: string;
  facilityName: string;
  planName: 'basic' | 'standard' | 'premium' | 'enterprise';
  status: 'active' | 'suspended' | 'cancelled' | 'trial';
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  price: number;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  paymentMethod?: string;
  lastPaymentDate?: string;
  nextBillingDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  name: 'basic' | 'standard' | 'premium' | 'enterprise';
  displayName: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  yearlyPrice: number;
  features: string[];
  maxPatients?: number;
  maxFacilities?: number;
}

export interface SubscriptionMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  monthlyRevenue: number;
  annualRecurringRevenue: number;
  averageRevenuePerUser: number;
}

export class SubscriptionService {
  /**
   * Get all subscriptions
   */
  public async getAllSubscriptions(): Promise<Subscription[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching subscriptions:', error);
        return [];
      }

      return (data || []).map((s: any) => ({
        id: s.id,
        facilityId: s.facility_id,
        facilityName: s.facility_name,
        planName: s.plan_name,
        status: s.status,
        billingCycle: s.billing_cycle,
        price: parseFloat(s.price),
        startDate: s.start_date,
        endDate: s.end_date,
        autoRenew: s.auto_renew,
        paymentMethod: s.payment_method,
        lastPaymentDate: s.last_payment_date,
        nextBillingDate: s.next_billing_date,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));
    }

    return [];
  }

  /**
   * Get subscription by facility ID
   */
  public async getSubscriptionByFacility(facilityId: string): Promise<Subscription | null> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        facilityId: data.facility_id,
        facilityName: data.facility_name,
        planName: data.plan_name,
        status: data.status,
        billingCycle: data.billing_cycle,
        price: parseFloat(data.price),
        startDate: data.start_date,
        endDate: data.end_date,
        autoRenew: data.auto_renew,
        paymentMethod: data.payment_method,
        lastPaymentDate: data.last_payment_date,
        nextBillingDate: data.next_billing_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    return null;
  }

  /**
   * Create or update subscription
   */
  public async upsertSubscription(subscription: Partial<Subscription>): Promise<Subscription> {
    if (isSupabaseConfigured()) {
      const subscriptionData: any = {
        facility_id: subscription.facilityId,
        facility_name: subscription.facilityName,
        plan_name: subscription.planName,
        status: subscription.status,
        billing_cycle: subscription.billingCycle,
        price: subscription.price,
        start_date: subscription.startDate,
        end_date: subscription.endDate,
        auto_renew: subscription.autoRenew,
        payment_method: subscription.paymentMethod,
        last_payment_date: subscription.lastPaymentDate,
        next_billing_date: subscription.nextBillingDate,
      };

      const { data, error } = await supabase
        .from('subscriptions')
        .upsert(subscriptionData, {
          onConflict: 'facility_id',
        })
        .select()
        .single();

      if (error) {
        console.error('Error upserting subscription:', error);
        throw error;
      }

      return {
        id: data.id,
        facilityId: data.facility_id,
        facilityName: data.facility_name,
        planName: data.plan_name,
        status: data.status,
        billingCycle: data.billing_cycle,
        price: parseFloat(data.price),
        startDate: data.start_date,
        endDate: data.end_date,
        autoRenew: data.auto_renew,
        paymentMethod: data.payment_method,
        lastPaymentDate: data.last_payment_date,
        nextBillingDate: data.next_billing_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    throw new Error('Supabase not configured');
  }

  /**
   * Update subscription status
   */
  public async updateSubscriptionStatus(
    subscriptionId: string,
    status: Subscription['status']
  ): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status })
        .eq('id', subscriptionId);

      if (error) {
        console.error('Error updating subscription status:', error);
        throw error;
      }
    }
  }

  /**
   * Get subscription metrics
   */
  public async getSubscriptionMetrics(): Promise<SubscriptionMetrics> {
    const subscriptions = await this.getAllSubscriptions();
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const trialSubscriptions = subscriptions.filter(s => s.status === 'trial');
    const cancelledSubscriptions = subscriptions.filter(s => s.status === 'cancelled');

    // Calculate revenue
    let monthlyRevenue = 0;
    let annualRecurringRevenue = 0;

    activeSubscriptions.forEach(sub => {
      let monthlyPrice = sub.price;
      if (sub.billingCycle === 'quarterly') {
        monthlyPrice = sub.price / 3;
      } else if (sub.billingCycle === 'yearly') {
        monthlyPrice = sub.price / 12;
      }
      monthlyRevenue += monthlyPrice;
      annualRecurringRevenue += monthlyPrice * 12;
    });

    const averageRevenuePerUser = activeSubscriptions.length > 0
      ? monthlyRevenue / activeSubscriptions.length
      : 0;

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      trialSubscriptions: trialSubscriptions.length,
      cancelledSubscriptions: cancelledSubscriptions.length,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      annualRecurringRevenue: Math.round(annualRecurringRevenue * 100) / 100,
      averageRevenuePerUser: Math.round(averageRevenuePerUser * 100) / 100,
    };
  }

  /**
   * Get available subscription plans
   */
  public getAvailablePlans(): SubscriptionPlan[] {
    return [
      {
        name: 'basic',
        displayName: 'Basic',
        monthlyPrice: 5000,
        quarterlyPrice: 13500,
        yearlyPrice: 48000,
        features: [
          'Up to 100 patients',
          'Basic analytics',
          'Email support',
          'Standard features',
        ],
        maxPatients: 100,
      },
      {
        name: 'standard',
        displayName: 'Standard',
        monthlyPrice: 10000,
        quarterlyPrice: 27000,
        yearlyPrice: 96000,
        features: [
          'Up to 500 patients',
          'Advanced analytics',
          'Priority support',
          'WhatsApp integration',
          'Custom reports',
        ],
        maxPatients: 500,
      },
      {
        name: 'premium',
        displayName: 'Premium',
        monthlyPrice: 20000,
        quarterlyPrice: 54000,
        yearlyPrice: 192000,
        features: [
          'Unlimited patients',
          'Premium analytics',
          '24/7 support',
          'Full WhatsApp & SMS',
          'API access',
          'Custom integrations',
        ],
      },
      {
        name: 'enterprise',
        displayName: 'Enterprise',
        monthlyPrice: 50000,
        quarterlyPrice: 135000,
        yearlyPrice: 480000,
        features: [
          'Unlimited everything',
          'Dedicated support',
          'Custom development',
          'On-premise option',
          'SLA guarantee',
          'Training included',
        ],
      },
    ];
  }
}
