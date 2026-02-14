import React, { useState, useEffect } from 'react';
import { CreditCard, TrendingUp, Users, Calendar, CheckCircle, XCircle, AlertCircle, RefreshCw, Plus, Edit, MoreVertical } from 'lucide-react';
import { SubscriptionService, Subscription, SubscriptionMetrics, SubscriptionPlan } from '../../services/backend/subscriptionService';
import { MetricCard } from './MetricCard';

interface SubscriptionManagementProps {
  onNavigate?: (view: string) => void;
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ onNavigate }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const service = new SubscriptionService();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subsData, metricsData] = await Promise.all([
        service.getAllSubscriptions(),
        service.getSubscriptionMetrics(),
      ]);
      setSubscriptions(subsData);
      setMetrics(metricsData);
    } catch (err: any) {
      console.error('Error loading subscription data:', err);
      setError(err.message || 'Failed to load subscription data. Please ensure the database tables are created.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'trial':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'suspended':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'premium':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'standard':
        return 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw className="animate-spin text-brand-600 mx-auto mb-4" size={32} />
          <p className="text-slate-500 dark:text-slate-400">Loading subscription data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <p className="text-slate-900 dark:text-white font-semibold mb-2">Error Loading Data</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{error}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
            Please ensure you have run the SQL migration script: <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">supabase/add-management-tables.sql</code>
          </p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <MetricCard
            title="Total Subscriptions"
            value={metrics.totalSubscriptions}
            icon={CreditCard}
            variant="default"
          />
          <MetricCard
            title="Active Subscriptions"
            value={metrics.activeSubscriptions}
            icon={CheckCircle}
            variant="success"
          />
          <MetricCard
            title="Monthly Revenue"
            value={formatCurrency(metrics.monthlyRevenue)}
            icon={TrendingUp}
            variant="primary"
          />
          <MetricCard
            title="ARR"
            value={formatCurrency(metrics.annualRecurringRevenue)}
            icon={TrendingUp}
            variant="primary"
            subtitle="Annual Recurring Revenue"
          />
        </div>
      )}

      {/* Subscriptions List */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              All Subscriptions
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {subscriptions.length} subscriptions
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors">
            <Plus size={18} />
            Add Subscription
          </button>
        </div>

        <div className="space-y-3">
          {subscriptions.length > 0 ? (
            subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lg transition-all bg-slate-50 dark:bg-[#2c2c2e]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                        {sub.facilityName}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPlanColor(sub.planName)}`}>
                        {sub.planName.toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(sub.status)}`}>
                        {sub.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Billing Cycle</p>
                        <p className="font-semibold text-slate-900 dark:text-white capitalize">
                          {sub.billingCycle}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Price</p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(sub.price)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Next Billing</p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Auto Renew</p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {sub.autoRenew ? (
                            <span className="text-green-600 dark:text-green-400">Yes</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-slate-200 dark:hover:bg-[#3a3a3c] rounded-lg transition-colors">
                    <MoreVertical size={18} className="text-slate-400" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <CreditCard className="mx-auto mb-4 text-slate-400" size={48} />
              <p className="text-slate-500 dark:text-slate-400 font-semibold">
                No subscriptions found
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Add a subscription to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
