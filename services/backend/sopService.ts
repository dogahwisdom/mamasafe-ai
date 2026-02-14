/**
 * SOP Service
 * 
 * Manages Standard Operating Procedures and tracks access
 */

import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';

export interface SOP {
  id: string;
  title: string;
  description?: string;
  category: 'enrollment' | 'triage' | 'referral' | 'medication' | 'compliance' | 'training' | 'other';
  content: string;
  version: string;
  isActive: boolean;
  fileUrl?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SOPAccessLog {
  id: string;
  sopId: string;
  facilityId: string;
  facilityName: string;
  userId?: string;
  userName?: string;
  action: 'viewed' | 'downloaded' | 'completed';
  accessedAt: string;
}

export interface SOPMetrics {
  totalSOPs: number;
  activeSOPs: number;
  totalAccesses: number;
  accessesByCategory: { [key: string]: number };
  topAccessedSOPs: Array<{ sopId: string; title: string; accessCount: number }>;
  facilityCompliance: Array<{ facilityId: string; facilityName: string; accessedSOPs: number; totalSOPs: number }>;
}

export class SOPService {
  /**
   * Get all SOPs
   */
  public async getAllSOPs(): Promise<SOP[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('sops')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching SOPs:', error);
        return [];
      }

      return (data || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        category: s.category,
        content: s.content,
        version: s.version,
        isActive: s.is_active,
        fileUrl: s.file_url,
        createdBy: s.created_by,
        createdByName: s.created_by_name,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));
    }

    return [];
  }

  /**
   * Get active SOPs only
   */
  public async getActiveSOPs(): Promise<SOP[]> {
    const allSOPs = await this.getAllSOPs();
    return allSOPs.filter(sop => sop.isActive);
  }

  /**
   * Get SOP by ID
   */
  public async getSOPById(sopId: string): Promise<SOP | null> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('sops')
        .select('*')
        .eq('id', sopId)
        .single();

      if (error) {
        console.error('Error fetching SOP:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        category: data.category,
        content: data.content,
        version: data.version,
        isActive: data.is_active,
        fileUrl: data.file_url,
        createdBy: data.created_by,
        createdByName: data.created_by_name,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    return null;
  }

  /**
   * Create new SOP
   */
  public async createSOP(sop: Omit<SOP, 'id' | 'createdAt' | 'updatedAt'>): Promise<SOP> {
    if (isSupabaseConfigured()) {
      const sopData: any = {
        title: sop.title,
        description: sop.description,
        category: sop.category,
        content: sop.content,
        version: sop.version || '1.0',
        is_active: sop.isActive !== undefined ? sop.isActive : true,
        file_url: sop.fileUrl,
        created_by: sop.createdBy,
        created_by_name: sop.createdByName,
      };

      const { data, error } = await supabase
        .from('sops')
        .insert(sopData)
        .select()
        .single();

      if (error) {
        console.error('Error creating SOP:', error);
        throw error;
      }

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        category: data.category,
        content: data.content,
        version: data.version,
        isActive: data.is_active,
        fileUrl: data.file_url,
        createdBy: data.created_by,
        createdByName: data.created_by_name,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    throw new Error('Supabase not configured');
  }

  /**
   * Update SOP
   */
  public async updateSOP(sopId: string, updates: Partial<SOP>): Promise<void> {
    if (isSupabaseConfigured()) {
      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.version !== undefined) updateData.version = updates.version;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.fileUrl !== undefined) updateData.file_url = updates.fileUrl;

      const { data, error } = await supabase
        .from('sops')
        .update(updateData)
        .eq('id', sopId);

      if (error) {
        console.error('Error updating SOP:', error);
        throw error;
      }
    }
  }

  /**
   * Log SOP access
   */
  public async logSOPAccess(
    sopId: string,
    facilityId: string,
    facilityName: string,
    action: 'viewed' | 'downloaded' | 'completed',
    userId?: string,
    userName?: string
  ): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('sop_access_logs')
        .insert({
          sop_id: sopId,
          facility_id: facilityId,
          facility_name: facilityName,
          user_id: userId,
          user_name: userName,
          action,
        });

      if (error) {
        console.error('Error logging SOP access:', error);
        throw error;
      }
    }
  }

  /**
   * Get access logs for a facility
   */
  public async getFacilityAccessLogs(facilityId: string): Promise<SOPAccessLog[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('sop_access_logs')
        .select('*')
        .eq('facility_id', facilityId)
        .order('accessed_at', { ascending: false });

      if (error) {
        console.error('Error fetching access logs:', error);
        return [];
      }

      return (data || []).map((log: any) => ({
        id: log.id,
        sopId: log.sop_id,
        facilityId: log.facility_id,
        facilityName: log.facility_name,
        userId: log.user_id,
        userName: log.user_name,
        action: log.action,
        accessedAt: log.accessed_at,
      }));
    }

    return [];
  }

  /**
   * Get SOP metrics
   */
  public async getSOPMetrics(): Promise<SOPMetrics> {
    const sops = await this.getAllSOPs();
    const activeSOPs = sops.filter(s => s.isActive);

    if (isSupabaseConfigured()) {
      const { data: accessLogs } = await supabase
        .from('sop_access_logs')
        .select('*');

      const totalAccesses = accessLogs?.length || 0;

      // Count accesses by category
      const accessesByCategory: { [key: string]: number } = {};
      if (accessLogs) {
        for (const log of accessLogs) {
          const sop = sops.find(s => s.id === log.sop_id);
          if (sop) {
            accessesByCategory[sop.category] = (accessesByCategory[sop.category] || 0) + 1;
          }
        }
      }

      // Get top accessed SOPs
      const sopAccessCounts: { [key: string]: number } = {};
      if (accessLogs) {
        accessLogs.forEach((log: any) => {
          sopAccessCounts[log.sop_id] = (sopAccessCounts[log.sop_id] || 0) + 1;
        });
      }

      const topAccessedSOPs = Object.entries(sopAccessCounts)
        .map(([sopId, accessCount]) => {
          const sop = sops.find(s => s.id === sopId);
          return {
            sopId,
            title: sop?.title || 'Unknown',
            accessCount,
          };
        })
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 10);

      // Get facility compliance
      const facilityComplianceMap: { [key: string]: { name: string; accessedSOPs: Set<string> } } = {};
      if (accessLogs) {
        accessLogs.forEach((log: any) => {
          if (!facilityComplianceMap[log.facility_id]) {
            facilityComplianceMap[log.facility_id] = {
              name: log.facility_name,
              accessedSOPs: new Set(),
            };
          }
          facilityComplianceMap[log.facility_id].accessedSOPs.add(log.sop_id);
        });
      }

      const facilityCompliance = Object.entries(facilityComplianceMap).map(([facilityId, data]) => ({
        facilityId,
        facilityName: data.name,
        accessedSOPs: data.accessedSOPs.size,
        totalSOPs: activeSOPs.length,
      }));

      return {
        totalSOPs: sops.length,
        activeSOPs: activeSOPs.length,
        totalAccesses,
        accessesByCategory,
        topAccessedSOPs,
        facilityCompliance,
      };
    }

    return {
      totalSOPs: sops.length,
      activeSOPs: activeSOPs.length,
      totalAccesses: 0,
      accessesByCategory: {},
      topAccessedSOPs: [],
      facilityCompliance: [],
    };
  }
}
