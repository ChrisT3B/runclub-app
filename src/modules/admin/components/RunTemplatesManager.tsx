import React, { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { EnhancedDescriptionEditor } from './EnhancedDescriptionEditor';
import {
  RunTemplatesService,
  RunTemplate,
  RunTemplateInput,
  DAY_NAMES,
} from '../services/runTemplatesService';

// Monday-first order for the day picker and the list
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const dayRank = (day: number) => (day + 6) % 7;

const EMPTY_INPUT: RunTemplateInput = {
  run_title: '',
  day_of_week: 1,
  run_time: '',
  meeting_point: '',
  approximate_distance: '',
  max_participants: 20,
  description: '',
  lirfs_required: 1,
  is_c25k_run: false,
  is_dog_friendly: false,
  active: true,
};

const toInput = (t: RunTemplate): RunTemplateInput => ({
  run_title: t.run_title,
  day_of_week: t.day_of_week,
  run_time: t.run_time.slice(0, 5),
  meeting_point: t.meeting_point ?? '',
  approximate_distance: t.approximate_distance ?? '',
  max_participants: t.max_participants,
  description: t.description ?? '',
  lirfs_required: t.lirfs_required,
  is_c25k_run: t.is_c25k_run,
  is_dog_friendly: t.is_dog_friendly,
  active: t.active,
});

const sortTemplates = (list: RunTemplate[]) =>
  [...list].sort((a, b) =>
    dayRank(a.day_of_week) - dayRank(b.day_of_week) || a.run_time.localeCompare(b.run_time)
  );

interface RunTemplateFormProps {
  template: RunTemplate | null;   // null = creating a new template
  onSaved: (saved: RunTemplate) => void;
  onCancel: () => void;
}

const RunTemplateForm: React.FC<RunTemplateFormProps> = ({ template, onSaved, onCancel }) => {
  const { state } = useAuth();
  const [formData, setFormData] = useState<RunTemplateInput>(template ? toInput(template) : EMPTY_INPUT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number' || name === 'day_of_week' || name === 'lirfs_required') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      let saved: RunTemplate;
      if (template) {
        saved = await RunTemplatesService.updateTemplate(template.id, formData);
      } else {
        if (!state.user?.id) {
          setError('Authentication error. Please log in again.');
          return;
        }
        saved = await RunTemplatesService.createTemplate(formData, state.user.id);
      }
      onSaved(saved);
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card run-templates__form-card">
      <div className="card-header">
        <h3 className="card-title">{template ? 'Edit Template' : 'New Template'}</h3>
        <p className="card-description">
          Changes apply to runs generated from now on. Runs already on the calendar are not changed.
        </p>
      </div>

      <div className="card-content">
        {error && <div className="run-templates__error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="tpl_run_title">Run Title *</label>
            <input
              type="text"
              id="tpl_run_title"
              name="run_title"
              value={formData.run_title}
              onChange={handleInputChange}
              className="form-input"
              placeholder="e.g. Monday Club Run"
              required
            />
          </div>

          <div className="run-templates__row">
            <div className="form-group">
              <label className="form-label" htmlFor="tpl_day_of_week">Day *</label>
              <select
                id="tpl_day_of_week"
                name="day_of_week"
                value={formData.day_of_week}
                onChange={handleInputChange}
                className="form-input"
              >
                {DAY_ORDER.map(day => (
                  <option key={day} value={day}>{DAY_NAMES[day]}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tpl_run_time">Time *</label>
              <input
                type="time"
                id="tpl_run_time"
                name="run_time"
                value={formData.run_time}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tpl_meeting_point">Meeting Point *</label>
            <input
              type="text"
              id="tpl_meeting_point"
              name="meeting_point"
              value={formData.meeting_point}
              onChange={handleInputChange}
              className="form-input"
              placeholder="e.g. Village Hall Car Park"
              required
            />
          </div>

          <div className="run-templates__row">
            <div className="form-group">
              <label className="form-label" htmlFor="tpl_approximate_distance">Distance</label>
              <input
                type="text"
                id="tpl_approximate_distance"
                name="approximate_distance"
                value={formData.approximate_distance}
                onChange={handleInputChange}
                className="form-input"
                placeholder="e.g. 5K, 3 miles"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tpl_max_participants">Max Participants</label>
              <input
                type="number"
                id="tpl_max_participants"
                name="max_participants"
                value={formData.max_participants}
                onChange={handleInputChange}
                className="form-input"
                min="1"
                max="50"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tpl_description">Description</label>
            <EnhancedDescriptionEditor
              id="tpl_description"
              name="description"
              value={formData.description}
              onChange={value => setFormData(prev => ({ ...prev, description: value }))}
              placeholder="Run description, route info, what to bring..."
              rows={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tpl_lirfs_required">LIRFs Required</label>
            <select
              id="tpl_lirfs_required"
              name="lirfs_required"
              value={formData.lirfs_required}
              onChange={handleInputChange}
              className="form-input"
            >
              <option value={1}>1 (Lead only)</option>
              <option value={2}>2 (Lead + 1 Support)</option>
              <option value={3}>3 (Lead + 2 Support)</option>
            </select>
          </div>

          <div className="form-group">
            <label
              className={`run-templates__checkbox ${formData.is_dog_friendly ? 'run-templates__checkbox--disabled' : ''}`}
            >
              <input
                type="checkbox"
                name="is_c25k_run"
                checked={formData.is_c25k_run}
                onChange={handleInputChange}
                disabled={formData.is_dog_friendly}
              />
              <span className="form-label run-templates__checkbox-label">This is a Couch to 5k Run</span>
            </label>
          </div>

          <div className="form-group">
            <label
              className={`run-templates__checkbox ${formData.is_c25k_run ? 'run-templates__checkbox--disabled' : ''}`}
            >
              <input
                type="checkbox"
                name="is_dog_friendly"
                checked={formData.is_dog_friendly}
                onChange={handleInputChange}
                disabled={formData.is_c25k_run}
              />
              <span className="form-label run-templates__checkbox-label">Dog-friendly run</span>
            </label>
            <p className="run-templates__hint">
              {formData.is_c25k_run
                ? 'Dog-friendly runs cannot also be C25K runs.'
                : 'Only designate runs that have been assessed against the Standing Dog-Friendly Route Register.'}
            </p>
          </div>

          <div className="form-group">
            <label className="run-templates__checkbox">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleInputChange}
              />
              <span className="form-label run-templates__checkbox-label">Active</span>
            </label>
            <p className="run-templates__hint">
              Active templates generate runs for the next 4 weeks. Inactive templates generate nothing new;
              runs already generated stay on the calendar.
            </p>
          </div>

          <div className="run-templates__form-actions">
            <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : template ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface RunTemplatesManagerProps {
  onNavigate?: (page: string) => void;
}

export const RunTemplatesManager: React.FC<RunTemplatesManagerProps> = () => {
  const { permissions } = useAuth();
  const [templates, setTemplates] = useState<RunTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // undefined = form closed, null = creating, RunTemplate = editing
  const [editing, setEditing] = useState<RunTemplate | null | undefined>(undefined);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!permissions.canManageMembers) return;
    (async () => {
      try {
        setTemplates(sortTemplates(await RunTemplatesService.getTemplates()));
      } catch (err: any) {
        setError(err.message || 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    })();
  }, [permissions.canManageMembers]);

  if (!permissions.canManageMembers) {
    return (
      <div className="page-container run-templates">
        <div className="page-header">
          <h1 className="page-title">Run Templates</h1>
        </div>
        <div className="run-templates__empty">Access denied. Admin access required.</div>
      </div>
    );
  }

  const handleSaved = (saved: RunTemplate) => {
    setTemplates(prev => sortTemplates([...prev.filter(t => t.id !== saved.id), saved]));
    setEditing(undefined);
  };

  const handleToggleActive = async (template: RunTemplate) => {
    setTogglingId(template.id);
    setError('');
    try {
      const saved = await RunTemplatesService.setActive(template.id, !template.active);
      setTemplates(prev => sortTemplates([...prev.filter(t => t.id !== saved.id), saved]));
    } catch (err: any) {
      setError(err.message || 'Failed to update template');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="page-container run-templates">
      <div className="page-header run-templates__header">
        <div>
          <h1 className="page-title">Run Templates</h1>
          <p className="page-description">
            Weekly fixtures that automatically put runs on the calendar 4 weeks ahead.
            Cancelling or editing a generated run doesn't affect any other week.
          </p>
        </div>
        {editing === undefined && (
          <button className="btn btn-primary run-templates__new-btn" onClick={() => setEditing(null)}>
            <Plus size={16} />
            New Template
          </button>
        )}
      </div>

      {error && <div className="run-templates__error">{error}</div>}

      {editing !== undefined && (
        <RunTemplateForm
          key={editing?.id ?? 'new'}
          template={editing}
          onSaved={handleSaved}
          onCancel={() => setEditing(undefined)}
        />
      )}

      {loading ? (
        <div className="run-templates__loading">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="run-templates__empty">No run templates yet.</div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="member-table">
              <thead className="member-table__header">
                <tr>
                  <th className="member-table__header-cell">Day</th>
                  <th className="member-table__header-cell">Time</th>
                  <th className="member-table__header-cell">Run</th>
                  <th className="member-table__header-cell">Meeting Point</th>
                  <th className="member-table__header-cell">LIRFs</th>
                  <th className="member-table__header-cell">Status</th>
                  <th className="member-table__header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr
                    key={t.id}
                    className={`member-table__row ${t.active ? '' : 'run-templates__row--inactive'}`}
                  >
                    <td className="member-table__cell">{DAY_NAMES[t.day_of_week]}</td>
                    <td className="member-table__cell">{t.run_time.slice(0, 5)}</td>
                    <td className="member-table__cell">
                      {t.run_title}
                      {t.is_c25k_run && <span className="run-templates__tag">C25K</span>}
                      {t.is_dog_friendly && <span className="run-templates__tag">Dogs</span>}
                    </td>
                    <td className="member-table__cell">{t.meeting_point ?? '—'}</td>
                    <td className="member-table__cell">{t.lirfs_required}</td>
                    <td className="member-table__cell">
                      <span className={`status-badge ${t.active ? 'status-badge--active' : 'status-badge--inactive'}`}>
                        {t.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="member-table__cell">
                      <div className="run-templates__actions">
                        <button
                          className="btn btn-secondary"
                          onClick={() => setEditing(t)}
                          disabled={editing !== undefined}
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleToggleActive(t)}
                          disabled={togglingId === t.id || editing !== undefined}
                        >
                          {togglingId === t.id ? 'Saving...' : t.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RunTemplatesManager;
