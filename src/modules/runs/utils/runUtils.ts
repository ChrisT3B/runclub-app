// src/modules/runs/utils/runUtils.ts

/**
 * Utility functions for run-related operations
 */

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format time for display
 */
export const formatTime = (timeString: string): string => {
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Calculate days until run
 */
export const getDaysUntilRun = (dateString: string): number => {
  const runDate = new Date(dateString);
  const today = new Date();
  const diffTime = runDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Check if a run is urgent (within 7 days and needs LIRFs)
 */
export const isRunUrgent = (runDate: string, lirfVacancies: number): boolean => {
  const daysUntil = getDaysUntilRun(runDate);
  return daysUntil <= 7 && lirfVacancies > 0;
};

/**
 * Get membership status colors
 */
export const getMembershipStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return { background: '#dcfce7', color: '#166534' };
    case 'pending':
      return { background: '#fef3c7', color: '#92400e' };
    case 'expired':
      return { background: '#fecaca', color: '#991b1b' };
    default:
      return { background: '#f3f4f6', color: '#374151' };
  }
};

/**
 * Share callback interface for UI feedback
 */
export interface ShareCallbacks {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onFacebookGroupShare: (message: string) => void;
}

/**
 * Handle sharing functionality with callback support for modals
 */
export const handleRunShare = (run: any, platform: string, callbacks?: ShareCallbacks): void => {
  const runUrl = `${window.location.origin}/runs/${run.id}`;
  const runText = `🏃‍♂️ ${run.run_title}\n\n📅 ${formatDate(run.run_date)} at ${formatTime(run.run_time)}\n📍 ${run.meeting_point}\n${run.approximate_distance ? `🏃‍♂️ ${run.approximate_distance}\n` : ''}${run.description ? `\n${run.description}\n` : ''}\n👥 ${run.max_participants - run.booking_count} spaces available!\n\nBook your place now! 👇`;
  
  // Fallback copy function
  const copyFallback = (text: string): void => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Make it invisible but still functional
      textArea.style.position = 'absolute';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      textArea.setAttribute('readonly', '');
      
      document.body.appendChild(textArea);
      
      // For iOS Safari
      if (navigator.userAgent.match(/ipad|iphone/i)) {
        textArea.contentEditable = 'true';
        textArea.readOnly = false;
        const range = document.createRange();
        range.selectNodeContents(textArea);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        textArea.setSelectionRange(0, 999999);
      } else {
        textArea.select();
      }
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        callbacks?.onSuccess('✅ Run details copied to clipboard!') || 
        console.log('Run details copied to clipboard');
      } else {
        callbacks?.onError('❌ Copy failed. Please try manually selecting and copying the text.') ||
        console.error('Copy failed');
      }
    } catch (err) {
      callbacks?.onError('❌ Copy not supported. Please manually copy the text.') ||
      console.error('Copy not supported');
    }
  };
  
  switch (platform) {
    case 'facebook-group':
      const fbGroupUrl = 'https://www.facebook.com/groups/runalcester';
      
      // Copy the text to clipboard first
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(runText).then(() => {
          window.open(fbGroupUrl, '_blank');
          callbacks?.onFacebookGroupShare('📋 Run details copied to clipboard!\n\nFacebook group is opening - paste the details into a new post.') ||
          console.log('Shared to Facebook group');
        }).catch(() => {
          copyFallback(runText);
          window.open(fbGroupUrl, '_blank');
          callbacks?.onFacebookGroupShare('📋 Run details copied to clipboard!\n\nFacebook group is opening - paste the details into a new post.') ||
          console.log('Shared to Facebook group (fallback)');
        });
      } else {
        copyFallback(runText);
        window.open(fbGroupUrl, '_blank');
        callbacks?.onFacebookGroupShare('📋 Run details copied to clipboard!\n\nFacebook group is opening - paste the details into a new post.') ||
        console.log('Shared to Facebook group (fallback)');
      }
      break;
      
    case 'facebook':
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(runUrl)}&quote=${encodeURIComponent(runText)}`;
      window.open(fbUrl, '_blank');
      break;
      
    case 'whatsapp':
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(runText + '\n\n' + runUrl)}`;
      window.open(whatsappUrl, '_blank');
      break;
      
    case 'copy':
      const textToCopy = runText + '\n\n' + runUrl;
      
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          callbacks?.onSuccess('✅ Run details copied to clipboard!') ||
          console.log('Copied to clipboard');
        }).catch(() => {
          copyFallback(textToCopy);
        });
      } else {
        copyFallback(textToCopy);
      }
      break;
      
    default:
      console.log('Unknown sharing platform:', platform);
  }
};