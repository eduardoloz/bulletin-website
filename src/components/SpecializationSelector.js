import React from 'react';
import specializationsData from '../data/courses/specializations.json';

// Map dept code -> catalog poid for the BS/BE program. Add entries as more
// majors gain specializations in the catalog.
const DEPT_TO_POID = {
  CSE: 318, // Computer Science, BS
  ISE: 384, // Information Systems, BS
  PHY: 438, // Physics, BS
  EST: 414, // Technological Systems Management, BS
};

function findMajorEntry(deptCode) {
  const poid = DEPT_TO_POID[deptCode];
  if (!poid) return null;
  return specializationsData.find((m) => m.poid === poid) || null;
}

export default function SpecializationSelector({
  deptCode,
  selectedSlugs,
  onChange,
}) {
  const major = findMajorEntry(deptCode);
  if (!major || major.specializations.length === 0) return null;

  const toggle = (slug) => {
    const next = new Set(selectedSlugs);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    onChange(next);
  };

  const clearAll = () => onChange(new Set());

  const anyChecked = selectedSlugs.size > 0;

  return (
    <div className="mb-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold">
          Specializations
          <span className="text-xs text-gray-500 ml-2">
            ({major.majorName})
          </span>
        </h3>
        {anyChecked && (
          <button
            onClick={clearAll}
            className="text-xs text-amber-700 hover:text-amber-900 underline"
          >
            Clear
          </button>
        )}
      </div>
      <p className="text-xs text-gray-600 mb-2">
        Check a specialization to highlight its required courses on the graph.
      </p>
      <div className="space-y-1">
        {major.specializations.map((spec) => (
          <label
            key={spec.slug}
            className="flex items-start gap-2 text-sm cursor-pointer hover:bg-amber-100 rounded p-1"
          >
            <input
              type="checkbox"
              checked={selectedSlugs.has(spec.slug)}
              onChange={() => toggle(spec.slug)}
              className="mt-1"
            />
            <span className="flex-1">
              <span className="font-medium">{spec.name}</span>
              <span className="text-xs text-gray-500 ml-1">
                ({spec.courses.length} courses)
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// Helper consumed by GraphComponent to compute the highlight set.
export function highlightedCoursesFor(deptCode, selectedSlugs) {
  const major = findMajorEntry(deptCode);
  if (!major) return new Set();
  const result = new Set();
  for (const spec of major.specializations) {
    if (selectedSlugs.has(spec.slug)) {
      for (const code of spec.courses) result.add(code);
    }
  }
  return result;
}
