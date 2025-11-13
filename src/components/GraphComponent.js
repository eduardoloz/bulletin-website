// GraphComponent.js
import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
} from 'react';
import * as d3 from 'd3';
import CourseGraphProcessor from './CourseGraphProcessor';
import {
  buildCourseMap,
  buildCourseCodeMap,
  canTakeCourse,
  getAllPrerequisites
} from '../utils/courseUtils';
import { useUserProgress } from '../hooks/useUserProgress';

// Dynamic course data loader
const loadCourseData = async (major) => {
  try {
    switch (major) {
      case 'CSE':
        return (await import('../data/courses/cse.json')).default;
      case 'AMS':
        return (await import('../data/courses/ams.json')).default;
      case 'ISE':
        return (await import('../data/courses/ise.json')).default;
      case 'EST':
        return (await import('../data/courses/est.json')).default;
      case 'MAT':
        return (await import('../data/courses/mat.json')).default;
      case 'BIO':
        return (await import('../data/courses/bio.json')).default;
      case 'PHY':
        return (await import('../data/courses/phy.json')).default;
      case 'CHE':
        return (await import('../data/courses/che.json')).default;
      default:
        return [];
    }
  } catch (error) {
    console.warn(`Course data not found for ${major}`);
    return [];
  }
};

/* ---------- constants ---------- */
const WIDTH        = 960;
const HEIGHT       = 800;
const NODE_RADIUS  = 28;
const ARROW_SIZE   = 10;

/**
 * Renders the prerequisite graph with D3.
 * Nodes are pre-laid out in centered rows by the processor; D3 forces
 * keep them on-grid while still allowing links, drag, zoom, etc.
 */
