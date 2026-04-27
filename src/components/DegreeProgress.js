import { useState, useEffect, useMemo } from "react";
import wrtData from "../data/SBCS/WRT.json";
import artsData from "../data/SBCS/ARTS.json";
import gloData from "../data/SBCS/GLO.json";
import humData from "../data/SBCS/HUM.json";
import langData from "../data/SBCS/LANG.json";
import qpsData from "../data/SBCS/QPS.json";
import sbsData from "../data/SBCS/SBS.json";
import snwData from "../data/SBCS/SNW.json";
import techData from "../data/SBCS/TECH.json";
import usaData from "../data/SBCS/USA.json";
import { useUserProgress } from "../hooks/useUserProgress";

const REQUIRED_CATEGORIES = ["ARTS", "GLO", "HUM", "LANG", "QPS", "SBS", "SNW", "TECH", "USA", "WRT"];

const EXEMPTION_MAJORS = [
  "CEAS",
  "Athletic Training",
  "Respiratory Care",
  "Clinical Laboratory Sciences",
  "Social Work",
];

const MAJOR_OPTIONS = [
  "CSE - Computer Science and Engineering",
  "AMS - Applied Mathematics and Statistics",
  ...EXEMPTION_MAJORS,
  "Other",
];

const normalizeCode = (s) => (s || "").trim().toUpperCase();

const toCourse = (c) => ({
  code: c.code || `${c.deptCode} ${c.number}`,
  name: c.title || c.name || "",
  credits: c.credits || 0,
});

export default function DegreeProgress() {
  const { progress, save, isAuthenticated, saving } = useUserProgress();

  // External courses (typed by user) are the source of truth for what fulfills GE.
  // Persisted on the same `external_courses` field the graph already uses.
  const externalCourses = useMemo(
    () => new Set((progress?.external_courses || []).map(normalizeCode)),
    [progress]
  );

  const sbcsMap = useMemo(
    () => ({
      ARTS: artsData.map(toCourse),
      GLO: gloData.map(toCourse),
      HUM: humData.map(toCourse),
      LANG: langData.map(toCourse),
      QPS: qpsData.map(toCourse),
      SBS: sbsData.map(toCourse),
      SNW: snwData.map(toCourse),
      TECH: techData.map(toCourse),
      USA: usaData.map(toCourse),
      WRT: wrtData.map(toCourse),
    }),
    []
  );

  const [selectedMajorForCheck, setSelectedMajorForCheck] = useState(MAJOR_OPTIONS[0]);
  const [courseInput, setCourseInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(REQUIRED_CATEGORIES[0]);

  const isLangExempt =
    selectedMajorForCheck !== "Other" &&
    EXEMPTION_MAJORS.some((m) => m.toLowerCase() === selectedMajorForCheck.toLowerCase());

  const requirements = useMemo(() => {
    return REQUIRED_CATEGORIES.map((category) => {
      if (category === "LANG" && isLangExempt) {
        return { category, completed: true, status: "Exempt", courses: sbcsMap[category] };
      }
      const validCodes = new Set(sbcsMap[category].map((c) => normalizeCode(c.code)));
      const matched = Array.from(externalCourses).some((code) => validCodes.has(code));
      return {
        category,
        completed: matched,
        status: matched ? "Fulfilled" : "In Progress",
        courses: sbcsMap[category],
      };
    });
  }, [externalCourses, isLangExempt, sbcsMap]);

  useEffect(() => {
    if (!REQUIRED_CATEGORIES.includes(selectedCategory)) {
      setSelectedCategory(REQUIRED_CATEGORIES[0]);
    }
  }, [selectedCategory]);

  const persist = async (nextExternalSet) => {
    if (!isAuthenticated) return;
    try {
      await save({
        completedCourses: progress?.completed_courses || [],
        externalCourses: Array.from(nextExternalSet),
        standing: progress?.standing || 1,
        majorId: progress?.major_id || null,
      });
    } catch (err) {
      console.error("Failed to save GE progress:", err);
    }
  };

  const addUserCourse = async (raw) => {
    const code = normalizeCode(raw);
    if (!code) return;
    if (externalCourses.has(code)) {
      setCourseInput("");
      return;
    }
    const next = new Set(externalCourses);
    next.add(code);
    setCourseInput("");
    await persist(next);
  };

  const removeUserCourse = async (code) => {
    const next = new Set(externalCourses);
    next.delete(code);
    await persist(next);
  };

  const selectedReq = requirements.find((r) => r.category === selectedCategory);

  return (
    <div className="bg-[#F9FAFB] text-gray-900">
      <div className="max-w-6xl mx-auto mt-10 flex flex-col md:flex-row gap-6 px-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold mb-6">General Education Requirements</h1>

          <div className="mb-6 p-4 bg-white rounded-md border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Major</label>
                <select
                  value={selectedMajorForCheck}
                  onChange={(e) => setSelectedMajorForCheck(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {MAJOR_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Add completed GE course
                </label>
                <div className="flex gap-2">
                  <input
                    value={courseInput}
                    onChange={(e) => setCourseInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addUserCourse(courseInput);
                      }
                    }}
                    placeholder="e.g., AAS 209"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <button
                    onClick={() => addUserCourse(courseInput)}
                    disabled={saving}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.from(externalCourses).map((c) => (
                    <span key={c} className="bg-gray-100 px-2 py-1 rounded flex items-center gap-2">
                      <span className="text-sm">{c}</span>
                      <button onClick={() => removeUserCourse(c)} className="text-red-600">×</button>
                    </span>
                  ))}
                </div>
                {!isAuthenticated && (
                  <p className="mt-2 text-xs text-amber-600">
                    Sign in to save your progress.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {requirements.map((req) => (
              <div
                key={req.category}
                onClick={() => setSelectedCategory(req.category)}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between shadow-sm hover:shadow-md ${
                  req.completed ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white"
                } ${selectedCategory === req.category ? "ring-2 ring-blue-300" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={req.completed}
                    disabled
                    aria-disabled
                    title={req.completed ? "Requirement fulfilled" : "Requirement not fulfilled"}
                    className="w-5 h-5 accent-blue-500 cursor-not-allowed"
                    readOnly
                  />
                  <p className="font-semibold">{req.category}</p>
                </div>
                <span
                  className={`px-4 py-1 rounded-full border text-sm ${
                    req.completed ? "text-gray-600" : "text-gray-500"
                  }`}
                >
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {selectedReq && (
          <div className="w-full md:w-[450px] bg-white shadow-md rounded-xl p-5">
            <h2 className="text-xl font-semibold mb-2">{selectedReq.category}</h2>
            <p className="text-sm text-gray-500 mb-4">Courses that fulfill this requirement</p>
            <div className="flex flex-col gap-4 max-h-[150vh] overflow-y-auto pr-2">
              {selectedReq.courses.map((course, idx) => (
                <div key={idx} className="border rounded-xl p-3 hover:bg-gray-50 transition">
                  <p className="font-bold text-sm">
                    <span className="font-normal">{course.name || course.code}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
