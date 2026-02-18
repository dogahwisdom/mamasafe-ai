import React, { useState, useEffect } from 'react';
import { PatientTransfer } from '../types';
import { backend } from '../services/backend';
import { CheckCircle, X, Clock, AlertCircle, Loader2, User, Building2, MessageSquare, ArrowRight } from 'lucide-react';

interface TransferManagementProps {
  onTransferApproved?: () => void;
}

export const TransferManagement: React.FC<TransferManagementProps> = ({ onTransferApproved }) => {
  const [transfers, setTransfers] = useState<PatientTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<PatientTransfer | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    fetchTransfers();
  }, [filter]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const status = filter === 'all' ? undefined : filter;
      const data = await backend.transfers.getTransfers(status);
      setTransfers(data);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (transfer: PatientTransfer) => {
    if (!confirm(`Approve transfer of ${transfer.patientName} from ${transfer.fromFacilityName}?`)) {
      return;
    }

    setProcessingId(transfer.id);
    try {
      const currentUser = JSON.parse(localStorage.getItem('mamasafe_current_user') || '{}');
      await backend.transfers.approveTransfer(transfer.id, currentUser.id);
      await fetchTransfers();
      if (onTransferApproved) onTransferApproved();
    } catch (error) {
      console.error('Error approving transfer:', error);
      alert('Failed to approve transfer. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedTransfer || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    setProcessingId(selectedTransfer.id);
    try {
      const currentUser = JSON.parse(localStorage.getItem('mamasafe_current_user') || '{}');
      await backend.transfers.rejectTransfer(selectedTransfer.id, currentUser.id, rejectionReason);
      await fetchTransfers();
      setShowRejectModal(false);
      setSelectedTransfer(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting transfer:', error);
      alert('Failed to reject transfer. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingTransfers = transfers.filter(t => t.status === 'pending');
  const isIncoming = (transfer: PatientTransfer) => {
    const currentUser = JSON.parse(localStorage.getItem('mamasafe_current_user') || '{}');
    return transfer.toFacilityId === currentUser.id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
            filter === 'pending'
              ? 'bg-brand-600 text-white'
              : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#3a3a3c]'
          }`}
        >
          Pending ({pendingTransfers.length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
            filter === 'approved'
              ? 'bg-brand-600 text-white'
              : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#3a3a3c]'
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
            filter === 'rejected'
              ? 'bg-brand-600 text-white'
              : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#3a3a3c]'
          }`}
        >
          Rejected
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-brand-600 text-white'
              : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#3a3a3c]'
          }`}
        >
          All
        </button>
      </div>

      {/* Transfer List */}
      <div className="space-y-4">
        {transfers.length > 0 ? (
          transfers.map((transfer) => {
            const incoming = isIncoming(transfer);
            const canApprove = transfer.status === 'pending' && !incoming;
            const canReject = transfer.status === 'pending' && !incoming;

            return (
              <div
                key={transfer.id}
                className="p-5 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        incoming ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'
                      }`}>
                        {incoming ? (
                          <Building2 className="text-blue-600 dark:text-blue-400" size={20} />
                        ) : (
                          <ArrowRight className="text-orange-600 dark:text-orange-400" size={20} />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-lg">{transfer.patientName}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {incoming ? 'Incoming' : 'Outgoing'} Transfer
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400">{transfer.patientPhone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400">
                          {incoming ? 'From' : 'To'}: <strong>{incoming ? transfer.fromFacilityName : transfer.toFacilityName}</strong>
                        </span>
                      </div>
                      {transfer.reason && (
                        <div className="flex items-start gap-2">
                          <MessageSquare size={14} className="text-slate-400 mt-0.5" />
                          <span className="text-slate-600 dark:text-slate-400">{transfer.reason}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          {new Date(transfer.createdAt).toLocaleDateString('en-GB', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    {transfer.status === 'pending' && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg text-xs font-semibold">
                          Pending
                        </span>
                      </div>
                    )}

                    {transfer.status === 'approved' && (
                      <div className="mt-3 flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-500" />
                        <span className="text-green-600 dark:text-green-400 text-sm font-semibold">
                          Approved {transfer.approvedAt && new Date(transfer.approvedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {transfer.status === 'rejected' && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-1">
                          <X size={16} className="text-red-500" />
                          <span className="text-red-600 dark:text-red-400 text-sm font-semibold">
                            Rejected {transfer.rejectedAt && new Date(transfer.rejectedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {transfer.rejectionReason && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 ml-6">{transfer.rejectionReason}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {canApprove && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleApprove(transfer)}
                        disabled={processingId === transfer.id}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {processingId === transfer.id ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTransfer(transfer);
                          setShowRejectModal(true);
                        }}
                        disabled={processingId === transfer.id}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <X size={16} />
                        Reject
                      </button>
                    </div>
                  )}

                  {incoming && transfer.status === 'pending' && (
                    <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl text-sm font-semibold">
                      Waiting for approval
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center text-slate-400">
            <AlertCircle size={48} className="opacity-20 mx-auto mb-4" />
            <p className="font-bold text-lg text-slate-500 dark:text-slate-400">No Transfers</p>
            <p className="text-sm mt-1">No transfer requests match your filter.</p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative animate-scale-in border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reject Transfer</h2>
              <button 
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedTransfer(null);
                  setRejectionReason('');
                }}
                className="p-2 bg-slate-100 dark:bg-[#2c2c2e] rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400">
                Rejecting transfer of <strong>{selectedTransfer.patientName}</strong> from <strong>{selectedTransfer.fromFacilityName}</strong>.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Reason for Rejection *
                </label>
                <textarea
                  required
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-transparent focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 text-slate-900 dark:text-white outline-none resize-none h-32"
                  placeholder="Please provide a reason for rejecting this transfer request..."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedTransfer(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-6 py-3 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processingId === selectedTransfer.id || !rejectionReason.trim()}
                  className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {processingId === selectedTransfer.id ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <X size={18} />
                      Reject Transfer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