export default function CourseGraph({ onNodeClick }) {
  /* ---------- React state ---------- */
  const [courses, setCourses] = useState([]);
  const [selectedMajor, setSelectedMajor] = useState('CSE');
  const [loading, setLoading] = useState(true);

  /* ---------- Load courses based on selected major ---------- */
  useEffect(() => {
    const loadCourses = async () => {
      setLoading(true);
      const data = await loadCourseData(selectedMajor);
      setCourses(data);
      setLoading(false);
    };

    loadCourses();
  }, [selectedMajor]);

  /* ---------- one-time graph data (updates when courses change) ---------- */
  const processor   = useMemo(() => courses.length > 0 ? new CourseGraphProcessor(courses) : null, [courses]);
  const data        = useMemo(() => processor ? processor.processGraph() : { nodes: [], links: [] }, [processor]);
  const courseMap   = useMemo(() => buildCourseMap(courses), [courses]);
  const courseCodeMap = useMemo(() => buildCourseCodeMap(courses), [courses]);

  /* ---------- User progress from database ---------- */
  const { progress, saving, save, isAuthenticated } = useUserProgress();

  /* ---------- More React state ---------- */
  const [completedCourses, setCompletedCourses] = useState(new Set()); // IDs of completed courses
  const [externalCourses, setExternalCourses] = useState(new Set());   // External course codes
  const [selectedCourse,   setSelectedCourse]   = useState(null);      // Selected course ID
  const [mode,             setMode]             = useState('view');    // view mode: 'view', 'completed', 'prereqs'
  const [futureMode,       setFutureMode]       = useState(false);     // 2-hop

  // Sync local state with database on load
  useEffect(() => {
    if (progress) {
      setCompletedCourses(new Set(progress.completed_courses || []));
      setExternalCourses(new Set(progress.external_courses || []));
    }
  }, [progress]);

  /* ---------- D3 refs ---------- */
  const svgRef = useRef(null);
  const gRef   = useRef(null);
  const simRef = useRef(null);

  /* ---------- helpers with database persistence ---------- */
  const toggleCompleted = async (id) => {
    // Update local state immediately for fast UI response
    const newCompleted = new Set(completedCourses);
    newCompleted.has(id) ? newCompleted.delete(id) : newCompleted.add(id);
    setCompletedCourses(newCompleted);

    // Save to database in background (if authenticated)
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
        // Note: We don't revert the local state so the graph still works
        // even if the database table doesn't exist yet
      }
    }
  };

  const addExternalCourse = async (courseCode) => {
    const trimmed = courseCode.trim().toUpperCase();
    if (!trimmed) return;

    // Update local state immediately
    const newExternal = new Set([...externalCourses, trimmed]);
    setExternalCourses(newExternal);

    // Save to database in background (if authenticated)
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
        // Note: We don't revert the local state so the graph still works
        // even if the database table doesn't exist yet
      }
    }
  };

  const removeExternalCourse = async (courseCode) => {
    // Update local state immediately
    const newExternal = new Set(externalCourses);
    newExternal.delete(courseCode);
    setExternalCourses(newExternal);

    // Save to database in background (if authenticated)
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
        // Note: We don't revert the local state so the graph still works
        // even if the database table doesn't exist yet
      }
    }
  };

  // Get all prerequisite IDs for external courses that are in our course list
  const getExternalCourseIds = () => {
    const ids = new Set();
    externalCourses.forEach(code => {
      const course = courseCodeMap[code];
      if (course) ids.add(course.id);
    });
    return ids;
  };

  const nodeColor = id => {
    // View mode and completed mode use the same color logic
    if (mode === 'completed' || mode === 'view') {
      if (completedCourses.has(id)) return '#34D399';

      const course = courseMap[id];
      if (!course) return '#ccc';

      // Combine completed CSE courses with external courses
      const allCompletedIds = new Set([...completedCourses, ...getExternalCourseIds()]);

      // Check if course is available (prerequisites satisfied)
      if (canTakeCourse(course, allCompletedIds)) {
        return '#60A5FA';
      }

      if (futureMode) {
        // Find all currently available courses
        const currentlyAvailable = new Set();
        Object.values(courseMap).forEach(c => {
          if (!completedCourses.has(c.id) && canTakeCourse(c, allCompletedIds)) {
            currentlyAvailable.add(c.id);
          }
        });

        // Find courses available after completing all currently available courses
        const hypotheticalCompleted = new Set([...allCompletedIds, ...currentlyAvailable]);
        if (canTakeCourse(course, hypotheticalCompleted)) {
          return 'purple';
        }
      }

      return '#ccc';
    }

    if (mode === 'prereqs' && selectedCourse) {
      return getAllPrerequisites(selectedCourse, courseMap).has(id) ? 'orange' : '#eee';
    }

    // Default fallback
    return '#ccc';
  };

  /* ---------- D3 setup ---------- */
  const setupSvg = sel =>
    sel.attr('viewBox', [0, 0, WIDTH, HEIGHT])
       .style('border', '1px solid #888')
       .style('background', '#f9f9f9');

  const setupDefs = sel => {
    const defs = sel.append('defs');

    // Default gray arrow
    const markerDefault = defs.append('marker')
       .attr('id', 'arrow-default')
       .attr('viewBox', `0 ${-ARROW_SIZE} ${ARROW_SIZE} ${ARROW_SIZE * 2}`)
       .attr('refX', ARROW_SIZE)
       .attr('refY', 0)
       .attr('markerWidth',  ARROW_SIZE)
       .attr('markerHeight', ARROW_SIZE)
       .attr('orient', 'auto');
    markerDefault.append('path')
       .attr('d', `M0,${-ARROW_SIZE} L${ARROW_SIZE},0 L0,${ARROW_SIZE} Z`)
       .attr('fill', '#999');

    // Orange arrow for prereqs
    const markerOrange = defs.append('marker')
       .attr('id', 'arrow-orange')
       .attr('viewBox', `0 ${-ARROW_SIZE} ${ARROW_SIZE} ${ARROW_SIZE * 2}`)
       .attr('refX', ARROW_SIZE)
       .attr('refY', 0)
       .attr('markerWidth',  ARROW_SIZE)
       .attr('markerHeight', ARROW_SIZE)
       .attr('orient', 'auto');
    markerOrange.append('path')
       .attr('d', `M0,${-ARROW_SIZE} L${ARROW_SIZE},0 L0,${ARROW_SIZE} Z`)
       .attr('fill', '#f97316');

    // Green arrow for completed path
    const markerGreen = defs.append('marker')
       .attr('id', 'arrow-green')
       .attr('viewBox', `0 ${-ARROW_SIZE} ${ARROW_SIZE} ${ARROW_SIZE * 2}`)
       .attr('refX', ARROW_SIZE)
       .attr('refY', 0)
       .attr('markerWidth',  ARROW_SIZE)
       .attr('markerHeight', ARROW_SIZE)
       .attr('orient', 'auto');
    markerGreen.append('path')
       .attr('d', `M0,${-ARROW_SIZE} L${ARROW_SIZE},0 L0,${ARROW_SIZE} Z`)
       .attr('fill', '#34D399');

    // Blue arrow for available courses
    const markerBlue = defs.append('marker')
       .attr('id', 'arrow-blue')
       .attr('viewBox', `0 ${-ARROW_SIZE} ${ARROW_SIZE} ${ARROW_SIZE * 2}`)
       .attr('refX', ARROW_SIZE)
       .attr('refY', 0)
       .attr('markerWidth',  ARROW_SIZE)
       .attr('markerHeight', ARROW_SIZE)
       .attr('orient', 'auto');
    markerBlue.append('path')
       .attr('d', `M0,${-ARROW_SIZE} L${ARROW_SIZE},0 L0,${ARROW_SIZE} Z`)
       .attr('fill', '#60A5FA');
  };

  const setupZoom = (svgSel, gSel) =>
    svgSel.call(
      d3.zoom()
        .scaleExtent([0.25, 4])
        .on('zoom', e => gSel.attr('transform', e.transform)),
    );

  const setupStaticElements = (linkG, nodeG, graphData) => {
    /* ----- nodes ----- */
    const nodeEnter = nodeG.selectAll('g.node')
      .data(graphData.nodes, d => d.id)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call( d3.drag()
              .on('start', (e,d) => dragstarted(e,d, simRef.current))
              .on('drag',  (e,d) => dragged(e,d))
              .on('end',   (e,d) => dragended(e,d, simRef.current)) );

    nodeEnter.append('circle')
      .attr('r', NODE_RADIUS)
      .attr('stroke', '#333')
      .attr('stroke-width', 1.5);

    nodeEnter.append('text')
      .attr('y', 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .text(d => d.code);

    /* ----- links ----- */
    linkG.selectAll('line')
      .data(
        graphData.links,
        d => `${typeof d.source === 'object' ? d.source.id : d.source}`
           + `->${typeof d.target === 'object' ? d.target.id : d.target}`,
      )
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrow-default)');
  };

  const setupForceSimulation = (graphData, linkG, nodeG) => {
    // Freeze every node at its pre-laid-out (x,y) position
    graphData.nodes.forEach(d => { d.fx = d.x; d.fy = d.y; });

    const sim = d3.forceSimulation(graphData.nodes)
      .force('x',      d3.forceX(d => d.x).strength(1))
      .force('y',      d3.forceY(d => d.y).strength(1))
      .force('link',   d3.forceLink(graphData.links)
                         .id(d => d.id)
                         .distance(90)
                         .strength(0.7))
      .force('collide', d3.forceCollide(NODE_RADIUS + 4))
      .alpha(1)
      .alphaDecay(0.08)
      .on('tick', () => ticked(linkG, nodeG));

    return sim;
  };

  const ticked = (linkG, nodeG) => {
    linkG.selectAll('line')
      .each(function(d) {
        const dx   = d.target.x - d.source.x;
        const dy   = d.target.y - d.source.y;
        const dist = Math.hypot(dx, dy);
        const nx   = dx / dist, ny = dy / dist;

        const tX = d.target.x - nx * NODE_RADIUS;
        const tY = d.target.y - ny * NODE_RADIUS;

        d3.select(this)
          .attr('x1', d.source.x)
          .attr('y1', d.source.y)
          .attr('x2', tX)
          .attr('y2', tY);
      });

    nodeG.selectAll('g.node')
         .attr('transform', d => `translate(${d.x},${d.y})`);
  };

  /* ---------- drag helpers ---------- */
  const dragstarted = (e,d,sim) => {
    if (!e.active) sim.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
  };
  const dragged = (e,d) => {
    d.fx = e.x; d.fy = e.y;
  };
  const dragended = (e,d,sim) => {
    if (!e.active) sim.alphaTarget(0);
    d.fx = d.x;
    d.fy = d.y;
  };

  const updateGraphVisuals = (gSel, colorFn, clickHandler) => {
    if (!gSel) return;

    // Update node colors
    gSel.selectAll('g.node > circle')
        .attr('fill', d => colorFn(d.id));

    // Update node click handlers
    gSel.selectAll('g.node')
        .on('click', (_,d) => clickHandler(d.id));

    // Update link colors, opacity, stroke-dasharray, and markers based on mode
    gSel.selectAll('.links line')
        .attr('stroke', d => {
          if (mode === 'prereqs' && selectedCourse) {
            const prereqIds = getAllPrerequisites(selectedCourse, courseMap);
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;
            if (prereqIds.has(sourceId) && prereqIds.has(targetId)) {
              return '#f97316'; // Orange
            }
          }

          // In view/completed mode
          if ((mode === 'view' || mode === 'completed') && completedCourses) {
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;

            // Green for completed path
            if (completedCourses.has(sourceId) && completedCourses.has(targetId)) {
              return '#34D399';
            }

            // Blue for arrows leading to available courses
            const targetCourse = courseMap[targetId];
            if (targetCourse && !completedCourses.has(targetId)) {
              const allCompletedIds = new Set([...completedCourses, ...getExternalCourseIds()]);
              if (canTakeCourse(targetCourse, allCompletedIds) && completedCourses.has(sourceId)) {
                return '#60A5FA'; // Blue for available course connections
              }
            }
          }

          return '#999'; // Default gray
        })
        .attr('stroke-opacity', d => {
          if (mode === 'prereqs' && selectedCourse) {
            const prereqIds = getAllPrerequisites(selectedCourse, courseMap);
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;
            if (prereqIds.has(sourceId) && prereqIds.has(targetId)) {
              return 1; // Full opacity for relevant arrows
            }
            return 0.15; // Fade out non-relevant arrows
          }

          // In view/completed mode
          if ((mode === 'view' || mode === 'completed') && completedCourses) {
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;

            // Full opacity for completed path
            if (completedCourses.has(sourceId) && completedCourses.has(targetId)) {
              return 1;
            }

            // Full opacity for arrows to available courses
            const targetCourse = courseMap[targetId];
            if (targetCourse && !completedCourses.has(targetId)) {
              const allCompletedIds = new Set([...completedCourses, ...getExternalCourseIds()]);
              if (canTakeCourse(targetCourse, allCompletedIds) && completedCourses.has(sourceId)) {
                return 1; // Full opacity for available
              }
            }

            return 0.1; // Nearly invisible for non-completed connections
          }

          return 0.6; // Default opacity
        })
        .attr('stroke-dasharray', d => {
          // Dotted line for arrows leading to available courses
          if ((mode === 'view' || mode === 'completed') && completedCourses) {
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;
            const targetCourse = courseMap[targetId];

            if (targetCourse && !completedCourses.has(targetId)) {
              const allCompletedIds = new Set([...completedCourses, ...getExternalCourseIds()]);
              if (canTakeCourse(targetCourse, allCompletedIds) && completedCourses.has(sourceId)) {
                return '5,5'; // Dotted pattern
              }
            }
          }
          return null; // Solid line (default)
        })
        .attr('marker-end', d => {
          if (mode === 'prereqs' && selectedCourse) {
            const prereqIds = getAllPrerequisites(selectedCourse, courseMap);
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;
            if (prereqIds.has(sourceId) && prereqIds.has(targetId)) {
              return 'url(#arrow-orange)';
            }
          }

          // In view/completed mode
          if ((mode === 'view' || mode === 'completed') && completedCourses) {
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;

            // Green arrow for completed path
            if (completedCourses.has(sourceId) && completedCourses.has(targetId)) {
              return 'url(#arrow-green)';
            }

            // Blue arrow for available courses
            const targetCourse = courseMap[targetId];
            if (targetCourse && !completedCourses.has(targetId)) {
              const allCompletedIds = new Set([...completedCourses, ...getExternalCourseIds()]);
              if (canTakeCourse(targetCourse, allCompletedIds) && completedCourses.has(sourceId)) {
                return 'url(#arrow-blue)';
              }
            }
          }

          return 'url(#arrow-default)';
        });
  };

  /* ---------- D3 lifecycle ---------- */
  useEffect(() => {
    if (loading || !data.nodes || data.nodes.length === 0) {
      return;
    }

    const svg   = d3.select(svgRef.current);
    setupSvg(svg);
    setupDefs(svg);

    const g     = svg.append('g');
    const linkG = g.append('g').attr('class', 'links');
    const nodeG = g.append('g').attr('class', 'nodes');
    gRef.current = g;

    setupZoom(svg, g);
    setupStaticElements(linkG, nodeG, data);

    const sim = setupForceSimulation(data, linkG, nodeG);
    simRef.current = sim;

    return () => {
      sim.stop();
      svg.selectAll('*').remove();
    };
  }, [data, loading]);

  useEffect(() => {
    const handleNodeClick = id => {
      if (mode === 'completed') {
        toggleCompleted(id);
      } else if (mode === 'prereqs') {
        setSelectedCourse(id);
        const course = courseMap[id];
        if (onNodeClick && course) onNodeClick(course.code);
      } else if (mode === 'view') {
        // View mode: just show info, don't modify state
        const course = courseMap[id];
        if (onNodeClick && course) onNodeClick(course.code);
      }
    };

    updateGraphVisuals(gRef.current, nodeColor, handleNodeClick);
  }, [completedCourses, externalCourses, selectedCourse, mode, futureMode, data, onNodeClick, courseMap]);

  /* ---------- UI ---------- */

  return (
    <div className="flex flex-col min-h-screen p-4">
      <div className="w-full border-2 border-gray-400 rounded-lg p-4">
        {/* Loading indicator */}
        {loading && (
          <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded flex items-center gap-2">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
            <span className="text-gray-700 text-sm font-medium">Loading {selectedMajor} courses...</span>
          </div>
        )}

        {/* Saving indicator */}
        {saving && (
          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded flex items-center gap-2">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-blue-700 text-sm font-medium">Saving your progress...</span>
          </div>
        )}

        {/* Title and Mode Buttons in same row */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Course Prerequisites Graph</h2>

          <div className="flex items-center gap-4">
            {/* Major dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="major-select" className="text-sm font-medium text-gray-700">
                Major:
              </label>
              <select
                id="major-select"
                value={selectedMajor}
                onChange={(e) => setSelectedMajor(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CSE">CSE - Computer Science</option>
                <option value="AMS">AMS - Applied Math & Statistics</option>
                <option value="ISE">ISE - Information Systems</option>
                <option value="EST">EST - Engineering Science</option>
                <option value="MAT">MAT - Mathematics</option>
                <option value="BIO">BIO - Biology</option>
                <option value="PHY">PHY - Physics</option>
                <option value="CHE">CHE - Chemistry</option>
              </select>
            </div>

            {/* Mode buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setMode('view'); setSelectedCourse(null); setFutureMode(false); }}
                className={`px-3 py-1 rounded text-white text-sm
                            ${mode === 'view' ? 'bg-red-700' : 'bg-red-500'}`}>
                View Mode
              </button>

              <button
                onClick={() => { setMode('completed'); setSelectedCourse(null); }}
                className={`px-3 py-1 rounded text-white text-sm
                            ${mode === 'completed' ? 'bg-green-700' : 'bg-green-500'}`}>
                Completed Mode
              </button>

              {mode === 'completed' &&
                <button
                  onClick={() => setFutureMode(f => !f)}
                  className={`px-3 py-1 rounded text-white text-sm
                              ${futureMode ? 'bg-purple-700' : 'bg-purple-500'}`}>
                  Future Mode
                </button>}

              <button
                onClick={() => { setMode('prereqs'); setFutureMode(false); }}
                className={`px-3 py-1 rounded text-white text-sm
                            ${mode === 'prereqs' ? 'bg-orange-700' : 'bg-orange-500'}`}>
                Prereqs Mode
              </button>
            </div>
          </div>
        </div>

        {/* Mode-specific help text - compact */}
        {selectedCourse && mode === 'prereqs' &&
          <div className="text-xs text-gray-600 mb-2">
            Showing prerequisites for {courseMap[selectedCourse]?.code}. Click another course or switch mode to clear.
          </div>}
        {mode === 'view' &&
          <div className="text-xs text-gray-600 mb-2">
            Green = Completed | Blue = Available | Gray = Locked. Click to view details without modifying state.
          </div>}

        {/* ---------- External Courses Management ---------- */}
        {mode === 'completed' && (
          <div className="mb-2 p-3 bg-gray-100 rounded-lg">
            <h3 className="text-sm font-semibold mb-2">External Courses (AMS, MAT, etc.)</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {Array.from(externalCourses).map(course => (
                <span key={course} className="bg-blue-200 px-2 py-1 rounded text-sm">
                  {course}
                  <button
                    onClick={() => removeExternalCourse(course)}
                    className="ml-1 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., MAT 125, AMS 151"
                className="px-3 py-1 border rounded"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addExternalCourse(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = e.target.previousElementSibling;
                  addExternalCourse(input.value);
                  input.value = '';
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Add courses from other departments (Math, Physics, etc.) that you've completed.
            </p>
          </div>
        )}

        {/* ---------- graph ---------- */}
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: HEIGHT }}>
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mb-4"></div>
              <p className="text-gray-600">Loading {selectedMajor} course graph...</p>
            </div>
          </div>
        ) : courses.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height: HEIGHT }}>
            <div className="text-center">
              <p className="text-gray-600 text-lg">No courses available for {selectedMajor}</p>
              <p className="text-gray-500 text-sm mt-2">This major's course data hasn't been added yet.</p>
            </div>
          </div>
        ) : (
          <svg ref={svgRef} width="100%" height={HEIGHT} />
        )}
      </div>
    </div>
  );
}
