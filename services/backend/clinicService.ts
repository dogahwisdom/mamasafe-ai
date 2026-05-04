import { Task } from "../../types";
import { KEYS, storage, DEFAULT_TASKS } from "./shared";
import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { TestPatientVisibility } from "../testPatientVisibility";

function mapTaskRow(t: any): Task {
  return {
    id: t.id,
    patientId: t.patient_id,
    patientName: t.patient_name,
    type: t.type as Task["type"],
    deadline: t.deadline,
    resolved: t.resolved,
    notes: t.notes || undefined,
    timestamp: t.timestamp,
    resolvedAt: t.resolved_at ?? undefined,
  };
}

export class ClinicService {
  /**
   * All tasks for facility views. Excludes test/QA patients unless `includeTestPatients`.
   */
  public async getTasks(options?: { includeTestPatients?: boolean }): Promise<Task[]> {
    const includeTest = options?.includeTestPatients === true;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("tasks")
        .select(`*, patients ( is_test )`)
        .order("timestamp", { ascending: false });

      if (error) {
        console.error("Error fetching tasks:", error);
        return storage.get<Task[]>(KEYS.CLINIC_TASKS, DEFAULT_TASKS);
      }

      let rows = data || [];
      if (!includeTest) {
        rows = rows.filter((t: any) => t.patients?.is_test !== true);
      }

      return rows.map((t: any) => {
        const { patients: _p, ...rest } = t;
        return mapTaskRow(rest);
      });
    }

    const stored = storage.get<Task[]>(KEYS.CLINIC_TASKS, DEFAULT_TASKS);
    if (includeTest) return stored;
    return stored.filter((t) => !TestPatientVisibility.nameLooksLikeTestData(t.patientName));
  }

  /** Tasks for a single patient (profile tab) — not filtered by is_test. */
  public async getTasksForPatient(patientId: string): Promise<Task[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("patient_id", patientId)
        .order("timestamp", { ascending: false });

      if (error) {
        console.error("Error fetching tasks for patient:", error);
        return [];
      }
      return (data || []).map(mapTaskRow);
    }

    const stored = storage.get<Task[]>(KEYS.CLINIC_TASKS, DEFAULT_TASKS);
    return stored.filter((t) => t.patientId === patientId);
  }

  public async resolveTask(taskId: string): Promise<void> {
    const resolvedAt = Date.now();

    let task: Task | undefined;
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from("tasks").select("*").eq("id", taskId).single();

      if (data) {
        task = mapTaskRow(data);
      }
    } else {
      const tasks = storage.get<Task[]>(KEYS.CLINIC_TASKS, DEFAULT_TASKS);
      task = tasks.find((t) => t.id === taskId);
    }

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from("tasks")
        .update({
          resolved: true,
          resolved_at: resolvedAt,
        })
        .eq("id", taskId);

      if (error) {
        console.error("Error resolving task:", error);
        throw error;
      }

      if (task) {
        try {
          const timeToResolve = task.timestamp
            ? Math.round((resolvedAt - task.timestamp) / (1000 * 60))
            : undefined;
          const { backend } = await import("../backend");
          await backend.aiUsage.logResolvedTask(
            taskId,
            task.type,
            task.patientId,
            task.notes,
            timeToResolve
          );
        } catch (error) {
          console.warn("Error logging resolved task:", error);
        }
      }
      return;
    }

    const tasks = storage.get<Task[]>(KEYS.CLINIC_TASKS, DEFAULT_TASKS);
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, resolved: true, resolvedAt } : t
    );
    storage.set(KEYS.CLINIC_TASKS, updatedTasks);
  }

  public async addTask(task: Task): Promise<void> {
    if (isSupabaseConfigured()) {
      const { data: existing } = await supabase
        .from("tasks")
        .select("id")
        .eq("patient_id", task.patientId)
        .eq("type", task.type)
        .eq("resolved", false)
        .limit(1);

      if (existing && existing.length > 0) {
        return;
      }

      const { error } = await supabase.from("tasks").insert({
        patient_id: task.patientId,
        patient_name: task.patientName,
        type: task.type,
        deadline: task.deadline,
        resolved: false,
        notes: task.notes || null,
        timestamp: task.timestamp,
      });

      if (error) {
        console.error("Error creating task:", error);
        throw error;
      }
      return;
    }

    const tasks = storage.get<Task[]>(KEYS.CLINIC_TASKS, DEFAULT_TASKS);
    const exists = tasks.some(
      (t) => t.patientId === task.patientId && t.type === task.type && !t.resolved
    );
    if (!exists) {
      tasks.unshift(task);
      storage.set(KEYS.CLINIC_TASKS, tasks);
    }
  }
}
