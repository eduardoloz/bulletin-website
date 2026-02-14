import React from 'react';
import { getPrerequisiteCourseIds } from '../utils/courseUtils';
import courses from '../data/sbu_cse_courses_new_schema.json';

function NodeInfo({ course }) {
  if (!course) {
    return (
      <div className="border p-4 rounded-lg bg-gray-100 m-4">
        <p>Click a course node to view course details.</p>
      </div>
    );
  }

  // Build a map to look up course codes from IDs
  const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));

  // Get prerequisite course IDs and convert to course codes
  const prereqIds = getPrerequisiteCourseIds(course);
  const prereqCodes = prereqIds
    .map(id => courseMap[id]?.code)
    .filter(Boolean)
    .sort();

  return (
    <div className="border border-black rounded-lg bg-white m-4 p-4">
      <h2 className="text-xl font-semibold mb-2">{course.code}</h2>
      <h3 className="text-md font-medium mb-4">{course.title.split(':')[1]?.trim()}</h3>

      <p className="text-gray-700 mb-2">
        <strong className="font-medium">Credits:</strong> {course.credits}
      </p>

      <p className="text-gray-700 mb-2">
        <strong className="font-medium">Description:</strong> {course.description}
      </p>

      <p className="text-gray-700 mb-2">
        <strong className="font-medium">Prerequisites:</strong>{' '}
        {prereqCodes.length > 0 ? prereqCodes.join(', ') : 'None'}
      </p>

      {course.advisorNotes && (
        <p className="text-gray-700 mb-2">
          <strong className="font-medium">Notes:</strong> {course.advisorNotes}
        </p>
      )}

      <p className="text-gray-700 mb-2">
        <strong className="font-medium">Status:</strong>{' '}
        <span className={course.active ? 'text-green-600' : 'text-red-600'}>
          {course.active ? 'Active' : 'Inactive'}
        </span>
      </p>
    </div>
  );
}

export default NodeInfo;
