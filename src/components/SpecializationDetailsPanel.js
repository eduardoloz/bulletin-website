import React, { useEffect, useState } from 'react';

export default function SpecializationDetailsPanel() {
  const [specialization, setSpecialization] = useState(null);

  useEffect(() => {
    const handler = (event) => setSpecialization(event?.detail?.specialization ?? null);
    window.addEventListener('specialization:selected', handler);
    return () => window.removeEventListener('specialization:selected', handler);
  }, []);

  if (!specialization) return null;

  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3 shadow-sm">
      <div className="mb-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
          Specialization Details
        </div>
        <h3 className="text-sm font-semibold text-slate-900">{specialization.name}</h3>
        <p className="text-xs text-slate-600">
          Track listed requirements for this path and see what courses are still left.
        </p>
      </div>

      {specialization.description && (
        <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-1">
            About
          </div>
          <p className="text-xs leading-relaxed text-slate-700">
            {specialization.description}
          </p>
        </div>
      )}

      {specialization.rules && (
        <div className="mb-3 rounded-lg border border-slate-200 bg-white p-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Requirements
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {specialization.rules.totalCourses != null && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                {specialization.rules.totalCourses} courses total
              </span>
            )}
            {specialization.rules.coreMin != null && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                ≥ {specialization.rules.coreMin} core
              </span>
            )}
            {specialization.rules.declarationCoreMin != null && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                Declare after {specialization.rules.declarationCoreMin} core
              </span>
            )}
          </div>

          {specialization.rules.declarationCoreMin != null && (() => {
            const need = specialization.rules.declarationCoreMin;
            const have = specialization.coreCompleted || 0;
            const eligible = have >= need;
            return (
              <div
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium ${
                  eligible
                    ? 'bg-green-100 text-green-900 border border-green-300'
                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                }`}
              >
                {eligible
                  ? `Eligible to declare — ${have}/${need} core courses tracked.`
                  : `${have}/${need} core courses tracked — ${need - have} more to declare.`}
              </div>
            );
          })()}
        </div>
      )}

      <div className="grid gap-2 mb-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Overview</div>
          <div className="mt-1 text-xs text-slate-700">{specialization.majorName}</div>
          <div className="mt-1 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
              {specialization.totalCount} listed
            </span>
            <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] font-medium text-green-800">
              {specialization.completedCount} tracked
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800">
              {specialization.remainingCount} left
            </span>
          </div>
          <a
            href={specialization.majorUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            View catalog requirements
          </a>
        </div>
      </div>

      <div className="space-y-3">
        {specialization.sections.map((section, index) => {
          const title = section.label || `Requirement Group ${index + 1}`;
          const trackedList = section.trackedCourses || [];
          const remainingList = section.remainingCourses || [];

          return (
            <div key={`${specialization.slug}-${title}-${index}`} className="rounded-lg border border-slate-200 p-2.5">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-slate-900">{title}</div>
                  <div className="text-[11px] text-slate-500">
                    {section.targetCount == null
                      ? `${section.completedCount}/${section.courses.length} listed courses tracked`
                      : `${section.completedCount}/${section.targetCount} target tracked`}
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                  {section.targetCount == null ? `${remainingList.length} untracked` : `${section.remainingCount} left`}
                </span>
              </div>

              {trackedList.length > 0 && (
                <div className="mb-2">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-green-800">Tracked</div>
                  <div className="flex flex-wrap gap-1.5">
                    {trackedList.map((courseCode) => (
                      <span
                        key={`${specialization.slug}-${title}-tracked-${courseCode}`}
                        className="rounded-full border border-green-900 bg-green-800 px-2.5 py-1 text-[11px] font-medium text-green-50"
                      >
                        {courseCode}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {remainingList.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Still Left</div>
                  <div className="flex flex-wrap gap-1.5">
                    {remainingList.map((courseCode) => (
                      <span
                        key={`${specialization.slug}-${title}-remaining-${courseCode}`}
                        className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700"
                      >
                        {courseCode}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
