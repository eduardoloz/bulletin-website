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

function countDone(courses, completed, external) {
  let n = 0;
  for (const c of courses) {
    if (completed.has(c) || external.has(c)) n += 1;
  }
  return n;
}

function shortLabel(s, max = 22) {
  if (!s) return 'Other';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export default function SpecializationSelector({
  deptCode,
  selectedSlugs,
  onChange,
  completedCourses = new Set(),
  externalCourses = new Set(),
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

  // Per-spec progress
  const specs = major.specializations.map((spec) => {
    const total = spec.courses.length;
    const done = countDone(spec.courses, completedCourses, externalCourses);
    return { ...spec, total, done, pct: total ? done / total : 0 };
  });

  // Aggregate over selected specs
  const sel = specs.filter((s) => selectedSlugs.has(s.slug));
  const selDone = sel.reduce((a, s) => a + s.done, 0);
  const selTotal = sel.reduce((a, s) => a + s.total, 0);
  const selPct = selTotal ? selDone / selTotal : 0;

  return (
    <div className="mb-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 leading-tight">
            Specializations
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {major.majorName} · {specs.length} available
          </p>
        </div>
        {anyChecked && (
          <button
            onClick={clearAll}
            className="text-xs font-medium text-amber-700 hover:text-amber-900 shrink-0 mt-1"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Aggregate progress when something is selected */}
      {anyChecked && selTotal > 0 && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-amber-900">
              {sel.length} selected
            </span>
            <span className="text-xs font-medium text-amber-900 tabular-nums">
              {selDone} / {selTotal} courses completed
            </span>
          </div>
          <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-600 transition-all duration-300"
              style={{ width: `${selPct * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Spec cards */}
      <ul className="divide-y divide-gray-100">
        {specs.map((spec) => {
          const isChecked = selectedSlugs.has(spec.slug);
          const isComplete = spec.total > 0 && spec.done === spec.total;

          return (
            <li key={spec.slug}>
              <label
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-l-4 ${
                  isChecked
                    ? 'bg-amber-50/60 border-amber-500'
                    : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(spec.slug)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-gray-900">
                      {spec.name}
                    </span>
                    <span
                      className={`text-xs font-semibold tabular-nums shrink-0 ${
                        isComplete ? 'text-green-700' : 'text-gray-700'
                      }`}
                    >
                      {spec.done} / {spec.total}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isComplete ? 'bg-green-500' : 'bg-amber-400'
                      }`}
                      style={{ width: `${spec.pct * 100}%` }}
                    />
                  </div>

                  {/* Sub-section badges */}
                  {spec.sections.length > 1 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {spec.sections.map((sec, i) => {
                        const secDone = countDone(
                          sec.courses,
                          completedCourses,
                          externalCourses
                        );
                        const secComplete =
                          sec.courses.length > 0 && secDone === sec.courses.length;
                        return (
                          <span
                            key={i}
                            title={sec.label || 'Other'}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              secComplete
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {shortLabel(sec.label)}: {secDone}/{sec.courses.length}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      {/* Footer hint */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-[11px] text-gray-500">
          Checked specializations get an amber ring on the graph. Mark courses
          completed in <span className="font-medium">Completed Mode</span> to
          fill the progress bars.
        </p>
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
