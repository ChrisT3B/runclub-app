import React, { useState, useCallback } from 'react';
import { Loader2, ShieldPlus, ShieldX } from 'lucide-react';
import { ScheduledRunsService } from '../../admin/services/scheduledRunsService';
import { BookingError } from '../../admin/services/bookingService';
import LirfAssignmentSuccessModal from './LirfassignmentSuccessModal';

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

  const getButtonText = (fullText: string, shortText: string, isLoading: boolean, loadingText: string): string => {
    if (isLoading) return loadingText;
    if (window.innerWidth <= 768) return shortText;
    return fullText;
  };

  const handleAssignSelfAsLIRF = useCallback(async () => {

    
    if (!user?.id) return;

    try {
      setIsLoading(true);
      
      let updateData: any = {};
      if (!run.assigned_lirf_1) {
        updateData.assigned_lirf_1 = user.id;
      } else if (!run.assigned_lirf_2) {
        updateData.assigned_lirf_2 = user.id;
      } else if (!run.assigned_lirf_3) {
        updateData.assigned_lirf_3 = user.id;
      } else {
        onAssignmentError(
          'LIRF Assignment Failed',
          'All LIRF positions are already filled for this run.'
        );
        return;
      }

      await ScheduledRunsService.updateScheduledRun(run.id, updateData);
      
 
      
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
    } else if (run.lirf_vacancies > 0) {
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
      
      {/* Render modal only if parent provides modal props */}
      {onCloseSuccessModal && (
        <LirfAssignmentSuccessModal
          isOpen={showSuccessModal}
          onClose={onCloseSuccessModal}
          run={run}
        />
      )}
    </div>
  );
};

export default LirfAssignmentManager;