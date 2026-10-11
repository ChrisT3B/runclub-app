import React from 'react';
import { CalendarOff } from 'lucide-react';

export const C25kClosedNotice: React.FC = () => {
  return (
    <div className="c25k-closed">
      <div className="c25k-closed__icon">
        <CalendarOff size={32} />
      </div>
      <h1 className="c25k-closed__title">C25K registration is closed</h1>
      <p className="c25k-closed__text">
        Couch to 5K is not running at the moment. Details of the next programme will be shared through the club's usual channels.
      </p>
      <a href="/" className="action-btn action-btn--primary c25k-closed__link">
        Back to App
      </a>
    </div>
  );
};
