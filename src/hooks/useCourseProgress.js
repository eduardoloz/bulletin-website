/**
 * useCourseProgress Hook - Course Progress Management
 *
 * Combines user progress with course completion logic.
 * Handles toggling completed courses and managing external courses.
 * Shared between GraphComponent and RadialGraphComponent.
 */

import { useState, useEffect } from 'react';
import { useUserProgress } from './useUserProgress';

export function useCourseProgress() {
  const { progress, saving, save, isAuthenticated } = useUserProgress();

  const [completedCourses, setCompletedCourses] = useState(new Set());
  const [externalCourses, setExternalCourses] = useState(new Set());

  // Sync local state with database on load
  useEffect(() => {
    if (progress) {
      setCompletedCourses(new Set(progress.completed_courses || []));
      setExternalCourses(new Set(progress.external_courses || []));
    }
  }, [progress]);

  const toggleCompleted = async (id) => {
    const newCompleted = new Set(completedCourses);
    newCompleted.has(id) ? newCompleted.delete(id) : newCompleted.add(id);
    setCompletedCourses(newCompleted);

    if (isAuthenticated) {
      try {
        await save({
          completedCourses: Array.from(newCompleted),
          externalCourses: Array.from(externalCourses),
          standing: progress?.standing || 1,
          majorId: progress?.major_id || null,
        });
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    }
  };

  const addExternalCourse = async (courseCode) => {
    const trimmed = courseCode.trim().toUpperCase();
    if (!trimmed) return;

    const newExternal = new Set([...externalCourses, trimmed]);
    setExternalCourses(newExternal);

    if (isAuthenticated) {
      try {
        await save({
          completedCourses: Array.from(completedCourses),
          externalCourses: Array.from(newExternal),
          standing: progress?.standing || 1,
          majorId: progress?.major_id || null,
        });
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    }
  };

  const removeExternalCourse = async (courseCode) => {
    const newExternal = new Set(externalCourses);
    newExternal.delete(courseCode);
    setExternalCourses(newExternal);

    if (isAuthenticated) {
      try {
        await save({
          completedCourses: Array.from(completedCourses),
          externalCourses: Array.from(newExternal),
          standing: progress?.standing || 1,
          majorId: progress?.major_id || null,
        });
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    }
  };

  return {
    completedCourses,
    externalCourses,
    toggleCompleted,
    addExternalCourse,
    removeExternalCourse,
    saving,
    isAuthenticated,
  };
}
