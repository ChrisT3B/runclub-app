import React, { useState } from 'react';
import { ProfileView } from './ProfileView';
import { ProfileEditForm } from './ProfileEditForm';

export const ProfilePage: React.FC = () => {
  const [profileMode, setProfileMode] = useState<'view' | 'edit'>('view');

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-description">Manage your profile and settings</p>
      </div>
      
      {profileMode === 'view' ? (
        <ProfileView onEdit={() => setProfileMode('edit')} />
      ) : (
        <ProfileEditForm 
          onCancel={() => setProfileMode('view')}
          onSave={() => setProfileMode('view')}
        />
      )}
    </div>
  );
};