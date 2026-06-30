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
                    muscle_weights: Json
                    exercise_type: 'reps' | 'time' | 'cardio'
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
                    muscle_weights?: Json
                    exercise_type?: 'reps' | 'time' | 'cardio'
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
                    muscle_weights?: Json
                    exercise_type?: 'reps' | 'time' | 'cardio'
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
            },
            set_templates: {
                Row: {
                    id: string
                    coach_id: string
                    name: string
                    sets: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    coach_id: string
                    name: string
                    sets: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    coach_id?: string
                    name?: string
                    sets?: Json
                    created_at?: string
                }
            },
            workouts: {
                Row: {
                    id: string
                    routine_id: string
                    name: string
                    day_number: number | null
                    order_index: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    routine_id: string
                    name: string
                    day_number?: number | null
                    order_index?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    routine_id?: string
                    name?: string
                    day_number?: number | null
                    order_index?: number
                    created_at?: string
                }
            },
            workout_items: {
                Row: {
                    id: string
                    workout_id: string
                    exercise_id: string
                    order_index: number
                    coach_notes: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    workout_id: string
                    exercise_id: string
                    order_index: number
                    coach_notes?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    workout_id?: string
                    exercise_id?: string
                    order_index?: number
                    coach_notes?: string | null
                    created_at?: string
                }
            },
            workout_sets: {
                Row: {
                    id: string
                    workout_item_id: string
                    type: 'warmup' | 'working' | 'failure' | 'drop' | 'preparation'
                    reps_target: string | null
                    weight_target: number | null
                    rest_seconds: number
                    rpe_target: number | null
                    set_order: number
                    created_at: string
                    time_target: number | null
                    distance_target: number | null
                    speed_target: number | null
                    hiit_work_seconds: number | null
                    hiit_rest_seconds: number | null
                    hiit_work_speed: number | null
                    hiit_rest_speed: number | null
                    hiit_cycles: number | null
                }
                Insert: {
                    id?: string
                    workout_item_id: string
                    type: 'warmup' | 'working' | 'failure' | 'drop' | 'preparation'
                    reps_target?: string | null
                    weight_target?: number | null
                    rest_seconds?: number
                    rpe_target?: number | null
                    set_order: number
                    created_at?: string
                    time_target?: number | null
                    distance_target?: number | null
                    speed_target?: number | null
                    hiit_work_seconds?: number | null
                    hiit_rest_seconds?: number | null
                    hiit_work_speed?: number | null
                    hiit_rest_speed?: number | null
                    hiit_cycles?: number | null
                }
                Update: {
                    id?: string
                    workout_item_id?: string
                    type?: 'warmup' | 'working' | 'failure' | 'drop' | 'preparation'
                    reps_target?: string | null
                    weight_target?: number | null
                    rest_seconds?: number
                    rpe_target?: number | null
                    set_order?: number
                    created_at?: string
                    time_target?: number | null
                    distance_target?: number | null
                    speed_target?: number | null
                    hiit_work_seconds?: number | null
                    hiit_rest_seconds?: number | null
                    hiit_work_speed?: number | null
                    hiit_rest_speed?: number | null
                    hiit_cycles?: number | null
                }
            },
            workout_logs: {
                Row: {
                    id: string
                    student_id: string
                    workout_id: string | null
                    started_at: string
                    finished_at: string | null
                    effort_rating: number | null
                    feedback_notes: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    student_id: string
                    workout_id?: string | null
                    started_at: string
                    finished_at?: string | null
                    effort_rating?: number | null
                    feedback_notes?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    student_id?: string
                    workout_id?: string | null
                    started_at?: string
                    finished_at?: string | null
                    effort_rating?: number | null
                    feedback_notes?: string | null
                    created_at?: string
                }
            },
            set_logs: {
                Row: {
                    id: string
                    workout_log_id: string
                    exercise_id: string
                    set_type: 'warmup' | 'working' | 'failure' | 'drop' | 'preparation'
                    weight_kg: number | null
                    reps_completed: number | null
                    rpe_actual: number | null
                    completed_at: string
                    time_completed: number | null
                    distance_completed: number | null
                    speed_actual: number | null
                    hiit_cycles_completed: number | null
                }
                Insert: {
                    id?: string
                    workout_log_id: string
                    exercise_id: string
                    set_type?: 'warmup' | 'working' | 'failure' | 'drop' | 'preparation'
                    weight_kg?: number | null
                    reps_completed?: number | null
                    rpe_actual?: number | null
                    completed_at?: string
                    time_completed?: number | null
                    distance_completed?: number | null
                    speed_actual?: number | null
                    hiit_cycles_completed?: number | null
                }
                Update: {
                    id?: string
                    workout_log_id?: string
                    exercise_id?: string
                    set_type?: 'warmup' | 'working' | 'failure' | 'drop' | 'preparation'
                    weight_kg?: number | null
                    reps_completed?: number | null
                    rpe_actual?: number | null
                    completed_at?: string
                    time_completed?: number | null
                    distance_completed?: number | null
                    speed_actual?: number | null
                    hiit_cycles_completed?: number | null
                }
            },
            exercise_feedback_logs: {
                Row: {
                    id: string
                    workout_log_id: string
                    exercise_id: string
                    feedback_text: string
                    sentiment: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    workout_log_id: string
                    exercise_id: string
                    feedback_text: string
                    sentiment?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    workout_log_id?: string
                    exercise_id?: string
                    feedback_text?: string
                    sentiment?: string | null
                    created_at?: string
                }
            }
        }
    }
}
