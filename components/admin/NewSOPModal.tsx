import React, { useState } from 'react';
import { X, Save, FileText } from 'lucide-react';
import { SOPService, SOP } from '../../services/backend/sopService';

interface NewSOPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingSOP?: SOP | null;
}

export const NewSOPModal: React.FC<NewSOPModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingSOP,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'enrollment' | 'triage' | 'referral' | 'medication' | 'compliance' | 'training' | 'other'>('enrollment');
  const [content, setContent] = useState('');
  const [version, setVersion] = useState('1.0');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = new SOPService();

  React.useEffect(() => {
    if (editingSOP) {
      setTitle(editingSOP.title);
      setDescription(editingSOP.description || '');
      setCategory(editingSOP.category);
      setContent(editingSOP.content);
      setVersion(editingSOP.version);
      setIsActive(editingSOP.isActive);
    } else {
      // Reset form for new SOP
      setTitle('');
      setDescription('');
      setCategory('enrollment');
      setContent('');
      setVersion('1.0');
      setIsActive(true);
    }
  }, [editingSOP, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !content.trim()) {
      setError('Please fill in title and content');
      return;
    }

    setLoading(true);
    try {
      if (editingSOP) {
        // Update existing SOP
        await service.updateSOP(editingSOP.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          content: content.trim(),
          version,
          isActive,
        });
      } else {
        // Create new SOP
        await service.createSOP({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          content: content.trim(),
          version,
          isActive,
          createdByName: 'Superadmin',
        });
      }

      // Reset form
      setTitle('');
      setDescription('');
      setCategory('enrollment');
      setContent('');
      setVersion('1.0');
      setIsActive(true);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving SOP:', err);
      setError(err.message || 'Failed to save SOP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-4xl rounded-[2.5rem] shadow-2xl relative animate-scale-in border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {editingSOP ? 'Edit SOP' : 'Create New SOP'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {editingSOP ? 'Update Standard Operating Procedure' : 'Add a new Standard Operating Procedure'}
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

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              <FileText size={16} className="inline mr-2" />
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="SOP Title"
              required
              className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this SOP..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
            />
          </div>

          {/* Category and Version */}
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
                <option value="enrollment">Enrollment</option>
                <option value="triage">Triage</option>
                <option value="referral">Referral</option>
                <option value="medication">Medication</option>
                <option value="compliance">Compliance</option>
                <option value="training">Training</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Version
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0"
                className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the full SOP content here..."
              required
              rows={12}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none font-mono text-sm"
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <label htmlFor="isActive" className="text-sm font-semibold text-slate-900 dark:text-white">
              Active (visible to facilities)
            </label>
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
                {editingSOP ? 'Update SOP' : 'Create SOP'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
