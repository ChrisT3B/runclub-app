// src/modules/membership/components/ProfilePage.tsx
import React, { useState } from 'react';
import { ProfileView } from './ProfileView';
import { ProfileEditForm } from './ProfileEditForm';

export const ProfilePage: React.FC = () => {
  // Check URL parameters to determine initial mode
  const searchParams = new URLSearchParams(window.location.search);
  const initialMode = searchParams.get('edit') === 'true' ? 'edit' : 'view';
  
  const [profileMode, setProfileMode] = useState<'view' | 'edit'>(initialMode);

  // Update URL when mode changes
  const handleSetMode = (mode: 'view' | 'edit') => {
    setProfileMode(mode);
    
    // Update URL without page reload
    const url = new URL(window.location.href);
    if (mode === 'edit') {
      url.searchParams.set('edit', 'true');
    } else {
      url.searchParams.delete('edit');
    }
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-description">Manage your profile and settings</p>
      </div>
      
      {profileMode === 'view' ? (
        <ProfileView onEdit={() => handleSetMode('edit')} />
      ) : (
        <ProfileEditForm 
          onCancel={() => handleSetMode('view')}
          onSave={() => handleSetMode('view')}
        />
      )}
    </div>
  );
};