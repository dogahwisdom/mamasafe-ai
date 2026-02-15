import React, { useState, useEffect } from 'react';
import { FileText, Eye, Download, CheckCircle, Plus, Edit, Trash2, BarChart3, Users, RefreshCw, Search, AlertCircle } from 'lucide-react';
import { SOPService, SOP, SOPMetrics } from '../../services/backend/sopService';
import { MetricCard } from './MetricCard';
import { NewSOPModal } from './NewSOPModal';

interface SOPsManagementProps {
  onNavigate?: (view: string) => void;
}

export const SOPsManagement: React.FC<SOPsManagementProps> = ({ onNavigate }) => {
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [metrics, setMetrics] = useState<SOPMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewSOPModal, setShowNewSOPModal] = useState(false);
  const [editingSOP, setEditingSOP] = useState<SOP | null>(null);

  const service = new SOPService();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sopsData, metricsData] = await Promise.all([
        service.getAllSOPs(),
        service.getSOPMetrics(),
      ]);
      setSOPs(sopsData);
      setMetrics(metricsData);
    } catch (err: any) {
      console.error('Error loading SOPs data:', err);
      setError(err.message || 'Failed to load SOPs data. Please ensure the database tables are created.');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      enrollment: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      triage: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      referral: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      medication: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      compliance: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      training: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
      other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    };
    return colors[category] || colors.other;
  };

  const filteredSOPs = sops.filter(sop => {
    const matchesCategory = filterCategory === 'all' || sop.category === filterCategory;
    const matchesSearch = searchQuery === '' || 
      sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sop.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw className="animate-spin text-brand-600 mx-auto mb-4" size={32} />
          <p className="text-slate-500 dark:text-slate-400">Loading SOPs data...</p>
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
            title="Total SOPs"
            value={metrics.totalSOPs}
            icon={FileText}
            variant="default"
          />
          <MetricCard
            title="Active SOPs"
            value={metrics.activeSOPs}
            icon={CheckCircle}
            variant="success"
          />
          <MetricCard
            title="Total Accesses"
            value={metrics.totalAccesses}
            icon={Eye}
            variant="primary"
          />
          <MetricCard
            title="Facilities"
            value={metrics.facilityCompliance.length}
            icon={Users}
            variant="default"
            subtitle="With access logs"
          />
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SOPs..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          >
            <option value="all">All Categories</option>
            <option value="enrollment">Enrollment</option>
            <option value="triage">Triage</option>
            <option value="referral">Referral</option>
            <option value="medication">Medication</option>
            <option value="compliance">Compliance</option>
            <option value="training">Training</option>
            <option value="other">Other</option>
          </select>
          <button
            onClick={() => {
              setEditingSOP(null);
              setShowNewSOPModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors"
          >
            <Plus size={18} />
            New SOP
          </button>
        </div>
      </div>

      {/* SOPs List */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Standard Operating Procedures ({filteredSOPs.length})
        </h2>

        <div className="space-y-3">
          {filteredSOPs.length > 0 ? (
            filteredSOPs.map((sop) => {
              const accessCount = metrics?.topAccessedSOPs.find(t => t.sopId === sop.id)?.accessCount || 0;
              
              return (
                <div
                  key={sop.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lg transition-all bg-slate-50 dark:bg-[#2c2c2e]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                          {sop.title}
                        </h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getCategoryColor(sop.category)}`}>
                          {sop.category}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          v{sop.version}
                        </span>
                        {!sop.isActive && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      {sop.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          {sop.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Eye size={12} />
                          <span>{accessCount} accesses</span>
                        </div>
                        {sop.createdByName && (
                          <div className="flex items-center gap-1.5">
                            <span>Created by {sop.createdByName}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span>Updated {new Date(sop.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingSOP(sop);
                          setShowNewSOPModal(true);
                        }}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-[#3a3a3c] rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={18} className="text-slate-400" />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete "${sop.title}"?`)) {
                            try {
                              await service.updateSOP(sop.id, { isActive: false });
                              loadData();
                            } catch (error) {
                              console.error('Error deleting SOP:', error);
                              alert('Failed to delete SOP. Please try again.');
                            }
                          }
                        }}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-[#3a3a3c] rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto mb-4 text-slate-400" size={48} />
              <p className="text-slate-500 dark:text-slate-400 font-semibold">
                No SOPs found
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                {searchQuery || filterCategory !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create a new SOP to get started'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compliance Overview */}
      {metrics && metrics.facilityCompliance.length > 0 && (
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="text-brand-600" size={20} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Facility Compliance
            </h3>
          </div>
          <div className="space-y-3">
            {metrics.facilityCompliance.slice(0, 10).map((facility) => {
              const compliancePercentage = facility.totalSOPs > 0
                ? Math.round((facility.accessedSOPs / facility.totalSOPs) * 100)
                : 0;

              return (
                <div key={facility.facilityId} className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {facility.facilityName}
                    </span>
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                      {facility.accessedSOPs} / {facility.totalSOPs}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        compliancePercentage >= 80
                          ? 'bg-green-500'
                          : compliancePercentage >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${compliancePercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {compliancePercentage}% compliance
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New/Edit SOP Modal */}
      <NewSOPModal
        isOpen={showNewSOPModal}
        onClose={() => {
          setShowNewSOPModal(false);
          setEditingSOP(null);
        }}
        onSuccess={() => {
          loadData();
        }}
        editingSOP={editingSOP}
      />
    </div>
  );
};
