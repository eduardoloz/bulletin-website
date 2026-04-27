import React, { useMemo } from 'react';

export default function CompletedCoursesPanel({
  courseMap,
  courseCodeMap = {},
  completedCourses,
  onRemoveCourse,
}) {
  const completedCourseList = useMemo(() => (
    Array.from(completedCourses)
      .map((key) => {
        const course = courseMap[key] || courseCodeMap[key] || null;
        return course ? { key, course } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.course.code.localeCompare(b.course.code))
  ), [completedCourses, courseMap, courseCodeMap]);

  return (
    <div className="mb-2 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-sm font-semibold text-green-900">Taken Courses</h3>
        <span className="text-xs font-medium text-green-800 bg-green-100 px-2 py-1 rounded-full">
          {completedCourseList.length} tracked
        </span>
      </div>

      {completedCourseList.length === 0 ? (
        <p className="text-xs text-green-900">
          No completed classes tracked yet. Switch to Completed Mode and click a course node to add it.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-2">
            {completedCourseList.map(({ key, course }) => (
              <span
                key={key}
                className="group inline-flex items-center gap-1 bg-green-200 text-green-900 px-2 py-1 rounded text-sm"
              >
                {course.code}
                <button
                  onClick={() => onRemoveCourse(key)}
                  className="ml-1 rounded-full px-1 text-red-700 opacity-0 transition group-hover:opacity-100 focus:opacity-100 hover:text-red-900"
                  aria-label={`Remove ${course.code} from taken courses`}
                  title={`Remove ${course.code}`}
                >
                  x
                </button>
              </span>
            ))}
          </div>
          <p className="text-xs text-green-900">
            Hover over a tracked course to remove it directly from this list.
          </p>
        </>
      )}
    </div>
  );
}
