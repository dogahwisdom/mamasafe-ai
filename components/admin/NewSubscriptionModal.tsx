import React, { useState, useEffect } from 'react';
import { X, Save, Building2, CreditCard, Calendar } from 'lucide-react';
import { SubscriptionService, Subscription, SubscriptionPlan } from '../../services/backend/subscriptionService';
import { SuperadminService } from '../../services/backend/superadminService';

interface NewSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingSubscription?: Subscription | null;
}

export const NewSubscriptionModal: React.FC<NewSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingSubscription,
}) => {
  const [facilityId, setFacilityId] = useState<string>('');
  const [facilityName, setFacilityName] = useState<string>('');
  const [planName, setPlanName] = useState<'basic' | 'standard' | 'premium' | 'enterprise'>('basic');
  const [status, setStatus] = useState<'active' | 'suspended' | 'cancelled' | 'trial'>('trial');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [price, setPrice] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');
  const [autoRenew, setAutoRenew] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<Array<{ id: string; name: string }>>([]);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);

  const subscriptionService = new SubscriptionService();
  const superadminService = new SuperadminService();

  useEffect(() => {
    if (isOpen) {
      loadFacilities();
      const plans = subscriptionService.getAvailablePlans();
      setAvailablePlans(plans);
      updatePrice();
    }
  }, [isOpen, planName, billingCycle]);

  useEffect(() => {
    if (editingSubscription) {
      setFacilityId(editingSubscription.facilityId);
      setFacilityName(editingSubscription.facilityName);
      setPlanName(editingSubscription.planName);
      setStatus(editingSubscription.status);
      setBillingCycle(editingSubscription.billingCycle);
      setPrice(editingSubscription.price);
      setStartDate(editingSubscription.startDate);
      setEndDate(editingSubscription.endDate || '');
      setAutoRenew(editingSubscription.autoRenew);
      setPaymentMethod(editingSubscription.paymentMethod || '');
    } else {
      // Reset form for new subscription
      setFacilityId('');
      setFacilityName('');
      setPlanName('basic');
      setStatus('trial');
      setBillingCycle('monthly');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setAutoRenew(true);
      setPaymentMethod('');
      updatePrice();
    }
  }, [editingSubscription, isOpen]);

  const loadFacilities = async () => {
    try {
      const facilityData = await superadminService.getFacilities();
      setFacilities(
        facilityData.map(f => ({ id: f.id, name: f.name }))
      );
    } catch (err) {
      console.error('Error loading facilities:', err);
    }
  };

  const updatePrice = () => {
    const plans = subscriptionService.getAvailablePlans();
    const selectedPlan = plans.find(p => p.name === planName);
    if (selectedPlan) {
      if (billingCycle === 'monthly') {
        setPrice(selectedPlan.monthlyPrice);
      } else if (billingCycle === 'quarterly') {
        setPrice(selectedPlan.quarterlyPrice);
      } else {
        setPrice(selectedPlan.yearlyPrice);
      }
    }
  };

  const calculateNextBillingDate = (start: string, cycle: string): string => {
    const startDate = new Date(start);
    let nextDate = new Date(startDate);
    
    if (cycle === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (cycle === 'quarterly') {
      nextDate.setMonth(nextDate.getMonth() + 3);
    } else if (cycle === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
    
    return nextDate.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!facilityId || !facilityName) {
      setError('Please select a facility');
      return;
    }

    if (!planName || !status || !billingCycle || !startDate) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const nextBillingDate = calculateNextBillingDate(startDate, billingCycle);
      
      const subscriptionData: Partial<Subscription> = {
        facilityId,
        facilityName,
        planName,
        status,
        billingCycle,
        price,
        startDate,
        endDate: endDate || undefined,
        autoRenew,
        paymentMethod: paymentMethod || undefined,
        nextBillingDate,
      };

      if (editingSubscription) {
        subscriptionData.id = editingSubscription.id;
      }

      await subscriptionService.upsertSubscription(subscriptionData);

      // Reset form
      setFacilityId('');
      setFacilityName('');
      setPlanName('basic');
      setStatus('trial');
      setBillingCycle('monthly');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setAutoRenew(true);
      setPaymentMethod('');

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving subscription:', err);
      setError(err.message || 'Failed to save subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-3xl rounded-[2.5rem] shadow-2xl relative animate-scale-in border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {editingSubscription ? 'Edit Subscription' : 'Create New Subscription'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {editingSubscription ? 'Update facility subscription' : 'Add a new subscription for a facility'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-[#2c2c2e] rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Facility Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              <Building2 size={16} className="inline mr-2" />
              Facility *
            </label>
            <select
              value={facilityId}
              onChange={(e) => {
                const selected = facilities.find(f => f.id === e.target.value);
                setFacilityId(e.target.value);
                setFacilityName(selected?.name || '');
              }}
              required
              className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              <option value="">Select a facility</option>
              {facilities.map(facility => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>
          </div>

          {/* Plan and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                <CreditCard size={16} className="inline mr-2" />
                Plan *
              </label>
              <select
                value={planName}
                onChange={(e) => {
                  setPlanName(e.target.value as any);
                  updatePrice();
                }}
                required
                className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                {availablePlans.map(plan => (
                  <option key={plan.name} value={plan.name}>
                    {plan.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                required
                className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Billing Cycle and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Billing Cycle *
              </label>
              <select
                value={billingCycle}
                onChange={(e) => {
                  setBillingCycle(e.target.value as any);
                  updatePrice();
                }}
                required
                className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Price (KES) *
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Auto-calculated: {formatCurrency(price)} per {billingCycle}
              </p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                <Calendar size={16} className="inline mr-2" />
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
          </div>

          {/* Payment Method and Auto Renew */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Payment Method
              </label>
              <input
                type="text"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="e.g., M-Pesa, Bank Transfer"
                className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-3 w-full">
                <input
                  type="checkbox"
                  id="autoRenew"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="autoRenew" className="text-sm font-semibold text-slate-900 dark:text-white">
                  Auto Renew
                </label>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 dark:bg-[#2c2c2e] text-slate-900 dark:text-white rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                {editingSubscription ? 'Update Subscription' : 'Create Subscription'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
