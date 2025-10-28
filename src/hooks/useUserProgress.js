/**
 * useUserProgress Hook - Progress State Layer
 *
 * Combines authentication state with user progress data.
 * Automatically loads progress when user logs in,
 * provides save functionality, and handles loading states.
 *
 * Usage:
 *   const { progress, loading, saving, save, isAuthenticated } = useUserProgress();
 *
 * Returns:
 *   - progress: User's progress object (null if not logged in or no data)
 *   - loading: Boolean indicating if progress is being loaded
 *   - saving: Boolean indicating if save operation is in progress
 *   - save: Function to save progress to database
 *   - isAuthenticated: Boolean indicating if user is logged in
 */

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
  getUserProgress,
  saveUserProgress,
} from '../services/userProgressService';

export function useUserProgress() {
  const { user, loading: authLoading } = useAuth();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load progress when user logs in
  useEffect(() => {
    async function loadProgress() {
      // No user = no progress to load
      if (!user) {
        setProgress(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await getUserProgress(user.id);
        setProgress(data);
      } catch (error) {
        console.error('Failed to load user progress:', error);
        // Don't throw - just log. Component can check if progress is null.
      } finally {
        setLoading(false);
      }
    }

    // Wait for auth to finish loading before attempting to load progress
    if (!authLoading) {
      loadProgress();
    }
  }, [user, authLoading]);

  /**
   * Save progress to database
   * @param {Object} updatedProgress - New progress data to save
   * @returns {Promise<void>}
   */
  const save = async (updatedProgress) => {
    if (!user) {
      console.warn('Cannot save progress - user not authenticated');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveUserProgress(user.id, updatedProgress);
      setProgress(saved); // Update local state with saved data
    } catch (error) {
      console.error('Failed to save progress:', error);
      throw error; // Re-throw so component can handle if needed
    } finally {
      setSaving(false);
    }
  };

  return {
    progress,
    loading: authLoading || loading,
    saving,
    save,
    isAuthenticated: !!user,
  };
}
