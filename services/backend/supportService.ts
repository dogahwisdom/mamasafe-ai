/**
 * Support Service
 * 
 * Manages support tickets, assignments, and tracking
 */

import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  facilityId?: string;
  facilityName?: string;
  userId?: string;
  userName?: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'training' | 'feature_request' | 'bug_report' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  assignedToName?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  userId?: string;
  userName: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

export interface SupportMetrics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  averageResolutionTime: number;
  urgentTickets: number;
  ticketsByCategory: { [key: string]: number };
}

export class SupportService {
  /**
   * Generate unique ticket number
   */
  private generateTicketNumber(): string {
    const prefix = 'MS';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Get all support tickets
   */
  public async getAllTickets(): Promise<SupportTicket[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tickets:', error);
        return [];
      }

      return (data || []).map((t: any) => ({
        id: t.id,
        ticketNumber: t.ticket_number,
        facilityId: t.facility_id,
        facilityName: t.facility_name,
        userId: t.user_id,
        userName: t.user_name,
        subject: t.subject,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: t.status,
        assignedTo: t.assigned_to,
        assignedToName: t.assigned_to_name,
        resolutionNotes: t.resolution_notes,
        resolvedAt: t.resolved_at,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));
    }

    return [];
  }

  /**
   * Get ticket by ID
   */
  public async getTicketById(ticketId: string): Promise<SupportTicket | null> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching ticket:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        ticketNumber: data.ticket_number,
        facilityId: data.facility_id,
        facilityName: data.facility_name,
        userId: data.user_id,
        userName: data.user_name,
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: data.status,
        assignedTo: data.assigned_to,
        assignedToName: data.assigned_to_name,
        resolutionNotes: data.resolution_notes,
        resolvedAt: data.resolved_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    return null;
  }

  /**
   * Create new support ticket
   */
  public async createTicket(ticket: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>): Promise<SupportTicket> {
    if (isSupabaseConfigured()) {
      const ticketData: any = {
        ticket_number: this.generateTicketNumber(),
        facility_id: ticket.facilityId,
        facility_name: ticket.facilityName,
        user_id: ticket.userId,
        user_name: ticket.userName,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status || 'open',
        assigned_to: ticket.assignedTo,
        assigned_to_name: ticket.assignedToName,
      };

      const { data, error } = await supabase
        .from('support_tickets')
        .insert(ticketData)
        .select()
        .single();

      if (error) {
        console.error('Error creating ticket:', error);
        throw error;
      }

      return {
        id: data.id,
        ticketNumber: data.ticket_number,
        facilityId: data.facility_id,
        facilityName: data.facility_name,
        userId: data.user_id,
        userName: data.user_name,
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: data.status,
        assignedTo: data.assigned_to,
        assignedToName: data.assigned_to_name,
        resolutionNotes: data.resolution_notes,
        resolvedAt: data.resolved_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    throw new Error('Supabase not configured');
  }

  /**
   * Update ticket
   */
  public async updateTicket(
    ticketId: string,
    updates: Partial<SupportTicket>
  ): Promise<void> {
    if (isSupabaseConfigured()) {
      const updateData: any = {};
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;
      if (updates.assignedToName !== undefined) updateData.assigned_to_name = updates.assignedToName;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.resolutionNotes !== undefined) updateData.resolution_notes = updates.resolutionNotes;
      
      if (updates.status === 'resolved' || updates.status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) {
        console.error('Error updating ticket:', error);
        throw error;
      }
    }
  }

  /**
   * Get ticket messages
   */
  public async getTicketMessages(ticketId: string): Promise<SupportTicketMessage[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      return (data || []).map((m: any) => ({
        id: m.id,
        ticketId: m.ticket_id,
        userId: m.user_id,
        userName: m.user_name,
        message: m.message,
        isInternal: m.is_internal,
        createdAt: m.created_at,
      }));
    }

    return [];
  }

  /**
   * Add message to ticket
   */
  public async addTicketMessage(
    ticketId: string,
    message: Omit<SupportTicketMessage, 'id' | 'ticketId' | 'createdAt'>
  ): Promise<SupportTicketMessage> {
    if (isSupabaseConfigured()) {
      const messageData: any = {
        ticket_id: ticketId,
        user_id: message.userId,
        user_name: message.userName,
        message: message.message,
        is_internal: message.isInternal,
      };

      const { data, error } = await supabase
        .from('support_ticket_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Error adding message:', error);
        throw error;
      }

      return {
        id: data.id,
        ticketId: data.ticket_id,
        userId: data.user_id,
        userName: data.user_name,
        message: data.message,
        isInternal: data.is_internal,
        createdAt: data.created_at,
      };
    }

    throw new Error('Supabase not configured');
  }

  /**
   * Get support metrics
   */
  public async getSupportMetrics(): Promise<SupportMetrics> {
    const tickets = await this.getAllTickets();
    
    const openTickets = tickets.filter(t => t.status === 'open');
    const inProgressTickets = tickets.filter(t => t.status === 'in_progress');
    const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
    const urgentTickets = tickets.filter(t => t.priority === 'urgent');

    // Calculate average resolution time
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    
    resolvedTickets.forEach(ticket => {
      if (ticket.resolvedAt && ticket.createdAt) {
        const created = new Date(ticket.createdAt).getTime();
        const resolved = new Date(ticket.resolvedAt).getTime();
        const hours = (resolved - created) / (1000 * 60 * 60);
        totalResolutionTime += hours;
        resolvedCount++;
      }
    });

    const averageResolutionTime = resolvedCount > 0
      ? Math.round(totalResolutionTime / resolvedCount)
      : 0;

    // Count by category
    const ticketsByCategory: { [key: string]: number } = {};
    tickets.forEach(t => {
      ticketsByCategory[t.category] = (ticketsByCategory[t.category] || 0) + 1;
    });

    return {
      totalTickets: tickets.length,
      openTickets: openTickets.length,
      inProgressTickets: inProgressTickets.length,
      resolvedTickets: resolvedTickets.length,
      averageResolutionTime,
      urgentTickets: urgentTickets.length,
      ticketsByCategory,
    };
  }
}
