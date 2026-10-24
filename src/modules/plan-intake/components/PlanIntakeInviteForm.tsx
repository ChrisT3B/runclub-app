import React, { useMemo, useState } from 'react';
import { Search, Send, X } from 'lucide-react';
import type { PlanIntakeMember } from '../types';

interface PlanIntakeInviteFormProps {
  members: PlanIntakeMember[];
  openEmails: Set<string>;
  onInvite: (member: PlanIntakeMember) => Promise<boolean>;
}

const MAX_RESULTS = 8;

export const PlanIntakeInviteForm: React.FC<PlanIntakeInviteFormProps> = ({ members, openEmails, onInvite }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PlanIntakeMember | null>(null);
  const [sending, setSending] = useState(false);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    return members
      .filter(m => m.full_name?.toLowerCase().includes(term) || m.email.includes(term))
      .slice(0, MAX_RESULTS);
  }, [members, query]);

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    try {
      if (await onInvite(selected)) {
        setSelected(null);
        setQuery('');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card plan-intake-admin__card">
      <div className="card-header">
        <h2 className="card-title">Invite a member</h2>
        <p className="card-description">
          The member gets an email with a link to the form. They fill it in while logged in to the app.
        </p>
      </div>
      <div className="card-content">
        {selected ? (
          <div className="plan-intake-admin__selected">
            <div className="plan-intake-admin__selected-text">
              <span className="plan-intake-admin__name">{selected.full_name}</span>
              <span className="plan-intake-admin__email">{selected.email}</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary plan-intake-admin__icon-btn"
              onClick={() => setSelected(null)}
              disabled={sending}
              aria-label="Choose a different member"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label" htmlFor="plan-intake-member-search">Find a member</label>
            <div className="plan-intake-admin__search">
              <Search size={18} className="plan-intake-admin__search-icon" aria-hidden="true" />
              <input
                id="plan-intake-member-search"
                type="search"
                className="form-input plan-intake__input plan-intake-admin__search-input"
                placeholder="Type a name or email"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoComplete="off"
              />
            </div>

            {query.trim().length >= 2 && (
              <ul className="plan-intake-admin__results">
                {results.length === 0 && (
                  <li className="plan-intake-admin__no-results">No members match.</li>
                )}
                {results.map(member => {
                  const alreadyOpen = openEmails.has(member.email);
                  return (
                    <li key={member.id}>
                      <button
                        type="button"
                        className="plan-intake-admin__result"
                        onClick={() => setSelected(member)}
                        disabled={alreadyOpen}
                      >
                        <span className="plan-intake-admin__name">{member.full_name}</span>
                        <span className="plan-intake-admin__email">{member.email}</span>
                        {alreadyOpen && <span className="plan-intake-admin__result-note">Already invited</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary plan-intake-admin__send"
          onClick={handleSend}
          disabled={!selected || sending}
        >
          <Send size={16} />
          {sending ? 'Sending...' : 'Send Invitation'}
        </button>
      </div>
    </div>
  );
};
