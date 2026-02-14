// Auto-generated types for Supabase database
// This file will be updated when you run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          role: 'patient' | 'clinic' | 'pharmacy'
          name: string
          phone: string
          email: string | null
          location: string
          avatar: string | null
          country_code: string
          subscription_plan: string | null
          pin_hash: string | null
          patient_data: Json | null
          facility_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          role: 'patient' | 'clinic' | 'pharmacy'
          name: string
          phone: string
          email?: string | null
          location: string
          avatar?: string | null
          country_code?: string
          subscription_plan?: string | null
          pin_hash?: string | null
          patient_data?: Json | null
          facility_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'patient' | 'clinic' | 'pharmacy'
          name?: string
          phone?: string
          email?: string | null
          location?: string
          avatar?: string | null
          country_code?: string
          subscription_plan?: string | null
          pin_hash?: string | null
          patient_data?: Json | null
          facility_data?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          user_id: string | null
          name: string
          age: number
          gestational_weeks: number
          location: string
          phone: string
          last_check_in: string | null
          risk_status: 'Low' | 'Medium' | 'High' | 'Critical'
          next_appointment: string | null
          alerts: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          age: number
          gestational_weeks: number
          location: string
          phone: string
          last_check_in?: string | null
          risk_status: 'Low' | 'Medium' | 'High' | 'Critical'
          next_appointment?: string | null
          alerts?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          age?: number
          gestational_weeks?: number
          location?: string
          phone?: string
          last_check_in?: string | null
          risk_status?: 'Low' | 'Medium' | 'High' | 'Critical'
          next_appointment?: string | null
          alerts?: Json
          created_at?: string
          updated_at?: string
        }
      }
      medications: {
        Row: {
          id: string
          patient_id: string
          name: string
          dosage: string
          frequency: string
          time: string
          instructions: string | null
          type: 'morning' | 'afternoon' | 'evening'
          adherence_rate: number
          taken: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          name: string
          dosage: string
          frequency: string
          time: string
          instructions?: string | null
          type: 'morning' | 'afternoon' | 'evening'
          adherence_rate?: number
          taken?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          name?: string
          dosage?: string
          frequency?: string
          time?: string
          instructions?: string | null
          type?: 'morning' | 'afternoon' | 'evening'
          adherence_rate?: number
          taken?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          patient_id: string
          patient_name: string
          type: 'High Risk' | 'Missed Visit' | 'No Consent' | 'Triage Alert'
          deadline: string
          resolved: boolean
          notes: string | null
          timestamp: number
          resolved_at: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          patient_name: string
          type: 'High Risk' | 'Missed Visit' | 'No Consent' | 'Triage Alert'
          deadline: string
          resolved?: boolean
          notes?: string | null
          timestamp: number
          resolved_at?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          patient_name?: string
          type?: 'High Risk' | 'Missed Visit' | 'No Consent' | 'Triage Alert'
          deadline?: string
          resolved?: boolean
          notes?: string | null
          timestamp?: number
          resolved_at?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      referrals: {
        Row: {
          id: string
          patient_id: string
          patient_name: string
          from_facility: string
          to_facility: string
          reason: string
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          patient_name: string
          from_facility: string
          to_facility: string
          reason: string
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          patient_name?: string
          from_facility?: string
          to_facility?: string
          reason?: string
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      reminders: {
        Row: {
          id: string
          patient_id: string
          patient_name: string
          phone: string
          channel: 'whatsapp' | 'sms'
          type: 'appointment' | 'medication' | 'symptom_checkin'
          message: string
          scheduled_for: string
          sent: boolean
          sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          patient_name: string
          phone: string
          channel: 'whatsapp' | 'sms'
          type: 'appointment' | 'medication' | 'symptom_checkin'
          message: string
          scheduled_for: string
          sent?: boolean
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          patient_name?: string
          phone?: string
          channel?: 'whatsapp' | 'sms'
          type?: 'appointment' | 'medication' | 'symptom_checkin'
          message?: string
          scheduled_for?: string
          sent?: boolean
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      refill_requests: {
        Row: {
          id: string
          patient_name: string
          initials: string
          medication: string
          dosage: string
          duration: string
          status: 'pending' | 'dispensed'
          request_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_name: string
          initials: string
          medication: string
          dosage: string
          duration: string
          status?: 'pending' | 'dispensed'
          request_time: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_name?: string
          initials?: string
          medication?: string
          dosage?: string
          duration?: string
          status?: 'pending' | 'dispensed'
          request_time?: string
          created_at?: string
          updated_at?: string
        }
      }
      inventory: {
        Row: {
          id: string
          name: string
          stock: number
          min_level: number
          unit: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          stock?: number
          min_level?: number
          unit: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          stock?: number
          min_level?: number
          unit?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
