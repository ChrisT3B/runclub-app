import { supabase } from './supabase';
import { C25kTrainingWeek, C25kProgrammeDates } from '../types/c25k';

export class C25kTrainingPlanService {

  private static PROGRAMME_START_DATE = '2026-04-27';
  private static GRADUATION_DATE = '2026-07-18';

  static async getTrainingPlan(): Promise<C25kTrainingWeek[]> {
    const { data, error } = await supabase
      .from('c25k_training_weeks')
      .select('*')
      .eq('programme_year', 2026)
      .order('week_number', { ascending: true });

    if (error) {
      console.error('Error fetching training plan:', error);
      throw error;
    }

    return data || [];
  }

  static async getWeek(weekNumber: number): Promise<C25kTrainingWeek | null> {
    const { data, error } = await supabase
      .from('c25k_training_weeks')
      .select('*')
      .eq('programme_year', 2026)
      .eq('week_number', weekNumber)
      .single();

    if (error) {
      console.error('Error fetching week:', error);
      return null;
    }

    return data;
  }

  static getProgrammeDates(): C25kProgrammeDates {
    const startDate = new Date(this.PROGRAMME_START_DATE);
    const graduationDate = new Date(this.GRADUATION_DATE);
    const today = new Date();

    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    let currentWeek = Math.floor(daysSinceStart / 7) + 1;

    if (today < startDate) {
      const daysUntilStart = Math.floor((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const weeksUntilStart = Math.ceil(daysUntilStart / 7);

      if (weeksUntilStart === 1) {
        currentWeek = -1;
      } else if (weeksUntilStart >= 2) {
        currentWeek = -2;
      }
    }

    if (currentWeek > 12) {
      currentWeek = 12;
    }

    const isProgrammeActive = today >= startDate && today <= graduationDate;
    const weeksRemaining = isProgrammeActive ? Math.max(0, 12 - currentWeek) : 0;

    return {
      start_date: this.PROGRAMME_START_DATE,
      end_date: this.GRADUATION_DATE,
      graduation_date: this.GRADUATION_DATE,
      current_week: currentWeek,
      is_programme_active: isProgrammeActive,
      weeks_remaining: weeksRemaining
    };
  }

  static getPhaseColor(phase: string): string {
    switch (phase) {
      case 'preparation': return '#fbbf24';
      case 'base': return '#f87171';
      case 'build': return '#a78bfa';
      case 'maintain': return '#4ade80';
      default: return '#6b7280';
    }
  }

  static getPhaseLabel(phase: string): string {
    switch (phase) {
      case 'preparation': return 'Preparation';
      case 'base': return 'Base';
      case 'build': return 'Build';
      case 'maintain': return 'Maintain';
      default: return phase;
    }
  }
}
