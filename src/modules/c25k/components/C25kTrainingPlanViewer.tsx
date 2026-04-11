import React, { useState, useEffect } from 'react';
import { C25kTrainingPlanService } from '../../../services/c25kTrainingPlanService';
import { C25kTrainingWeek, C25kProgrammeDates } from '../../../types/c25k';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

export const C25kTrainingPlanViewer: React.FC = () => {
  const [trainingPlan, setTrainingPlan] = useState<C25kTrainingWeek[]>([]);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [programmeDates, setProgrammeDates] = useState<C25kProgrammeDates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTrainingPlan();
  }, []);

  const loadTrainingPlan = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [plan, dates] = await Promise.all([
        C25kTrainingPlanService.getTrainingPlan(),
        Promise.resolve(C25kTrainingPlanService.getProgrammeDates())
      ]);

      setTrainingPlan(plan);
      setProgrammeDates(dates);

      const currentIndex = plan.findIndex(w => w.week_number === dates.current_week);
      if (currentIndex >= 0) {
        setCurrentWeekIndex(currentIndex);
      }
    } catch (err: any) {
      console.error('Error loading training plan:', err);
      setError('Failed to load training plan');
    } finally {
      setIsLoading(false);
    }
  };

  const goToPreviousWeek = () => {
    if (currentWeekIndex > 0) setCurrentWeekIndex(currentWeekIndex - 1);
  };

  const goToNextWeek = () => {
    if (currentWeekIndex < trainingPlan.length - 1) setCurrentWeekIndex(currentWeekIndex + 1);
  };

  const goToCurrentWeek = () => {
    if (!programmeDates) return;
    const idx = trainingPlan.findIndex(w => w.week_number === programmeDates.current_week);
    if (idx >= 0) setCurrentWeekIndex(idx);
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-content member-list-loading">
          <p>Loading training plan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="member-list-alert member-list-alert--error">{error}</div>
        </div>
      </div>
    );
  }

  if (trainingPlan.length === 0) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="empty-state">
            <div className="empty-state__icon">📋</div>
            <h3 className="empty-state__title">No Training Plan Available</h3>
            <p className="empty-state__message">The training plan hasn't been set up yet.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentWeek = trainingPlan[currentWeekIndex];
  const isCurrentWeek = programmeDates && currentWeek.week_number === programmeDates.current_week;
  const phaseColor = C25kTrainingPlanService.getPhaseColor(currentWeek.phase);
  const phaseLabel = C25kTrainingPlanService.getPhaseLabel(currentWeek.phase);

  const weekLabel = (num: number) => num < 0 ? `Prep ${num + 3}` : `${num}`;

  const renderSession = (day: string, location: string, workout: string | null, sc: string | null) => (
    <div className="card">
      <div className="session-card-header">
        <h3 className="session-day-title">{day}</h3>
        <p className="session-location">{location}</p>
      </div>
      <div className="card-content">
        {workout ? (
          <>
            <div className="session-content-section">
              <h4 className="session-section-label">Run:</h4>
              <p className="session-section-text">{workout}</p>
            </div>
            {sc && (
              <div className="session-content-section">
                <h4 className="session-section-label">S&C:</h4>
                <p className="session-section-text">{sc}</p>
              </div>
            )}
          </>
        ) : (
          <p className="session-rest-day">Rest day or flexible training</p>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {/* Programme Info Header */}
      {programmeDates && (
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="card-content">
            <div className="c25k-programme-info">
              <div>
                <h2 className="card-title" style={{ fontSize: 'var(--font-xl)' }}>
                  Couch to 5K Training Plan 2026
                </h2>
                <p className="card-description">
                  {programmeDates.is_programme_active ? (
                    <>Week {programmeDates.current_week} of 12 &bull; {programmeDates.weeks_remaining} weeks remaining</>
                  ) : new Date() < new Date(programmeDates.start_date) ? (
                    <>Programme starts {new Date(programmeDates.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                  ) : (
                    <>Programme completed! Graduation: {new Date(programmeDates.graduation_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                  )}
                </p>
              </div>

              <a
                href="https://docs.google.com/document/d/1c_s4VR3W9rHmFEvQLG93ZX0vN9HWRS7t/edit?usp=sharing&ouid=104466410053574049993&rtpof=true&sd=true"
                target="_blank"
                rel="noopener noreferrer"
                className="action-btn action-btn--secondary"
              >
                <ExternalLink size={16} />
                S&C Instructions
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Week Card with Navigation */}
      <div className="card">
        {/* Week Pills */}
        <div className="week-pills">
          {trainingPlan.map((week, idx) => (
            <button
              key={week.week_number}
              className={`week-pill${idx === currentWeekIndex ? ' week-pill--active' : ''}${programmeDates && week.week_number === programmeDates.current_week ? ' week-pill--current' : ''}`}
              onClick={() => setCurrentWeekIndex(idx)}
              title={`Week ${weekLabel(week.week_number)} - ${C25kTrainingPlanService.getPhaseLabel(week.phase)}`}
            >
              {weekLabel(week.week_number)}
            </button>
          ))}
        </div>

        {/* Navigation Header */}
        <div className="week-nav-header">
          <button
            onClick={goToPreviousWeek}
            disabled={currentWeekIndex === 0}
            className="action-btn action-btn--secondary"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="week-nav-center">
            <span className="status-badge" style={{
              background: phaseColor + '20',
              color: phaseColor,
              marginBottom: '4px'
            }}>
              {phaseLabel.toUpperCase()}
            </span>
            <h2 style={{
              margin: '4px 0',
              fontSize: 'var(--font-2xl)',
              fontWeight: 'var(--font-bold)'
            }}>
              Week {weekLabel(currentWeek.week_number)}
              {isCurrentWeek && (
                <span className="status-badge status-badge--active" style={{ marginLeft: 'var(--space-2)' }}>
                  CURRENT
                </span>
              )}
            </h2>
            {currentWeek.weekly_minutes && (
              <p className="card-description" style={{ margin: '4px 0 0 0' }}>
                {currentWeek.weekly_minutes} minutes total
              </p>
            )}
          </div>

          <button
            onClick={goToNextWeek}
            disabled={currentWeekIndex === trainingPlan.length - 1}
            className="action-btn action-btn--secondary"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Week Content */}
        <div className="card-content">
          {/* Phase Indicator Bar */}
          <div className="phase-indicator-bar" style={{ background: phaseColor }} />

          {/* Weekly Notes */}
          {currentWeek.notes && (
            <div className="member-list-alert member-list-alert--info" style={{ marginBottom: 'var(--space-6)' }}>
              {currentWeek.notes}
            </div>
          )}

          {/* Training Sessions Grid */}
          <div className="training-sessions-grid">
            {renderSession(currentWeek.run1_day, currentWeek.run1_location, currentWeek.run1_workout, currentWeek.run1_sc)}
            {renderSession(currentWeek.run2_day, currentWeek.run2_location, currentWeek.run2_workout, currentWeek.run2_sc)}
            {renderSession(currentWeek.run3_day, currentWeek.run3_location, currentWeek.run3_workout, currentWeek.run3_sc)}
          </div>

          {/* Quick Jump to Current Week */}
          {!isCurrentWeek && programmeDates && (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
              <button onClick={goToCurrentWeek} className="action-btn action-btn--primary">
                Jump to Week {weekLabel(programmeDates.current_week)} (Current)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
