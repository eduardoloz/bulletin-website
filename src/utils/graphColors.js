/**
 * Graph Color Utilities
 *
 * Centralized color logic for graph nodes and links.
 * Shared between GraphComponent and RadialGraphComponent.
 */

import { canTakeCourse, getAllPrerequisites } from './courseUtils';

// Color constants
export const COLORS = {
  COMPLETED: '#34D399',      // Green
  AVAILABLE: '#60A5FA',      // Blue
  FUTURE: 'purple',          // Purple
  LOCKED: '#ccc',            // Gray
  PREREQ: 'orange',          // Orange
  PREREQ_FADED: '#eee',      // Light gray
  LINK_DEFAULT: '#999',      // Default link color
  LINK_HIGHLIGHT: '#f97316', // Orange for highlighted links
};

/**
 * Get node color based on mode and course state
 */
export function getNodeColor(
  id,
  mode,
  completedCourses,
  externalCourseIds,
  courseMap,
  selectedCourse,
  futureMode
) {
  // View mode and completed mode use the same color logic
  if (mode === 'completed' || mode === 'view') {
    if (completedCourses.has(id)) return COLORS.COMPLETED;

    const course = courseMap[id];
    if (!course) return COLORS.LOCKED;

    const allCompletedIds = new Set([...completedCourses, ...externalCourseIds]);

    if (canTakeCourse(course, allCompletedIds)) {
      return COLORS.AVAILABLE;
    }

    if (futureMode) {
      const currentlyAvailable = new Set();
      Object.values(courseMap).forEach(c => {
        if (!completedCourses.has(c.id) && canTakeCourse(c, allCompletedIds)) {
          currentlyAvailable.add(c.id);
        }
      });

      const hypotheticalCompleted = new Set([...allCompletedIds, ...currentlyAvailable]);
      if (canTakeCourse(course, hypotheticalCompleted)) {
        return COLORS.FUTURE;
      }
    }

    return COLORS.LOCKED;
  }

  if (mode === 'prereqs' && selectedCourse) {
    return getAllPrerequisites(selectedCourse, courseMap).has(id)
      ? COLORS.PREREQ
      : COLORS.PREREQ_FADED;
  }

  return COLORS.LOCKED;
}

/**
 * Get link color based on mode and prerequisite chain
 */
export function getLinkColor(link, mode, selectedCourse, courseMap, completedCourses) {
  if (mode === 'prereqs' && selectedCourse) {
    const prereqIds = getAllPrerequisites(selectedCourse, courseMap);
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;

    if (prereqIds.has(sourceId) && prereqIds.has(targetId)) {
      return COLORS.LINK_HIGHLIGHT;
    }
  }

  // In view/completed mode, highlight arrows between completed courses
  if ((mode === 'view' || mode === 'completed') && completedCourses) {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;

    if (completedCourses.has(sourceId) && completedCourses.has(targetId)) {
      return COLORS.COMPLETED; // Green for your completed path
    }
  }

  return COLORS.LINK_DEFAULT;
}

/**
 * Get link opacity based on mode and prerequisite chain
 */
export function getLinkOpacity(link, mode, selectedCourse, courseMap, completedCourses) {
  if (mode === 'prereqs' && selectedCourse) {
    const prereqIds = getAllPrerequisites(selectedCourse, courseMap);
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;

    if (prereqIds.has(sourceId) && prereqIds.has(targetId)) {
      return 1; // Full opacity for relevant arrows
    }
    return 0.15; // Fade out non-relevant arrows
  }

  // In view/completed mode, only show arrows between completed courses
  if ((mode === 'view' || mode === 'completed') && completedCourses) {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;

    if (completedCourses.has(sourceId) && completedCourses.has(targetId)) {
      return 1; // Full opacity for your completed path
    }
    return 0.1; // Nearly invisible for non-completed connections
  }

  return 0.6; // Default opacity
}
