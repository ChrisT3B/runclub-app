import React, { useState, useCallback } from 'react';
import { Loader2, ShieldPlus, ShieldX } from 'lucide-react';
import { ScheduledRunsService, LirfRole } from '../../admin/services/scheduledRunsService';
import { BookingError } from '../../admin/services/bookingService';
import LirfAssignmentSuccessModal from './LirfassignmentSuccessModal';
import LirfRoleChoiceModal from './LirfRoleChoiceModal';

interface LirfAssignmentManagerProps {
  run: any; // ScheduledRun type
  user: any; // User type  
  onAssignmentSuccess: () => void;
  onAssignmentError: (title: string, message: string) => void;
  onUnassignmentConfirm: (runId: string, runTitle: string) => void;
  // NEW: Modal control props from parent
  showSuccessModal?: boolean;
  onCloseSuccessModal?: () => void;
  onShowSuccessModal?: (run: any) => void;
}

const LirfAssignmentManager: React.FC<LirfAssignmentManagerProps> = ({
  run,
  user,
  onAssignmentSuccess,
  onAssignmentError,
  onUnassignmentConfirm,
  showSuccessModal = false,
  onCloseSuccessModal,
  onShowSuccessModal
}) => {

  
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleChoice, setShowRoleChoice] = useState(false);
  const [assignedRole, setAssignedRole] = useState<LirfRole | null>(null);

  // Slot 1 is Lead, slots 2 and 3 are Support. Slots above lirfs_required are
  // never offered.
  const leadVacant: boolean = run.lead_lirf_vacant ?? !run.assigned_lirf_1;
  const supportVacancies: number = run.support_vacancies ?? 0;

  const getButtonText = (fullText: string, shortText: string, isLoading: boolean, loadingText: string): string => {
    if (isLoading) return loadingText;
    if (window.innerWidth <= 768) return shortText;
    return fullText;
  };

  /**
   * Write the chosen role to its slot. The run prop is client state that may be
   * minutes old, so the run is re-read immediately before the write and the
   * chosen slot re-checked. This is not atomic — a fully conditional write is a
   * separate follow-up.
   */
  const assignRole = useCallback(async (role: LirfRole) => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      const latest = await ScheduledRunsService.getScheduledRun(run.id);
      const latestRequired = latest.lirfs_required ?? 1;

      let updateData: any = {};

      if (role === 'lead') {
        if (latest.assigned_lirf_1) {
          onAssignmentError(
            'Position already taken',
            'The Lead LIRF position on this run has just been filled by someone else. Please refresh and choose another role.'
          );
          return;
        }
        updateData.assigned_lirf_1 = user.id;
      } else {
        if (!latest.assigned_lirf_2 && latestRequired >= 2) {
          updateData.assigned_lirf_2 = user.id;
        } else if (!latest.assigned_lirf_3 && latestRequired >= 3) {
          updateData.assigned_lirf_3 = user.id;
        } else {
          onAssignmentError(
            'Position already taken',
            'The Support LIRF positions on this run have just been filled. Please refresh and try again.'
          );
          return;
        }
      }

      await ScheduledRunsService.updateScheduledRun(run.id, updateData);

      setAssignedRole(role);

      // Show modal via parent
      if (onShowSuccessModal) {
        onShowSuccessModal(run);
      }

      // Call success callback
      onAssignmentSuccess();

    } catch (err: any) {
      console.error('LIRF assignment error:', err);

      if (err instanceof BookingError) {
        onAssignmentError(err.title || 'LIRF Assignment Failed', err.message);
      } else {
        onAssignmentError('LIRF Assignment Failed', err.message || 'Failed to assign LIRF position. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, run, onAssignmentSuccess, onAssignmentError, onShowSuccessModal]);

  const handleAssignSelfAsLIRF = useCallback(() => {
    if (!user?.id) return;

    if (leadVacant) {
      // Lead is open — always ask, even when it is the only option
      setShowRoleChoice(true);
      return;
    }

    if (supportVacancies > 0) {
      // Support only — keep today's one-click behaviour
      void assignRole('support');
      return;
    }

    onAssignmentError(
      'LIRF Assignment Failed',
      'All LIRF positions are already filled for this run.'
    );
  }, [user?.id, leadVacant, supportVacancies, assignRole, onAssignmentError]);

  /**
   * The parent reloads on success and swaps the whole list for a spinner, which
   * unmounts this component and loses assignedRole. Fall back to the role on
   * the refreshed run so the success modal keeps the right wording.
   */
  const successRole: LirfRole | undefined = assignedRole ?? run.user_lirf_role ?? undefined;

  const handleRoleChosen = useCallback((role: LirfRole) => {
    setShowRoleChoice(false);
    void assignRole(role);
  }, [assignRole]);

  const handleUnassignSelfAsLIRF = useCallback(() => {

    onUnassignmentConfirm(run.id, run.run_title);
  }, [run.id, run.run_title, onUnassignmentConfirm]);

  const renderLirfButton = () => {
    if (run.user_is_assigned_lirf) {
      return (
        <button
          onClick={handleUnassignSelfAsLIRF}
          disabled={isLoading}
          className="action-btn action-btn--danger"
        >
          <ShieldX size={16} />
          {getButtonText(' Unassign LIRF', ' Unassign', isLoading, 'Unassigning...')}
        </button>
      );
    } else if (leadVacant || supportVacancies > 0) {
      return (
        <button
          onClick={handleAssignSelfAsLIRF}
          disabled={isLoading}
          className="action-btn action-btn--secondary"
        >
          {isLoading && <Loader2 size={14} className="animate-spin" style={{ marginRight: '6px' }} />}
          {!isLoading && <ShieldPlus size={16} />}
          {getButtonText(' Assign Me as LIRF', ' Assign Me', isLoading, 'Assigning...')}
        </button>
      );
    } else {
      return (
        <div className="action-status action-status--assigned">
          LIRFs fully assigned
        </div>
      );
    }
  };

  return (
    <div className="lirf-assignment-manager">
      {renderLirfButton()}

      <LirfRoleChoiceModal
        isOpen={showRoleChoice}
        leadAvailable={leadVacant}
        supportAvailable={supportVacancies > 0}
        onChoose={handleRoleChosen}
        onCancel={() => setShowRoleChoice(false)}
      />

      {/* Render modal only if parent provides modal props */}
      {onCloseSuccessModal && (
        <LirfAssignmentSuccessModal
          isOpen={showSuccessModal}
          onClose={onCloseSuccessModal}
          run={run}
          role={successRole}
        />
      )}
    </div>
  );
};

export default LirfAssignmentManager;