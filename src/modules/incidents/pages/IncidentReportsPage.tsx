import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../../auth/context/AuthContext';
import { IncidentService } from '../services/IncidentService';
import { IncidentDetailModal } from '../components/IncidentDetailModal';
import { incidentTypeLabel } from '../types';
import type { RunIncident } from '../types';

interface IncidentReportsPageProps {
  onNavigate: (page: string) => void;
}

type Filter = 'all' | 'open';

const followUpDisplay =(incident: RunIncident): { label: string; modifier: string } => {
  if (!incident.follow_up_required) return { label: 'No follow-up', modifier: 'muted' };
  if (incident.follow_up_status === 'closed') return { label: 'Follow-up closed', modifier: 'success' };
  return { label: 'Follow-up open', modifier: 'warning' };
};

const formatRunDate = (value: string) => (value ? format(parseISO(value), 'd MMM yyyy') : '');

export const IncidentReportsPage: React.FC<IncidentReportsPageProps> = () => {
  const { permissions } = useAuth();
  const isAdmin = permissions.canManageMembers;
  const canView = permissions.canManageRuns || permissions.canManageMembers;

  const [incidents, setIncidents] = useState<RunIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadIncidents = useCallback(async () => {
    try {
      setError('');
      setIncidents(await IncidentService.getIncidents());
    } catch {
      setError('Could not load incident reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canView) return;
    loadIncidents();
  }, [canView, loadIncidents]);

  const visible = useMemo(
    () => (filter === 'open' ? incidents.filter(i => i.follow_up_status === 'open') : incidents),
    [incidents, filter]
  );

  const openCount = useMemo(() => incidents.filter(i => i.follow_up_status === 'open').length, [incidents]);

  const selected = incidents.find(i => i.id === selectedId) ?? null;

  if (!canView) {
    return (
      <div className="page-container incident-reports">
        <div className="page-header">
          <h1 className="page-title">Incident Reports</h1>
        </div>
        <div className="incident-reports__empty">Access denied.</div>
      </div>
    );
  }

  return (
    <div className="page-container incident-reports">
      <div className="page-header">
        <h1 className="page-title">Incident Reports</h1>
        <p className="page-description">
          {isAdmin
            ? 'All incident reports made by run leaders, newest first.'
            : 'Incident reports you have made, newest first. Reports cannot be changed once saved.'}
        </p>
      </div>

      <div className="filter-tabs">
        <button
          type="button"
          className={`filter-tab ${filter === 'all' ? 'filter-tab--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          type="button"
          className={`filter-tab ${filter === 'open' ? 'filter-tab--active' : ''}`}
          onClick={() => setFilter('open')}
        >
          Open follow-ups ({openCount})
        </button>
      </div>

      {error && <div className="incident-reports__error" role="alert">{error}</div>}

      {loading ? (
        <div className="incident-reports__empty">Loading incident reports...</div>
      ) : visible.length === 0 ? (
        <div className="incident-reports__empty">
          {filter === 'open' ? 'No open follow-ups.' : 'No incident reports yet.'}
        </div>
      ) : (
        <ul className="incident-reports__list">
          {visible.map(incident => {
            const { label, modifier } = followUpDisplay(incident);
            return (
              <li key={incident.id}>
                <button
                  type="button"
                  className="incident-reports__item"
                  onClick={() => setSelectedId(incident.id)}
                >
                  <span className="incident-reports__item-head">
                    <span className="incident-reports__run">{incident.run_title}</span>
                    <span className={`incident-reports__status incident-reports__status--${modifier}`}>
                      {label}
                    </span>
                  </span>
                  <span className="incident-reports__meta">
                    <span>{formatRunDate(incident.run_date)}</span>
                    <span>{incidentTypeLabel(incident.incident_type)}</span>
                    <span>Reported by {incident.reporter_name}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <IncidentDetailModal
          key={selected.id}
          incident={selected}
          isAdmin={isAdmin}
          onClose={() => setSelectedId(null)}
          onUpdated={loadIncidents}
        />
      )}
    </div>
  );
};

export default IncidentReportsPage;
