import React from 'react';
import { X, ExternalLink, AlertTriangle } from 'lucide-react';
import {
  DRCABCDE_ITEMS,
  DEFIBFINDER_URL,
  DEFIBFINDER_LINK_LABEL,
  DEFIBFINDER_NOTE,
  EMERGENCY_FOOTER
} from '../constants/emergencyInfo';

interface EmergencyInfoButtonProps {
  onClick: () => void;
}

// Entry point shared by Lead Your Run and Manage Attendance.
// Full-width on its own row so it is clearly visible but not next to other actions.
export const EmergencyInfoButton: React.FC<EmergencyInfoButtonProps> = ({ onClick }) => (
  <div className="emergency-info-entry">
    <button
      type="button"
      className="action-btn action-btn--danger emergency-info-entry__btn"
      onClick={onClick}
    >
      <AlertTriangle size={18} />
      Emergency
    </button>
  </div>
);

interface EmergencyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyInfoModal: React.FC<EmergencyInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content emergency-info-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emergency-info-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="emergency-info-title" className="modal-title emergency-info-modal__title">
            <AlertTriangle size={20} />
            Emergency information
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="emergency-info-modal__body">
          <section className="emergency-info-modal__section">
            <h4 className="emergency-info-modal__heading">DRCABCDE</h4>
            <ol className="emergency-info-modal__list">
              {DRCABCDE_ITEMS.map((item, index) => (
                <li key={`${item.letter}-${index}`} className="emergency-info-modal__item">
                  <span className="emergency-info-modal__letter" aria-hidden="true">
                    {item.letter}
                  </span>
                  <p className="emergency-info-modal__item-text">
                    <strong>{item.letter}: {item.title}.</strong> {item.text}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section className="emergency-info-modal__section">
            <h4 className="emergency-info-modal__heading">Defibrillator</h4>
            <a
              href={DEFIBFINDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn action-btn--secondary emergency-info-modal__defib-link"
            >
              <ExternalLink size={16} />
              {DEFIBFINDER_LINK_LABEL}
            </a>
            <p className="emergency-info-modal__note">{DEFIBFINDER_NOTE}</p>
          </section>

          <p className="emergency-info-modal__footer">{EMERGENCY_FOOTER}</p>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary emergency-info-modal__close"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyInfoModal;
