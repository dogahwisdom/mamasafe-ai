import React, { useState, useEffect } from 'react';
import { 
  Users, Building2, Activity, TrendingUp, AlertTriangle, 
  MapPin, Search, Filter, Download, RefreshCw, Settings,
  UserCheck, Clock, BarChart3, Globe
} from 'lucide-react';
import { UserProfile } from '../types';
import { SuperadminService, SystemMetrics, FacilityMetrics, EnrollmentTrend, RiskDistribution, GeographicDistribution } from '../services/backend/superadminService';
import { MetricCard } from '../components/admin/MetricCard';
import { ChartCard } from '../components/admin/ChartCard';
import { FacilityCard } from '../components/admin/FacilityCard';
import { SystemHealthCard } from '../components/admin/SystemHealthCard';
import { PatientSearchModal } from '../components/admin/PatientSearchModal';
import { FacilityDetailsModal } from '../components/admin/FacilityDetailsModal';

interface SuperadminDashboardProps {
  user: UserProfile;
  onNavigate: (view: string) => void;
}

export const SuperadminDashboard: React.FC<SuperadminDashboardProps> = ({ user, onNavigate }) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [facilities, setFacilities] = useState<FacilityMetrics[]>([]);
  const [enrollmentTrends, setEnrollmentTrends] = useState<EnrollmentTrend[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<RiskDistribution | null>(null);
  const [geographicDistribution, setGeographicDistribution] = useState<GeographicDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'facilities' | 'analytics' | 'subscriptions' | 'support' | 'sops'>('overview');
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<FacilityMetrics | null>(null);
  const [showFacilityDetails, setShowFacilityDetails] = useState(false);
  const [facilitySearchQuery, setFacilitySearchQuery] = useState('');
  const [facilityFilter, setFacilityFilter] = useState<'all' | 'clinic' | 'pharmacy'>('all');

  const service = new SuperadminService();

  const loadData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const [
        metricsData,
        facilitiesData,
        trendsData,
        riskData,
        geoData,
      ] = await Promise.all([
        service.getSystemMetrics(),
        service.getFacilities(),
        service.getEnrollmentTrends(30),
        service.getRiskDistribution(),
        service.getGeographicDistribution(),
      ]);

      setMetrics(metricsData);
      setFacilities(facilitiesData);
      setEnrollmentTrends(trendsData);
      setRiskDistribution(riskData);
      setGeographicDistribution(geoData);
    } catch (error) {
      console.error('Error loading superadmin data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => loadData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    loadData(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="animate-spin text-brand-600 mx-auto mb-4" size={32} />
          <p className="text-slate-500 dark:text-slate-400">Loading system data...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="text-red-500 mx-auto mb-4" size={32} />
          <p className="text-slate-900 dark:text-white font-bold mb-2">Failed to load data</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-brand-600 text-white rounded-full font-semibold hover:bg-brand-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            System Overview
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive monitoring and analytics dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowPatientSearch(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-colors"
          >
            <Search size={18} />
            Search Patients
          </button>
          <button 
            onClick={() => {
              // Export data as CSV
              const exportData = {
                metrics,
                facilities,
                enrollmentTrends,
                riskDistribution,
                geographicDistribution,
                exportedAt: new Date().toISOString(),
              };
              const dataStr = JSON.stringify(exportData, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `mamasafe-export-${new Date().toISOString().split('T')[0]}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-slate-100 dark:bg-[#2c2c2e] p-1 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'overview'
              ? 'bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('facilities')}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'facilities'
              ? 'bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Facilities
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'analytics'
              ? 'bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'subscriptions'
              ? 'bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Subscriptions
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'support'
              ? 'bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Support
        </button>
        <button
          onClick={() => setActiveTab('sops')}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'sops'
              ? 'bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          SOPs
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <MetricCard
              title="Total Patients"
              value={metrics.totalPatients}
              icon={Users}
              subtitle="Enrolled mothers"
              variant="primary"
              trend={metrics.enrollmentsThisWeek > 0 ? {
                value: `${Math.round((metrics.enrollmentsThisWeek / Math.max(metrics.totalPatients - metrics.enrollmentsThisWeek, 1)) * 100)}%`,
                direction: 'up',
              } : undefined}
            />
            <MetricCard
              title="Active Facilities"
              value={metrics.totalClinics + metrics.totalPharmacies}
              icon={Building2}
              subtitle={`${metrics.totalClinics} clinics, ${metrics.totalPharmacies} pharmacies`}
              variant="default"
            />
            <MetricCard
              title="High Risk Patients"
              value={metrics.highRiskPatients}
              icon={AlertTriangle}
              subtitle="Require attention"
              variant={metrics.highRiskPatients > 0 ? 'warning' : 'success'}
            />
            <MetricCard
              title="Pending Tasks"
              value={metrics.pendingTasks}
              icon={Activity}
              subtitle="Across all clinics"
              variant={metrics.pendingTasks > 10 ? 'warning' : 'default'}
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <MetricCard
              title="Enrollments Today"
              value={metrics.enrollmentsToday}
              icon={UserCheck}
              variant="default"
            />
            <MetricCard
              title="Pending Refills"
              value={metrics.pendingRefills}
              icon={Activity}
              variant={metrics.pendingRefills > 5 ? 'warning' : 'default'}
            />
            <MetricCard
              title="Pending Reminders"
              value={metrics.pendingReminders}
              icon={Clock}
              variant="default"
            />
          </div>

          {/* System Health */}
          <SystemHealthCard
            status={metrics.systemHealth}
            metrics={{
              database: metrics.systemHealth === 'down' ? 'offline' : 'online',
              api: metrics.systemHealth === 'down' ? 'offline' : 'online',
              messaging: metrics.systemHealth === 'down' ? 'offline' : 'online',
            }}
          />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Enrollment Trends (30 Days)"
              data={enrollmentTrends}
              dataKey="count"
              type="area"
              color="#14b8a6"
            />
            {riskDistribution && (
              <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                  Risk Distribution
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Low Risk</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${(riskDistribution.low / metrics.totalPatients) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white w-12 text-right">
                        {riskDistribution.low}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Medium Risk</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-500 rounded-full"
                          style={{ width: `${(riskDistribution.medium / metrics.totalPatients) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white w-12 text-right">
                        {riskDistribution.medium}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">High Risk</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${(riskDistribution.high / metrics.totalPatients) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white w-12 text-right">
                        {riskDistribution.high}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Critical Risk</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${(riskDistribution.critical / metrics.totalPatients) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white w-12 text-right">
                        {riskDistribution.critical}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Facilities Tab */}
      {activeTab === 'facilities' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                All Facilities
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {facilities.length} facilities registered
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input
                  type="text"
                  value={facilitySearchQuery}
                  onChange={(e) => setFacilitySearchQuery(e.target.value)}
                  placeholder="Search facilities..."
                  className="pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
              <div className="relative">
                <button 
                  onClick={() => {
                    const options: ('all' | 'clinic' | 'pharmacy')[] = ['all', 'clinic', 'pharmacy'];
                    const currentIndex = options.indexOf(facilityFilter);
                    setFacilityFilter(options[(currentIndex + 1) % options.length]);
                  }}
                  className="p-2.5 bg-slate-100 dark:bg-[#2c2c2e] rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-colors flex items-center gap-2"
                  title={`Filter: ${facilityFilter === 'all' ? 'All' : facilityFilter === 'clinic' ? 'Clinics Only' : 'Pharmacies Only'}`}
                >
                  <Filter size={18} />
                  {facilityFilter !== 'all' && (
                    <span className="text-xs font-bold px-1.5 py-0.5 bg-brand-600 text-white rounded">
                      {facilityFilter === 'clinic' ? 'C' : 'P'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {facilities
              .filter(facility => {
                const matchesSearch = facilitySearchQuery === '' || 
                  facility.name.toLowerCase().includes(facilitySearchQuery.toLowerCase()) ||
                  facility.location.toLowerCase().includes(facilitySearchQuery.toLowerCase());
                const matchesFilter = facilityFilter === 'all' || facility.type === facilityFilter;
                return matchesSearch && matchesFilter;
              })
              .map((facility) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                onClick={() => {
                  setSelectedFacility(facility);
                  setShowFacilityDetails(true);
                }}
              />
              ))}
          </div>

          {facilities.filter(f => {
            const matchesSearch = facilitySearchQuery === '' || 
              f.name.toLowerCase().includes(facilitySearchQuery.toLowerCase()) ||
              f.location.toLowerCase().includes(facilitySearchQuery.toLowerCase());
            const matchesFilter = facilityFilter === 'all' || f.type === facilityFilter;
            return matchesSearch && matchesFilter;
          }).length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-slate-200 dark:border-slate-800">
              <Building2 className="mx-auto mb-4 text-slate-400" size={48} />
              <p className="text-slate-500 dark:text-slate-400 font-semibold">
                {facilities.length === 0 
                  ? 'No facilities registered yet'
                  : 'No facilities match your search criteria'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Enrollment Trends"
              data={enrollmentTrends}
              dataKey="count"
              type="area"
              color="#14b8a6"
              height={250}
            />
            <ChartCard
              title="Weekly Enrollments"
              data={enrollmentTrends.slice(-7)}
              dataKey="count"
              type="bar"
              color="#8b5cf6"
              height={250}
            />
          </div>

          {/* Geographic Distribution */}
          {geographicDistribution.length > 0 && (
            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="text-brand-600" size={20} />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Geographic Distribution
                </h3>
              </div>
              <div className="space-y-3">
                {geographicDistribution.slice(0, 10).map((geo, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{geo.location}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {geo.clinicCount} clinics, {geo.pharmacyCount} pharmacies
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {geo.patientCount}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">patients</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <SubscriptionManagement onNavigate={onNavigate} />
      )}

      {/* Support Tab */}
      {activeTab === 'support' && (
        <SupportManagement onNavigate={onNavigate} />
      )}

      {/* SOPs Tab */}
      {activeTab === 'sops' && (
        <SOPsManagement onNavigate={onNavigate} />
      )}

      {/* Patient Search Modal */}
      <PatientSearchModal
        isOpen={showPatientSearch}
        onClose={() => setShowPatientSearch(false)}
        onSelectPatient={(patient) => {
          console.log('Selected patient:', patient);
          setShowPatientSearch(false);
        }}
      />

      {/* Facility Details Modal */}
      <FacilityDetailsModal
        isOpen={showFacilityDetails}
        facility={selectedFacility}
        onClose={() => {
          setShowFacilityDetails(false);
          setSelectedFacility(null);
        }}
      />
    </div>
  );
};
