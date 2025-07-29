// src/shared/hooks/useNavigationHistory.ts

import { useState, useEffect, useCallback } from 'react';

interface NavigationEntry {
  page: string;
  timestamp: number;
}

export const useNavigationHistory = () => {
  const [navigationHistory, setNavigationHistory] = useState<NavigationEntry[]>([]);

  // Add a page to navigation history
  const addToHistory = useCallback((page: string) => {
    const entry: NavigationEntry = {
      page,
      timestamp: Date.now()
    };
    
    setNavigationHistory(prev => [...prev, entry]);
    
    // Add to browser history to prevent PWA closing
    window.history.pushState(
      { page, timestamp: entry.timestamp },
      '',
      `${window.location.pathname}#${page}`
    );
  }, []);

  // Go back to previous page
  const goBack = useCallback(() => {
    if (navigationHistory.length > 0) {
      const previousPage = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      return previousPage.page;
    }
    return 'dashboard'; // Default fallback
  }, [navigationHistory]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      
      if (navigationHistory.length > 0) {
        // Remove the last entry from history
        setNavigationHistory(prev => prev.slice(0, -1));
        
        // Return the previous page or dashboard
        const previousPage = navigationHistory.length > 1 
          ? navigationHistory[navigationHistory.length - 2].page 
          : 'dashboard';
          
        // Trigger custom event to notify AppContent
        window.dispatchEvent(new CustomEvent('navigate-back', { 
          detail: { page: previousPage }
        }));
      } else {
        // No history - stay on current page (prevents PWA closing)
        window.history.pushState({}, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigationHistory]);

  // Initialize with at least one history entry on app start
  useEffect(() => {
    if (window.history.length === 1) {
      window.history.pushState({ page: 'dashboard' }, '', `${window.location.pathname}#dashboard`);
    }
  }, []);

  return {
    addToHistory,
    goBack,
    canGoBack: navigationHistory.length > 0,
    navigationHistory: navigationHistory.map(entry => entry.page) // For debugging
  };
};