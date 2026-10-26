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
                    preferences?: Json | null
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
                    preferences?: Json | null
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
                    preferences?: Json | null
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
                    gender?: 'male' | 'female' | 'other' | string | null
                    activity_level?: string | null
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
                    gender?: 'male' | 'female' | 'other' | string | null
                    activity_level?: string | null
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
                    gender?: 'male' | 'female' | 'other' | string | null
                    activity_level?: string | null
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
                    description?: string | null
                    duration_minutes?: number | string | null
                    day_number: number | null
                    order_index: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    routine_id: string
                    name: string
                    description?: string | null
                    duration_minutes?: number | string | null
                    day_number?: number | null
                    order_index?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    routine_id?: string
                    name?: string
                    description?: string | null
                    duration_minutes?: number | string | null
                    day_number?: number | null
                    order_index?: number
                    created_at?: string
                }
            },
            exercise_groups: {
                Row: {
                    id: string
                    workout_id: string
                    group_type: 'superset' | 'triset' | 'giant_set' | 'paired_antagonist'
                    group_order: number
                    rest_seconds: number
                    rounds: number
                    transition_seconds: number
                    coach_notes: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    workout_id: string
                    group_type?: 'superset' | 'triset' | 'giant_set' | 'paired_antagonist'
                    group_order: number
                    rest_seconds?: number
                    rounds?: number
                    transition_seconds?: number
                    coach_notes?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    workout_id?: string
                    group_type?: 'superset' | 'triset' | 'giant_set' | 'paired_antagonist'
                    group_order?: number
                    rest_seconds?: number
                    rounds?: number
                    transition_seconds?: number
                    coach_notes?: string | null
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
                    group_id: string | null
                    group_position: number | null
                }
                Insert: {
                    id?: string
                    workout_id: string
                    exercise_id: string
                    order_index: number
                    coach_notes?: string | null
                    created_at?: string
                    group_id?: string | null
                    group_position?: number | null
                }
                Update: {
                    id?: string
                    workout_id?: string
                    exercise_id?: string
                    order_index?: number
                    coach_notes?: string | null
                    created_at?: string
                    group_id?: string | null
                    group_position?: number | null
                }
            },
            workout_sets: {
                Row: {
                    id: string
                    workout_item_id: string
                    type: 'warmup' | 'working' | 'failure' | 'drop' | 'preparation' | 'backoff' | 'deload'
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
                    set_method: 'standard' | 'dropset' | 'rest_pause' | 'cluster' | 'myo_reps' | 'muscle_round' | 'method_3_7' | 'fst7' | 'bfr'
                    micro_rest_seconds: number | null
                    execution_mode: 'standard' | 'tempo' | 'pause_reps' | 'deadstop' | 'ponto_zero' | 'lengthened_partial' | 'twenty_ones' | 'one_and_half' | 'negative' | 'forced_reps'
                    tempo: string | null
                    timer_mode: 'standard' | 'emom' | 'amrap' | 'tabata'
                    drop_count: number | null
                    sub_sets: number | null
                    activation_reps: number | null
                }
                Insert: {
                    id?: string
                    workout_item_id: string
                    type?: 'warmup' | 'working' | 'failure' | 'drop' | 'preparation' | 'backoff' | 'deload'
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
                    set_method?: 'standard' | 'dropset' | 'rest_pause' | 'cluster' | 'myo_reps' | 'muscle_round' | 'method_3_7' | 'fst7' | 'bfr'
                    micro_rest_seconds?: number | null
                    execution_mode?: 'standard' | 'tempo' | 'pause_reps' | 'deadstop' | 'ponto_zero' | 'lengthened_partial' | 'twenty_ones' | 'one_and_half' | 'negative' | 'forced_reps'
                    tempo?: string | null
                    timer_mode?: 'standard' | 'emom' | 'amrap' | 'tabata'
                    drop_count?: number | null
                    sub_sets?: number | null
                    activation_reps?: number | null
                }
                Update: {
                    id?: string
                    workout_item_id?: string
                    type?: 'warmup' | 'working' | 'failure' | 'drop' | 'preparation' | 'backoff' | 'deload'
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
                    set_method?: 'standard' | 'dropset' | 'rest_pause' | 'cluster' | 'myo_reps' | 'muscle_round' | 'method_3_7' | 'fst7' | 'bfr'
                    micro_rest_seconds?: number | null
                    execution_mode?: 'standard' | 'tempo' | 'pause_reps' | 'deadstop' | 'ponto_zero' | 'lengthened_partial' | 'twenty_ones' | 'one_and_half' | 'negative' | 'forced_reps'
                    tempo?: string | null
                    timer_mode?: 'standard' | 'emom' | 'amrap' | 'tabata'
                    drop_count?: number | null
                    sub_sets?: number | null
                    activation_reps?: number | null
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
                    set_type: 'warmup' | 'working' | 'failure' | 'drop' | 'preparation' | 'backoff' | 'deload' | string
                    set_order?: number | null
                    weight_kg: number | null
                    reps_completed: number | null
                    rpe_actual: number | null
                    completed_at: string
                    time_completed: number | null
                    distance_completed: number | null
                    speed_actual: number | null
                    hiit_cycles_completed: number | null
                    group_round: number | null
                    set_method: string | null
                    micro_set_index: number | null
                    execution_mode: string | null
                    tempo_used: string | null
                    timer_mode: string | null
                }
                Insert: {
                    id?: string
                    workout_log_id: string
                    exercise_id: string
                    set_type?: 'warmup' | 'working' | 'failure' | 'drop' | 'preparation' | 'backoff' | 'deload' | string
                    set_order?: number | null
                    weight_kg?: number | null
                    reps_completed?: number | null
                    rpe_actual?: number | null
                    completed_at?: string
                    time_completed?: number | null
                    distance_completed?: number | null
                    speed_actual?: number | null
                    hiit_cycles_completed?: number | null
                    group_round?: number | null
                    set_method?: string | null
                    micro_set_index?: number | null
                    execution_mode?: string | null
                    tempo_used?: string | null
                    timer_mode?: string | null
                }
                Update: {
                    id?: string
                    workout_log_id?: string
                    exercise_id?: string
                    set_type?: 'warmup' | 'working' | 'failure' | 'drop' | 'preparation' | 'backoff' | 'deload' | string
                    set_order?: number | null
                    weight_kg?: number | null
                    reps_completed?: number | null
                    rpe_actual?: number | null
                    completed_at?: string
                    time_completed?: number | null
                    distance_completed?: number | null
                    speed_actual?: number | null
                    hiit_cycles_completed?: number | null
                    group_round?: number | null
                    set_method?: string | null
                    micro_set_index?: number | null
                    execution_mode?: string | null
                    tempo_used?: string | null
                    timer_mode?: string | null
                }
            },
            push_subscriptions: {
                Row: {
                    id: string
                    user_id: string
                    endpoint: string
                    p256dh: string
                    auth: string
                    user_agent: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    endpoint: string
                    p256dh: string
                    auth: string
                    user_agent?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    endpoint?: string
                    p256dh?: string
                    auth?: string
                    user_agent?: string | null
                    created_at?: string
                    updated_at?: string
                }
            },
            notification_logs: {
                Row: {
                    id: string
                    user_id: string
                    topic: string
                    title: string
                    body: string
                    action_url: string
                    read_at: string | null
                    clicked_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    topic: string
                    title: string
                    body: string
                    action_url?: string
                    read_at?: string | null
                    clicked_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    topic?: string
                    title?: string
                    body?: string
                    action_url?: string
                    read_at?: string | null
                    clicked_at?: string | null
                    created_at?: string
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

// ─── Exported Domain Types for 4 Orthogonal Layers ───────────────────
export type GroupType = 'superset' | 'triset' | 'giant_set' | 'paired_antagonist';
export type SetType = 'warmup' | 'working' | 'failure' | 'drop' | 'preparation' | 'backoff' | 'deload';
export type SetMethod = 'standard' | 'dropset' | 'rest_pause' | 'cluster' | 'myo_reps' | 'muscle_round' | 'method_3_7' | 'fst7' | 'bfr';
export type ExecutionMode = 'standard' | 'tempo' | 'pause_reps' | 'deadstop' | 'ponto_zero' | 'lengthened_partial' | 'twenty_ones' | 'one_and_half' | 'negative' | 'forced_reps';
export type TimerMode = 'standard' | 'emom' | 'amrap' | 'tabata';

export type ExerciseGroupRow = Database['public']['Tables']['exercise_groups']['Row'];
export type ExerciseGroupInsert = Database['public']['Tables']['exercise_groups']['Insert'];
export type ExerciseGroupUpdate = Database['public']['Tables']['exercise_groups']['Update'];

