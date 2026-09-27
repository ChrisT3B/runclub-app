import React from 'react';
import { X, Shield, ShieldPlus } from 'lucide-react';
import { LirfRole } from '../../admin/services/scheduledRunsService';

interface LirfRoleChoiceModalProps {
  isOpen: boolean;
  leadAvailable: boolean;
  supportAvailable: boolean;
  onChoose: (role: LirfRole) => void;
  onCancel: () => void;
}

export const LirfRoleChoiceModal: React.FC<LirfRoleChoiceModalProps> = ({
  isOpen,
  leadAvailable,
  supportAvailable,
  onChoose,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">How are you helping on this run?</h3>
          <button
            onClick={onCancel}
            className="modal-close-btn"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="lirf-role-choice__body">
          {!supportAvailable && (
            <p className="lirf-role-choice__note">
              Only the Lead position is open on this run.
            </p>
          )}

          <div className="lirf-role-choice__options">
            {leadAvailable && (
              <button
                onClick={() => onChoose('lead')}
                className="lirf-role-choice__option"
              >
                <Shield size={20} />
                <span className="lirf-role-choice__option-text">
                  <span className="lirf-role-choice__option-label">Lead LIRF</span>
                  <span className="lirf-role-choice__option-subtext">
                    You lead the run and are responsible on the day.
                  </span>
                </span>
              </button>
            )}

            {supportAvailable && (
              <button
                onClick={() => onChoose('support')}
                className="lirf-role-choice__option"
              >
                <ShieldPlus size={20} />
                <span className="lirf-role-choice__option-text">
                  <span className="lirf-role-choice__option-label">Support LIRF</span>
                  <span className="lirf-role-choice__option-subtext">
                    You support the Lead LIRF.
                  </span>
                </span>
              </button>
            )}
          </div>

          <button onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LirfRoleChoiceModal;
