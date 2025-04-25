import React from 'react';

function NodeInfo({ course }) {
  if (!course) {
    return (
      <div className="border p-4 rounded-lg bg-gray-100 m-4">
        <p>Click a course node to view course details.</p>
      </div>
    );
  }

  const [code, name] = course.title.split(':').map(s => s.trim());

  return (
    <div className="border border-black rounded-lg bg-white m-4 p-4">
      <h2 className="text-xl font-semibold mb-2">{code}</h2>
      <h3 className="text-md font-medium mb-4">{name}</h3>

      <p className="text-gray-700 mb-2">
        <strong className="font-medium">Description:</strong> {course.description}
      </p>

      <p className="text-gray-700 mb-2">
        <strong className="font-medium">Prerequisites:</strong>{' '}
        {course.prerequisite.length > 0 ? course.prerequisite.join(', ') : 'None'}
      </p>
    </div>
  );
}

export default NodeInfo;
