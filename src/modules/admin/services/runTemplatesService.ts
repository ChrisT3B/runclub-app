import { supabase } from '../../../services/supabase';

/**
 * A recurring run template holds the stable weekly pattern of a fixture
 * (e.g. "Monday Club Run, Mondays at 18:30"). Bookable instances are
 * generated from it into scheduled_runs by the database function
 * generate_recurring_run_instances(); the frontend only manages templates.
 *
 * RLS on recurring_run_templates is admin-only (SELECT/INSERT/UPDATE).
 * There is deliberately no delete.
 */
export interface RunTemplate {
  id: string;
  run_title: string;
  day_of_week: number;   // 0 (Sunday) to 6 (Saturday), Postgres DOW convention
  run_time: string;      // HH:MM:SS
  meeting_point: string | null;
  approximate_distance: string | null;
  max_participants: number;
  description: string | null;
  lirfs_required: number;
  is_c25k_run: boolean;
  is_dog_friendly: boolean;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RunTemplateInput {
  run_title: string;
  day_of_week: number;
  run_time: string;
  meeting_point: string;
  approximate_distance: string;
  max_participants: number;
  description: string;
  lirfs_required: number;
  is_c25k_run: boolean;
  is_dog_friendly: boolean;
  active: boolean;
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toRow = (input: RunTemplateInput) => ({
  run_title: input.run_title.trim(),
  day_of_week: input.day_of_week,
  run_time: input.run_time,
  meeting_point: input.meeting_point.trim() || null,
  approximate_distance: input.approximate_distance.trim() || null,
  max_participants: input.max_participants,
  description: input.description.trim() || null,
  lirfs_required: input.lirfs_required,
  is_c25k_run: input.is_c25k_run,
  is_dog_friendly: input.is_dog_friendly,
  active: input.active,
});

export class RunTemplatesService {
  static async getTemplates(): Promise<RunTemplate[]> {
    const { data, error } = await supabase
      .from('recurring_run_templates')
      .select('*')
      .order('day_of_week', { ascending: true })
      .order('run_time', { ascending: true });

    if (error) {
      console.error('RunTemplatesService.getTemplates error:', error);
      throw new Error(error.message);
    }
    return (data as RunTemplate[] | null) ?? [];
  }

  /**
   * Returns null when the template does not exist or is not visible to the
   * current user (non-admins see nothing under the admin-only RLS).
   */
  static async getTemplate(id: string): Promise<RunTemplate | null> {
    const { data, error } = await supabase
      .from('recurring_run_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('RunTemplatesService.getTemplate error:', error);
      throw new Error(error.message);
    }
    return (data as RunTemplate | null) ?? null;
  }

  static async createTemplate(input: RunTemplateInput, createdBy: string): Promise<RunTemplate> {
    const { data, error } = await supabase
      .from('recurring_run_templates')
      .insert({ ...toRow(input), created_by: createdBy })
      .select()
      .single();

    if (error) {
      console.error('RunTemplatesService.createTemplate error:', error);
      throw new Error(error.message);
    }
    return data as RunTemplate;
  }

  static async updateTemplate(id: string, input: RunTemplateInput): Promise<RunTemplate> {
    const { data, error } = await supabase
      .from('recurring_run_templates')
      .update({ ...toRow(input), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('RunTemplatesService.updateTemplate error:', error);
      throw new Error(error.message);
    }
    return data as RunTemplate;
  }

  static async setActive(id: string, active: boolean): Promise<RunTemplate> {
    const { data, error } = await supabase
      .from('recurring_run_templates')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('RunTemplatesService.setActive error:', error);
      throw new Error(error.message);
    }
    return data as RunTemplate;
  }
}
