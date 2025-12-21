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
            profiles: {
                Row: {
                    id: string
                    email: string | null
                    role: 'admin' | 'coach' | 'student'
                    full_name: string | null
                    avatar_url: string | null
                    status: 'pending' | 'active' | 'rejected' | 'banned'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    role?: 'admin' | 'coach' | 'student'
                    full_name?: string | null
                    avatar_url?: string | null
                    status?: 'pending' | 'active' | 'rejected' | 'banned'
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string | null
                    role?: 'admin' | 'coach' | 'student'
                    full_name?: string | null
                    avatar_url?: string | null
                    status?: 'pending' | 'active' | 'rejected' | 'banned'
                    created_at?: string
                    updated_at?: string
                }
            }
            exercises: {
                Row: {
                    id: string
                    coach_id: string | null
                    name: string
                    muscle_group: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'abs' | 'cardio' | 'full_body'
                    video_url: string | null
                    image_url: string | null
                    description: string | null
                    is_archived: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    coach_id?: string | null
                    name: string
                    muscle_group: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'abs' | 'cardio' | 'full_body'
                    video_url?: string | null
                    image_url?: string | null
                    description?: string | null
                    is_archived?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    coach_id?: string | null
                    name?: string
                    muscle_group?: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'abs' | 'cardio' | 'full_body'
                    video_url?: string | null
                    image_url?: string | null
                    description?: string | null
                    is_archived?: boolean
                    created_at?: string
                }
            }
            routines: {
                Row: {
                    id: string
                    coach_id: string
                    name: string
                    description: string | null
                    duration_weeks: number
                    is_template: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    coach_id: string
                    name: string
                    description?: string | null
                    duration_weeks?: number
                    is_template?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    coach_id?: string
                    name?: string
                    description?: string | null
                    duration_weeks?: number
                    is_template?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            student_assignments: {
                Row: {
                    id: string
                    student_id: string
                    routine_id: string
                    started_at: string | null
                    end_date: string | null
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    student_id: string
                    routine_id: string
                    started_at?: string | null
                    end_date?: string | null
                    is_active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    student_id?: string
                    routine_id?: string
                    started_at?: string | null
                    end_date?: string | null
                    is_active?: boolean
                    created_at?: string
                }
            },
            students_data: {
                Row: {
                    id: string
                    coach_id: string | null
                    consultancy_expires_at: string | null
                    birth_date: string | null
                    height_cm: number | null
                    weight_kg: number | null
                    goal: string | null
                    notes: string | null
                    updated_at: string
                }
                Insert: {
                    id: string
                    coach_id?: string | null
                    consultancy_expires_at?: string | null
                    birth_date?: string | null
                    height_cm?: number | null
                    weight_kg?: number | null
                    goal?: string | null
                    notes?: string | null
                    updated_at?: string
                }
                Update: {
                    id?: string
                    coach_id?: string | null
                    consultancy_expires_at?: string | null
                    birth_date?: string | null
                    height_cm?: number | null
                    weight_kg?: number | null
                    goal?: string | null
                    notes?: string | null
                    updated_at?: string
                }
            },
            coaches_data: {
                Row: {
                    id: string
                    cref: string | null
                    phone: string | null
                    bio: string | null
                    subscription_status: 'trial' | 'active' | 'past_due' | 'canceled'
                    subscription_expires_at: string | null
                    max_students: number
                }
                Insert: {
                    id: string
                    cref?: string | null
                    phone?: string | null
                    bio?: string | null
                    subscription_status?: 'trial' | 'active' | 'past_due' | 'canceled'
                    subscription_expires_at?: string | null
                    max_students?: number
                }
                Update: {
                    id?: string
                    cref?: string | null
                    phone?: string | null
                    bio?: string | null
                    subscription_status?: 'trial' | 'active' | 'past_due' | 'canceled'
                    subscription_expires_at?: string | null
                    max_students?: number
                }
            }
        }
    }
}
