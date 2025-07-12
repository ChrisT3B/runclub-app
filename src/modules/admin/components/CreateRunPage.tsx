import React from 'react';
import { CreateScheduledRunForm } from '../../admin/components/CreateScheduledRunForm';

interface CreateRunPageProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreateRunPage: React.FC<CreateRunPageProps> = ({ onSuccess, onCancel }) => {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Create Scheduled Run</h1>
        <p className="page-description">Set up new running sessions for club members</p>
      </div>
      <CreateScheduledRunForm 
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </div>
  );
};