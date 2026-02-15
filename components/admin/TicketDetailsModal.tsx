import React, { useState, useEffect } from 'react';
import { X, MessageSquare, User, Building2, Clock, Send, CheckCircle, Edit } from 'lucide-react';
import { SupportService, SupportTicket, SupportTicketMessage } from '../../services/backend/supportService';

interface TicketDetailsModalProps {
  isOpen: boolean;
  ticketId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({
  isOpen,
  ticketId,
  onClose,
  onUpdate,
}) => {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);

  const service = new SupportService();

  useEffect(() => {
    if (isOpen && ticketId) {
      loadTicketData();
    }
  }, [isOpen, ticketId]);

  const loadTicketData = async () => {
    if (!ticketId) return;

    setLoading(true);
    try {
      const [ticketData, messagesData] = await Promise.all([
        service.getTicketById(ticketId),
        service.getTicketMessages(ticketId),
      ]);
      setTicket(ticketData);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading ticket data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!ticketId || !newMessage.trim()) return;

    setSending(true);
    try {
      await service.addTicketMessage(ticketId, {
        userName: 'Superadmin',
        message: newMessage.trim(),
        isInternal,
      });
      setNewMessage('');
      setIsInternal(false);
      await loadTicketData();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (status: SupportTicket['status']) => {
    if (!ticketId) return;

    setUpdating(true);
    try {
      await service.updateTicket(ticketId, { status });
      await loadTicketData();
      onUpdate();
    } catch (error) {
      console.error('Error updating ticket:', error);
    } finally {
      setUpdating(false);
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

  if (!isOpen || !ticketId) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent mx-auto" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-4xl rounded-[2.5rem] shadow-2xl relative animate-scale-in border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
                {ticket.ticketNumber}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(ticket.status)}`}>
                {ticket.status.replace('_', ' ')}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(ticket.priority)}`}>
                {ticket.priority}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {ticket.subject}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-[#2c2c2e] rounded-full transition-colors ml-4"
          >
            <X size={20} />
          </button>
        </div>

        {/* Ticket Info */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#2c2c2e]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {ticket.facilityName && (
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Facility</p>
                <div className="flex items-center gap-1.5">
                  <Building2 size={14} />
                  <span className="font-semibold text-slate-900 dark:text-white">{ticket.facilityName}</span>
                </div>
              </div>
            )}
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Category</p>
              <p className="font-semibold text-slate-900 dark:text-white capitalize">{ticket.category}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Created</p>
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                <span className="font-semibold text-slate-900 dark:text-white">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            {ticket.assignedToName && (
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Assigned To</p>
                <div className="flex items-center gap-1.5">
                  <User size={14} />
                  <span className="font-semibold text-slate-900 dark:text-white">{ticket.assignedToName}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Description</h3>
          <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{ticket.description}</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">Conversation</h3>
          {messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-xl ${
                  message.isInternal
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                    : 'bg-slate-50 dark:bg-[#2c2c2e]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User size={14} />
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">
                      {message.userName}
                    </span>
                    {message.isInternal && (
                      <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
                        Internal
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{message.message}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">No messages yet</p>
          )}
        </div>

        {/* New Message */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="internal"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="internal" className="text-sm text-slate-600 dark:text-slate-400">
              Internal note (only visible to support team)
            </label>
          </div>
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              rows={3}
              className="flex-1 px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="px-4 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#2c2c2e]">
          <div className="flex gap-2">
            {ticket.status === 'open' && (
              <button
                onClick={() => handleUpdateStatus('in_progress')}
                disabled={updating}
                className="px-4 py-2 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                Mark In Progress
              </button>
            )}
            {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
              <button
                onClick={() => handleUpdateStatus('resolved')}
                disabled={updating}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle size={18} />
                Resolve
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-[#3a3a3c] text-slate-900 dark:text-white rounded-xl font-semibold hover:bg-slate-300 dark:hover:bg-[#4a4a4c] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
