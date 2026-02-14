import { Task } from "../types";
import { KEYS, storage, DEFAULT_TASKS } from "./shared";
import { supabase, isSupabaseConfigured } from "../supabaseClient";

export class ClinicService {
  public async getTasks(): Promise<Task[]> {
    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        return storage.get<Task[]>(KEYS.CLINIC_TASKS, DEFAULT_TASKS);
      }

      return (data || []).map((t: any) => ({
        id: t.id,
        patientId: t.patient_id,
        patientName: t.patient_name,
        type: t.type as 'High Risk' | 'Missed Visit' | 'No Consent' | 'Triage Alert',
        deadline: t.deadline,
        resolved: t.resolved,
        notes: t.notes || undefined,
        timestamp: t.timestamp,
        resolvedAt: t.resolved_at || undefined,
      }));
    }

    // Fallback to localStorage
    return storage.get<Task[]>(KEYS.CLINIC_TASKS, DEFAULT_TASKS);
  }

  public async resolveTask(taskId: string): Promise<void> {
    const resolvedAt = Date.now();

    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('tasks')
        .update({
          resolved: true,
          resolved_at: resolvedAt,
        })
        .eq('id', taskId);

      if (error) {
        console.error('Error resolving task:', error);
        throw error;
      }
      return;
    }

    // Fallback to localStorage
    const tasks = storage.get<Task[]>(KEYS.CLINIC_TASKS, DEFAULT_TASKS);
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, resolved: true, resolvedAt } : t
    );
    storage.set(KEYS.CLINIC_TASKS, updatedTasks);
  }

  public async addTask(task: Task): Promise<void> {
    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      // Check if task already exists
      const { data: existing } = await supabase
        .from('tasks')
        .select('id')
        .eq('patient_id', task.patientId)
        .eq('type', task.type)
        .eq('resolved', false)
        .limit(1);

      if (existing && existing.length > 0) {
        return; // Task already exists
      }

      const { error } = await supabase
        .from('tasks')
        .insert({
          patient_id: task.patientId,
          patient_name: task.patientName,
          type: task.type,
          deadline: task.deadline,
          resolved: false,
          notes: task.notes || null,
          timestamp: task.timestamp,
        });

      if (error) {
        console.error('Error creating task:', error);
        throw error;
      }
      return;
    }

    // Fallback to localStorage
    const tasks = storage.get<Task[]>(KEYS.CLINIC_TASKS, DEFAULT_TASKS);
    const exists = tasks.some(
      (t) =>
        t.patientId === task.patientId &&
        t.type === task.type &&
        !t.resolved
    );
    if (!exists) {
      tasks.unshift(task);
      storage.set(KEYS.CLINIC_TASKS, tasks);
    }
  }
}

