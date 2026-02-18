import { AIConversation, ResolvedTaskLog, AIUsageSummary, ConversationType, ConversationChannel, UserProfile } from '../../types';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { storage, KEYS } from './shared';

export class AIUsageService {
  /**
   * Log an AI conversation
   */
  public async logConversation(
    conversationType: ConversationType,
    channel: ConversationChannel,
    userMessage: string,
    aiResponse: string,
    tokensUsed: number = 0,
    costUsd: number = 0,
    patientId?: string,
    metadata?: Record<string, any>
  ): Promise<AIConversation> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
    if (!currentUser || (currentUser.role !== 'clinic' && currentUser.role !== 'pharmacy')) {
      throw new Error('Only facilities can log AI conversations');
    }

    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        facility_id: currentUser.id,
        patient_id: patientId || null,
        conversation_type: conversationType,
        channel: channel,
        user_message: userMessage,
        ai_response: aiResponse,
        tokens_used: tokensUsed,
        cost_usd: costUsd,
        status: 'completed',
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging AI conversation:', error);
      throw error;
    }

    return this.mapConversationFromDB(data);
  }

  /**
   * Get AI conversations for current facility
   */
  public async getConversations(
    startDate?: string,
    endDate?: string,
    conversationType?: ConversationType,
    channel?: ConversationChannel
  ): Promise<AIConversation[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
    if (!currentUser) {
      return [];
    }

    let query = supabase
      .from('ai_conversations')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by facility (unless superadmin)
    if (currentUser.role !== 'superadmin') {
      query = query.eq('facility_id', currentUser.id);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    if (conversationType) {
      query = query.eq('conversation_type', conversationType);
    }

    if (channel) {
      query = query.eq('channel', channel);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching AI conversations:', error);
      return [];
    }

    return (data || []).map(this.mapConversationFromDB);
  }

  /**
   * Get AI usage statistics for current facility
   */
  public async getUsageStats(
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalConversations: number;
    totalTokens: number;
    totalCostUsd: number;
    byType: Record<ConversationType, number>;
    byChannel: Record<ConversationChannel, number>;
  }> {
    const conversations = await this.getConversations(startDate, endDate);

    const stats = {
      totalConversations: conversations.length,
      totalTokens: conversations.reduce((sum, c) => sum + c.tokensUsed, 0),
      totalCostUsd: conversations.reduce((sum, c) => sum + c.costUsd, 0),
      byType: {} as Record<ConversationType, number>,
      byChannel: {} as Record<ConversationChannel, number>,
    };

    conversations.forEach(conv => {
      stats.byType[conv.conversationType] = (stats.byType[conv.conversationType] || 0) + 1;
      stats.byChannel[conv.channel] = (stats.byChannel[conv.channel] || 0) + 1;
    });

    return stats;
  }

  /**
   * Log a resolved task
   */
  public async logResolvedTask(
    taskId: string,
    taskType: string,
    patientId?: string,
    resolutionNotes?: string,
    timeToResolveMinutes?: number
  ): Promise<ResolvedTaskLog> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
    if (!currentUser || (currentUser.role !== 'clinic' && currentUser.role !== 'pharmacy')) {
      throw new Error('Only facilities can log resolved tasks');
    }

    const { data, error } = await supabase
      .from('resolved_tasks_log')
      .insert({
        task_id: taskId,
        facility_id: currentUser.id,
        patient_id: patientId || null,
        task_type: taskType,
        resolved_by: currentUser.id,
        resolution_notes: resolutionNotes,
        time_to_resolve_minutes: timeToResolveMinutes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging resolved task:', error);
      throw error;
    }

    return this.mapResolvedTaskFromDB(data);
  }

  /**
   * Get resolved tasks for current facility
   */
  public async getResolvedTasks(
    startDate?: string,
    endDate?: string
  ): Promise<ResolvedTaskLog[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
    if (!currentUser) {
      return [];
    }

    let query = supabase
      .from('resolved_tasks_log')
      .select('*')
      .order('resolved_at', { ascending: false });

    // Filter by facility (unless superadmin)
    if (currentUser.role !== 'superadmin') {
      query = query.eq('facility_id', currentUser.id);
    }

    if (startDate) {
      query = query.gte('resolved_at', startDate);
    }

    if (endDate) {
      query = query.lte('resolved_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching resolved tasks:', error);
      return [];
    }

    return (data || []).map(this.mapResolvedTaskFromDB);
  }

  /**
   * Get resolved tasks statistics
   */
  public async getResolvedTasksStats(
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalResolved: number;
    averageResolutionTime: number;
    byType: Record<string, number>;
  }> {
    const resolvedTasks = await this.getResolvedTasks(startDate, endDate);

    const stats = {
      totalResolved: resolvedTasks.length,
      averageResolutionTime: 0,
      byType: {} as Record<string, number>,
    };

    if (resolvedTasks.length > 0) {
      const totalTime = resolvedTasks
        .filter(t => t.timeToResolveMinutes)
        .reduce((sum, t) => sum + (t.timeToResolveMinutes || 0), 0);
      const tasksWithTime = resolvedTasks.filter(t => t.timeToResolveMinutes).length;
      stats.averageResolutionTime = tasksWithTime > 0 ? Math.round(totalTime / tasksWithTime) : 0;
    }

    resolvedTasks.forEach(task => {
      stats.byType[task.taskType] = (stats.byType[task.taskType] || 0) + 1;
    });

    return stats;
  }

  /**
   * Get AI usage summary for billing
   */
  public async getUsageSummary(
    facilityId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<AIUsageSummary | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from('ai_usage_summary')
      .select('*')
      .eq('facility_id', facilityId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .maybeSingle();

    if (error) {
      console.error('Error fetching AI usage summary:', error);
      return null;
    }

    if (!data) return null;

    return this.mapUsageSummaryFromDB(data);
  }

  private mapConversationFromDB(data: any): AIConversation {
    return {
      id: data.id,
      facilityId: data.facility_id,
      patientId: data.patient_id,
      conversationType: data.conversation_type,
      channel: data.channel,
      userMessage: data.user_message,
      aiResponse: data.ai_response,
      tokensUsed: data.tokens_used || 0,
      costUsd: parseFloat(data.cost_usd || 0),
      status: data.status,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapResolvedTaskFromDB(data: any): ResolvedTaskLog {
    return {
      id: data.id,
      taskId: data.task_id,
      facilityId: data.facility_id,
      patientId: data.patient_id,
      taskType: data.task_type,
      resolvedBy: data.resolved_by,
      resolvedAt: data.resolved_at,
      resolutionNotes: data.resolution_notes,
      timeToResolveMinutes: data.time_to_resolve_minutes,
      createdAt: data.created_at,
    };
  }

  private mapUsageSummaryFromDB(data: any): AIUsageSummary {
    return {
      id: data.id,
      facilityId: data.facility_id,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      totalConversations: data.total_conversations || 0,
      totalTokens: data.total_tokens || 0,
      totalCostUsd: parseFloat(data.total_cost_usd || 0),
      conversationsByType: data.conversations_by_type || {},
      conversationsByChannel: data.conversations_by_channel || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
