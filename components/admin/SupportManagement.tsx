import React, { useState, useEffect } from 'react';
import { MessageSquare, AlertCircle, Clock, CheckCircle, XCircle, Filter, Search, Plus, User, Building2, RefreshCw } from 'lucide-react';
import { SupportService, SupportTicket, SupportMetrics } from '../../services/backend/supportService';
import { MetricCard } from './MetricCard';

interface SupportManagementProps {
  onNavigate?: (view: string) => void;
}

export const SupportManagement: React.FC<SupportManagementProps> = ({ onNavigate }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const service = new SupportService();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ticketsData, metricsData] = await Promise.all([
        service.getAllTickets(),
        service.getSupportMetrics(),
      ]);
      setTickets(ticketsData);
      setMetrics(metricsData);
    } catch (err: any) {
      console.error('Error loading support data:', err);
      setError(err.message || 'Failed to load support data. Please ensure the database tables are created.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'in_progress':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'resolved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
    const matchesSearch = searchQuery === '' || 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.facilityName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw className="animate-spin text-brand-600 mx-auto mb-4" size={32} />
          <p className="text-slate-500 dark:text-slate-400">Loading support data...</p>
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
            title="Total Tickets"
            value={metrics.totalTickets}
            icon={MessageSquare}
            variant="default"
          />
          <MetricCard
            title="Open Tickets"
            value={metrics.openTickets}
            icon={AlertCircle}
            variant={metrics.openTickets > 10 ? 'warning' : 'default'}
          />
          <MetricCard
            title="Urgent Tickets"
            value={metrics.urgentTickets}
            icon={AlertCircle}
            variant={metrics.urgentTickets > 0 ? 'danger' : 'success'}
          />
          <MetricCard
            title="Avg Resolution"
            value={`${metrics.averageResolutionTime}h`}
            icon={Clock}
            variant="default"
            subtitle="Average resolution time"
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
              placeholder="Search tickets..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2.5 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="px-4 py-2.5 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors">
            <Plus size={18} />
            New Ticket
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Support Tickets ({filteredTickets.length})
        </h2>

        <div className="space-y-3">
          {filteredTickets.length > 0 ? (
            filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lg transition-all bg-slate-50 dark:bg-[#2c2c2e] cursor-pointer"
                onClick={() => {
                  // Open ticket details
                  console.log('View ticket:', ticket.id);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
                        {ticket.ticketNumber}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2">
                      {ticket.subject}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      {ticket.facilityName && (
                        <div className="flex items-center gap-1.5">
                          <Building2 size={12} />
                          <span>{ticket.facilityName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <MessageSquare size={12} />
                        <span>{ticket.category}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                      {ticket.assignedToName && (
                        <div className="flex items-center gap-1.5">
                          <User size={12} />
                          <span>Assigned to {ticket.assignedToName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto mb-4 text-slate-400" size={48} />
              <p className="text-slate-500 dark:text-slate-400 font-semibold">
                No tickets found
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                {searchQuery || filterStatus !== 'all' || filterPriority !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create a new ticket to get started'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
