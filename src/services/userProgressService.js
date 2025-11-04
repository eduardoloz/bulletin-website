/**
 * User Progress Service - Data Access Layer
 *
 * Handles all database operations for user progress data.
 * Pure functions - no React hooks, no UI logic.
 * All functions are async and may throw errors.
 *
 * Database Schema Expected:
 *   - user_progress table with columns:
 *     - user_id (UUID, FK to auth.users)
 *     - completed_courses (UUID[])
 *     - taking_now (UUID[])
 *     - external_courses (TEXT[])
 *     - standing (INTEGER)
 *     - major_id (UUID, nullable)
 */

import { supabase } from '../supabaseClient';

/**
 * Load user's progress from database
 * @param {string} userId - The user's UUID
 * @returns {Promise<Object|null>} Progress data or null if not found
 */
export async function getUserProgress(userId) {
  if (!userId) {
    console.warn('getUserProgress called without userId');
    return null;
  }

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .single();

  // User hasn't created progress yet - this is normal for new users
  if (error && error.code === 'PGRST116') {
    return null;
  }

  if (error) {
    console.error('Error loading user progress:', error);
    throw error;
  }

  return data;
}

/**
 * Save user's progress to database (creates or updates)
 * @param {string} userId - The user's UUID
 * @param {Object} progress - Progress data to save
 * @param {string[]} progress.completedCourses - Array of completed course UUIDs
 * @param {string[]} progress.takingNow - Array of current course UUIDs
 * @param {string[]} progress.externalCourses - Array of external course codes
 * @param {number} progress.standing - User's academic standing (1-5)
 * @param {string|null} progress.majorId - User's major UUID
 * @returns {Promise<Object>} Saved progress data
 */
export async function saveUserProgress(userId, progress) {
  if (!userId) {
    throw new Error('userId is required to save progress');
  }

  const progressData = {
    user_id: userId,
    completed_courses: progress.completedCourses || [],
    taking_now: progress.takingNow || [],
    external_courses: progress.externalCourses || [],
    standing: progress.standing || 1,
    major_id: progress.majorId || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('user_progress')
    .upsert(progressData, {
      onConflict: 'user_id', // Update if exists, insert if not
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving user progress:', error);
    throw error;
  }

  return data;
}

/**
 * Delete user's progress from database
 * @param {string} userId - The user's UUID
 * @returns {Promise<void>}
 */
export async function deleteUserProgress(userId) {
  if (!userId) {
    throw new Error('userId is required to delete progress');
  }

  const { error } = await supabase
    .from('user_progress')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting user progress:', error);
    throw error;
  }
}
