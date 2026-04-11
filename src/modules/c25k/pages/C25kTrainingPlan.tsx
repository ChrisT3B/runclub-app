import React from 'react';
import { C25kTrainingPlanViewer } from '../components/C25kTrainingPlanViewer';

export const C25kTrainingPlan: React.FC = () => {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Training Plan</h1>
        <p className="page-description">
          Your 12-week Couch to 5K training schedule
        </p>
      </div>

      <C25kTrainingPlanViewer />
    </div>
  );
};
