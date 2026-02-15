import React, { useState, useEffect } from 'react';
import { X, Send, Building2, User } from 'lucide-react';
import { SupportService, SupportTicket } from '../../services/backend/supportService';
import { SuperadminService } from '../../services/backend/superadminService';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewTicketModal: React.FC<NewTicketModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'technical' | 'billing' | 'training' | 'feature_request' | 'bug_report' | 'other'>('technical');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [facilityId, setFacilityId] = useState<string>('');
  const [facilityName, setFacilityName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<Array<{ id: string; name: string }>>([]);

  const supportService = new SupportService();
  const superadminService = new SuperadminService();

  useEffect(() => {
    if (isOpen) {
      loadFacilities();
    }
  }, [isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim() || !description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await supportService.createTicket({
        facilityId: facilityId || undefined,
        facilityName: facilityName || undefined,
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        status: 'open',
      });

      // Reset form
      setSubject('');
      setDescription('');
      setCategory('technical');
      setPriority('medium');
      setFacilityId('');
      setFacilityName('');

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      setError(err.message || 'Failed to create ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative animate-scale-in border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Create New Support Ticket
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Submit a new support request
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
              Facility (Optional)
            </label>
            <select
              value={facilityId}
              onChange={(e) => {
                const selected = facilities.find(f => f.id === e.target.value);
                setFacilityId(e.target.value);
                setFacilityName(selected?.name || '');
              }}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              <option value="">Select a facility (optional)</option>
              {facilities.map(facility => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of the issue"
              required
              className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed information about the issue..."
              required
              rows={6}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
            />
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="training">Training</option>
                <option value="feature_request">Feature Request</option>
                <option value="bug_report">Bug Report</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
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
                Creating...
              </>
            ) : (
              <>
                <Send size={18} />
                Create Ticket
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
