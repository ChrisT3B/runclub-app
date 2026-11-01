import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, CheckCircle } from 'lucide-react';
import { IncidentService } from '../services/IncidentService';
import {
  ACTIONS_TAKEN,
  ACTION_NONE,
  EMPTY_DRAFT,
  INCIDENT_TYPES,
  INVOLVEMENTS,
  involvementLabel
} from '../types';
import type { IncidentDraft, Involvement, RunPerson } from '../types';

interface IncidentReportModalProps {
  isOpen: boolean;
  runId: string;
  runTitle: string;
  onClose: () => void;
}

type View = 'form' | 'saved' | 'confirm-close';

const OTHER_PERSON = '__other__';

const isDraftEmpty = (draft: IncidentDraft) =>
  draft.incident_type === '' &&
  draft.description.trim() === '' &&
  draft.people.length === 0 &&
  draft.actions_taken.length === 0 &&
  draft.action_notes.trim() === '' &&
  draft.follow_up_required === null;

export const IncidentReportModal: React.FC<IncidentReportModalProps> = ({
  isOpen,
  runId,
  runTitle,
  onClose
}) => {
  // Mounted per run (keyed by run id), so the saved draft is the starting state
  const [draft, setDraft] = useState<IncidentDraft>(() => IncidentService.loadDraft(runId) ?? EMPTY_DRAFT);
  const [view, setView] = useState<View>('form');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedCount, setSavedCount] = useState(0);

  const [runPeople, setRunPeople] = useState<RunPerson[]>([]);
  const [peopleError, setPeopleError] = useState('');
  const [personPick, setPersonPick] = useState('');
  const [personName, setPersonName] = useState('');
  const [personRole, setPersonRole] = useState<Involvement | ''>('');
  const [personError, setPersonError] = useState('');

  // Load the people on this run when the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setPeopleError('');

    IncidentService.getRunPeople(runId)
      .then(setRunPeople)
      .catch(() => {
        setRunPeople([]);
        setPeopleError('Could not load the runners on this run. You can still type a name.');
      });
  }, [isOpen, runId]);

  // Keep the draft on the device until it is saved or discarded
  useEffect(() => {
    if (!isOpen || view === 'saved') return;
    if (isDraftEmpty(draft)) {
      IncidentService.clearDraft(runId);
    } else {
      IncidentService.saveDraft(runId, draft);
    }
  }, [draft, isOpen, runId, view]);

  if (!isOpen) return null;

  const update = (changes: Partial<IncidentDraft>) => setDraft(prev => ({ ...prev, ...changes }));

  const toggleAction = (value: string) => {
    setDraft(prev => {
      const selected = prev.actions_taken.includes(value);
      if (selected) {
        return { ...prev, actions_taken: prev.actions_taken.filter(a => a !== value) };
      }
      // "None" cannot be combined with any other action
      if (value === ACTION_NONE) {
        return { ...prev, actions_taken: [ACTION_NONE] };
      }
      return { ...prev, actions_taken: [...prev.actions_taken.filter(a => a !== ACTION_NONE), value] };
    });
  };

  const resetPersonPicker = () => {
    setPersonPick('');
    setPersonName('');
    setPersonRole('');
    setPersonError('');
  };

  const addPerson = () => {
    const isOther = personPick === OTHER_PERSON;
    const member = runPeople.find(p => p.member_id === personPick);
    const name = isOther ? personName.trim() : member?.full_name ?? '';

    if (!name) {
      setPersonError(isOther ? 'Type a name.' : 'Choose a person.');
      return;
    }
    if (!personRole) {
      setPersonError('Choose their role.');
      return;
    }

    update({
      people: [
        ...draft.people,
        { member_id: isOther ? null : member?.member_id ?? null, display_name: name, involvement: personRole }
      ]
    });
    resetPersonPicker();
  };

  const removePerson = (index: number) => {
    update({ people: draft.people.filter((_, i) => i !== index) });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!draft.incident_type) next.incident_type = 'Choose the type of incident.';
    if (!draft.description.trim()) next.description = 'Describe what happened.';
    if (draft.follow_up_required === null) next.follow_up_required = 'Choose yes or no.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    setSaveError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const incidentId = await IncidentService.createIncident(runId, draft);
      IncidentService.clearDraft(runId);
      setSavedCount(count => count + 1);
      setView('saved');
      // Fire and forget: a failed email never affects the saved report
      void IncidentService.notifyAdmins(incidentId);
    } catch {
      setSaveError(
        'The report could not be saved. What you typed has been kept on this device. Check your signal and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const startAnother = () => {
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setSaveError('');
    resetPersonPicker();
    setView('form');
  };

  const requestClose = () => {
    if (view === 'form' && !isDraftEmpty(draft)) {
      setView('confirm-close');
      return;
    }
    onClose();
  };

  const discardAndClose = () => {
    IncidentService.clearDraft(runId);
    setDraft(EMPTY_DRAFT);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content incident-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-form-title"
      >
        <div className="modal-header">
          <div>
            <h3 id="incident-form-title" className="modal-title">Report an incident</h3>
            <p className="incident-form__run">{runTitle}</p>
          </div>
          <button type="button" onClick={requestClose} className="modal-close-btn" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="incident-form__body">
          {view === 'saved' && (
            <div className="incident-form__saved">
              <CheckCircle size={32} className="incident-form__saved-icon" />
              <p className="incident-form__saved-title">
                {savedCount === 1 ? 'Incident report saved.' : `${savedCount} incident reports saved.`}
              </p>
              <p className="incident-form__hint">
                Admins will be emailed that a report was made. You can see your reports under Incident Reports.
              </p>
              <div className="incident-form__actions">
                <button type="button" className="btn btn-secondary" onClick={startAnother}>
                  Report another incident
                </button>
                <button type="button" className="btn btn-primary" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          )}

          {view === 'confirm-close' && (
            <div className="incident-form__confirm">
              <p className="incident-form__confirm-text">
                This report has not been saved. Keep it on this device to finish later, or discard it?
              </p>
              <div className="incident-form__actions incident-form__actions--stacked">
                <button type="button" className="btn btn-primary" onClick={() => setView('form')}>
                  Back to the report
                </button>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Keep draft and close
                </button>
                <button type="button" className="action-btn action-btn--danger" onClick={discardAndClose}>
                  Discard report
                </button>
              </div>
            </div>
          )}

          {view === 'form' && (
            <>
              {savedCount > 0 && (
                <p className="incident-form__saved-note">
                  {savedCount === 1 ? '1 report saved for this run.' : `${savedCount} reports saved for this run.`}
                </p>
              )}

              {/* Type */}
              <fieldset className="incident-form__fieldset">
                <legend className="form-label">Type of incident (required)</legend>
                <div className="incident-form__options">
                  {INCIDENT_TYPES.map(type => (
                    <label
                      key={type.value}
                      className={`incident-form__option ${draft.incident_type === type.value ? 'incident-form__option--selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="incident_type"
                        value={type.value}
                        checked={draft.incident_type === type.value}
                        onChange={() => update({ incident_type: type.value })}
                      />
                      {type.label}
                    </label>
                  ))}
                </div>
                {errors.incident_type && <p className="form-error">{errors.incident_type}</p>}
              </fieldset>

              {/* Description */}
              <div className="form-group">
                <label htmlFor="incident-description" className="form-label">
                  What happened? (required)
                </label>
                <p className="incident-form__hint">Facts only: what happened, where and when.</p>
                <textarea
                  id="incident-description"
                  className="form-input incident-form__textarea"
                  rows={4}
                  value={draft.description}
                  onChange={e => update({ description: e.target.value })}
                />
                {errors.description && <p className="form-error">{errors.description}</p>}
              </div>

              {/* People */}
              <fieldset className="incident-form__fieldset">
                <legend className="form-label">People involved</legend>

                {draft.people.length > 0 && (
                  <ul className="incident-form__people">
                    {draft.people.map((person, index) => (
                      <li key={`${person.display_name}-${index}`} className="incident-form__person">
                        <span className="incident-form__person-name">{person.display_name}</span>
                        <span className="incident-form__person-role">{involvementLabel(person.involvement)}</span>
                        <button
                          type="button"
                          className="incident-form__person-remove"
                          onClick={() => removePerson(index)}
                          aria-label={`Remove ${person.display_name}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {peopleError && <p className="incident-form__hint">{peopleError}</p>}

                <div className="incident-form__person-picker">
                  <select
                    className="form-input"
                    value={personPick}
                    onChange={e => {
                      setPersonPick(e.target.value);
                      setPersonError('');
                    }}
                    aria-label="Person"
                  >
                    <option value="">Choose a person...</option>
                    {runPeople.map(person => (
                      <option key={person.member_id} value={person.member_id}>
                        {person.full_name}
                      </option>
                    ))}
                    <option value={OTHER_PERSON}>Someone else (type a name)</option>
                  </select>

                  {personPick === OTHER_PERSON && (
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Name"
                      value={personName}
                      onChange={e => setPersonName(e.target.value)}
                      aria-label="Name"
                    />
                  )}

                  <select
                    className="form-input"
                    value={personRole}
                    onChange={e => {
                      setPersonRole(e.target.value as Involvement | '');
                      setPersonError('');
                    }}
                    aria-label="Role"
                  >
                    <option value="">Their role...</option>
                    {INVOLVEMENTS.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>

                  <button type="button" className="btn btn-secondary incident-form__add-person" onClick={addPerson}>
                    <Plus size={16} />
                    Add person
                  </button>
                  {personError && <p className="form-error">{personError}</p>}
                </div>
              </fieldset>

              {/* Actions */}
              <fieldset className="incident-form__fieldset">
                <legend className="form-label">Action taken</legend>
                <div className="incident-form__options">
                  {ACTIONS_TAKEN.map(action => (
                    <label
                      key={action.value}
                      className={`incident-form__option ${draft.actions_taken.includes(action.value) ? 'incident-form__option--selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={draft.actions_taken.includes(action.value)}
                        onChange={() => toggleAction(action.value)}
                      />
                      {action.label}
                    </label>
                  ))}
                </div>
                <label htmlFor="incident-action-notes" className="form-label incident-form__sub-label">
                  Notes on action taken (optional)
                </label>
                <textarea
                  id="incident-action-notes"
                  className="form-input incident-form__textarea"
                  rows={2}
                  value={draft.action_notes}
                  onChange={e => update({ action_notes: e.target.value })}
                />
              </fieldset>

              {/* Follow-up */}
              <fieldset className="incident-form__fieldset">
                <legend className="form-label">Follow-up needed? (required)</legend>
                <div className="incident-form__options incident-form__options--pair">
                  <label
                    className={`incident-form__option ${draft.follow_up_required === true ? 'incident-form__option--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="follow_up_required"
                      checked={draft.follow_up_required === true}
                      onChange={() => update({ follow_up_required: true })}
                    />
                    Yes
                  </label>
                  <label
                    className={`incident-form__option ${draft.follow_up_required === false ? 'incident-form__option--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="follow_up_required"
                      checked={draft.follow_up_required === false}
                      onChange={() => update({ follow_up_required: false })}
                    />
                    No
                  </label>
                </div>
                {errors.follow_up_required && <p className="form-error">{errors.follow_up_required}</p>}
              </fieldset>

              {saveError && <div className="incident-form__error" role="alert">{saveError}</div>}

              <div className="incident-form__actions">
                <button type="button" className="btn btn-secondary" onClick={requestClose} disabled={saving}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : saveError ? 'Try again' : 'Save report'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentReportModal;
