import React, { useEffect, useMemo, useState } from 'react';
import specializationsData from '../data/courses/specializations.json';

const DEPT_TO_POID = {
  CSE: 318,
  ISE: 384,
  PHY: 438,
  EST: 414,
};

const NUMBER_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
};

function findMajorEntry(deptCode) {
  const poid = DEPT_TO_POID[deptCode];
  if (!poid) return null;
  return specializationsData.find((major) => major.poid === poid) || null;
}

function inferSectionTarget(label, courses) {
  if (!courses?.length) return 0;
  if (!label) return null;

  const normalized = label.toLowerCase();
  const requiredMatch = normalized.match(/\b(one|two|three|four|five|six|seven|eight|\d+)\b/);

  if (normalized.includes('required') || normalized.includes('core') || normalized.includes('project')) {
    if (requiredMatch) {
      const token = requiredMatch[1];
      return Number.isNaN(Number(token)) ? NUMBER_WORDS[token] : Number(token);
    }
    return courses.length;
  }

  if (normalized.includes('elective') || normalized.includes('following') || normalized.includes('additional')) {
    if (requiredMatch) {
      const token = requiredMatch[1];
      return Number.isNaN(Number(token)) ? NUMBER_WORDS[token] : Number(token);
    }
    return null;
  }

  return courses.length;
}

function buildSectionProgress(section, completedCourseCodes) {
  const courses = section.courses || [];
  const targetCount = inferSectionTarget(section.label, courses);
  const completedCount = courses.filter((code) => completedCourseCodes.has(code)).length;
  const remainingCount = targetCount == null
    ? courses.length - completedCount
    : Math.max(targetCount - completedCount, 0);
  const trackedCourses = courses.filter((code) => completedCourseCodes.has(code));
  const remainingCourses = courses.filter((code) => !completedCourseCodes.has(code));

  return {
    ...section,
    targetCount,
    completedCount,
    remainingCount,
    trackedCourses,
    remainingCourses,
  };
}

function specProgress(spec, completedCourseCodes) {
  const completedCount = (spec.courses || []).filter((code) => completedCourseCodes.has(code)).length;
  return {
    totalCount: spec.courses?.length || 0,
    completedCount,
    remainingCount: Math.max((spec.courses?.length || 0) - completedCount, 0),
  };
}

export default function SpecializationSelector({
  deptCode,
  selectedSlugs,
  onChange,
  completedCourseCodes = new Set(),
}) {
  const major = findMajorEntry(deptCode);
  const [detailSlug, setDetailSlug] = useState(null);

  useEffect(() => {
    if (!major || major.specializations.length === 0) {
      setDetailSlug(null);
      return;
    }

    const availableSlugs = major.specializations.map((spec) => spec.slug);
    setDetailSlug((current) => {
      if (current && availableSlugs.includes(current)) return current;
      return null;
    });
  }, [major]);

  const detailSpec = useMemo(() => {
    if (!major || !detailSlug) return null;
    return major.specializations.find((spec) => spec.slug === detailSlug) || null;
  }, [major, detailSlug]);

  useEffect(() => {
    if (!major || !detailSpec) {
      window.dispatchEvent(
        new CustomEvent('specialization:selected', { detail: { specialization: null } })
      );
      return;
    }

    const detailSections = (detailSpec.sections?.length ? detailSpec.sections : [
      { label: 'Listed Courses', courses: detailSpec.courses || [] },
    ]).map((section) => buildSectionProgress(section, completedCourseCodes));

    const completedCount = (detailSpec.courses || []).filter((code) => completedCourseCodes.has(code)).length;

    window.dispatchEvent(
      new CustomEvent('specialization:selected', {
        detail: {
          specialization: {
            majorName: major.majorName,
            majorUrl: major.url,
            name: detailSpec.name,
            slug: detailSpec.slug,
            totalCount: detailSpec.courses?.length || 0,
            completedCount,
            remainingCount: Math.max((detailSpec.courses?.length || 0) - completedCount, 0),
            sections: detailSections,
          },
        },
      })
    );
  }, [major, detailSpec, completedCourseCodes]);

  useEffect(() => () => {
    window.dispatchEvent(
      new CustomEvent('specialization:selected', { detail: { specialization: null } })
    );
  }, []);

  if (!major || major.specializations.length === 0) return null;

  const toggle = (slug) => {
    const next = new Set(selectedSlugs);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    onChange(next);
  };

  const clearAll = () => onChange(new Set());

  const anyChecked = selectedSlugs.size > 0;
  const highlightedCount = major.specializations.filter((spec) => selectedSlugs.has(spec.slug)).length;

  return (
    <div className="mb-3 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Specializations</h3>
          <p className="text-xs text-slate-600">
            Highlight a track on the graph, or open its details in the right sidebar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
            {major.specializations.length} options
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {highlightedCount} highlighted
          </span>
          {anyChecked && (
            <button
              onClick={clearAll}
              className="rounded-full border border-emerald-300 px-2.5 py-1 text-[11px] font-medium text-emerald-800 transition hover:bg-emerald-100"
            >
              Clear highlights
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {major.specializations.map((spec) => {
          const isSelected = selectedSlugs.has(spec.slug);
          const isOpen = detailSlug === spec.slug;
          const progress = specProgress(spec, completedCourseCodes);

          return (
            <div
              key={spec.slug}
              className={`rounded-xl border p-3 transition ${
                isOpen
                  ? 'border-emerald-500 bg-white shadow-md'
                  : 'border-emerald-100 bg-white/80 hover:border-emerald-300 hover:bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">{spec.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {spec.sections?.length || 0} requirement groups
                  </div>
                </div>

                <label className="flex items-center gap-2 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(spec.slug)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Highlight
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  {progress.completedCount}/{progress.totalCount} tracked
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800">
                  {progress.remainingCount} left
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDetailSlug(isOpen ? null : spec.slug)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    isOpen
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-800'
                  }`}
                >
                  {isOpen ? 'Hide details' : 'Show details'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {detailSlug && (
        <p className="mt-3 text-xs text-slate-500">
          Specialization details are shown in the right sidebar under the legend.
        </p>
      )}
    </div>
  );
}

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
