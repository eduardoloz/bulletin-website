// GraphComponent.js
import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
} from 'react';
import * as d3 from 'd3';
import courses from '../data/sbu_cse_courses_new_schema.json';
import CourseGraphProcessor from './CourseGraphProcessor';
import {
  buildCourseMap,
  buildCourseCodeMap,
  canTakeCourse,
  getAllPrerequisites
} from '../utils/courseUtils';
import { useUserProgress } from '../hooks/useUserProgress';

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
  /* ---------- one-time graph data ---------- */
  const processor   = useMemo(() => new CourseGraphProcessor(courses), []);
  const data        = useMemo(() => processor.processGraph(), [processor]);
  const courseMap   = useMemo(() => buildCourseMap(courses), []);
  const courseCodeMap = useMemo(() => buildCourseCodeMap(courses), []);

  /* ---------- User progress from database ---------- */
  const { progress, saving, save, isAuthenticated } = useUserProgress();

  /* ---------- React state ---------- */
  const [completedCourses, setCompletedCourses] = useState(new Set()); // IDs of completed courses
  const [externalCourses, setExternalCourses] = useState(new Set());   // External course codes
  const [selectedCourse,   setSelectedCourse]   = useState(null);      // Selected course ID
  const [mode,             setMode]             = useState('default'); // view mode
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
    if (mode === 'completed') {
      if (completedCourses.has(id)) return 'green';

      const course = courseMap[id];
      if (!course) return '#ccc';

      // Combine completed CSE courses with external courses
      const allCompletedIds = new Set([...completedCourses, ...getExternalCourseIds()]);

      // Check if course is available (prerequisites satisfied)
      if (canTakeCourse(course, allCompletedIds)) {
        return 'blue';
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

    return 'lightgreen'; // default
  };

  /* ---------- D3 setup ---------- */
  const setupSvg = sel =>
    sel.attr('viewBox', [0, 0, WIDTH, HEIGHT])
       .style('border', '1px solid #888')
       .style('background', '#f9f9f9');

  const setupDefs = sel => {
    const marker = sel.append('defs')
       .append('marker')
       .attr('id', 'arrow')
       .attr('viewBox', `0 ${-ARROW_SIZE} ${ARROW_SIZE} ${ARROW_SIZE * 2}`)
       .attr('refX', ARROW_SIZE)
       .attr('refY', 0)
       .attr('markerWidth',  ARROW_SIZE)
       .attr('markerHeight', ARROW_SIZE)
       .attr('orient', 'auto');

    marker.append('path')
       .attr('d', `M0,${-ARROW_SIZE} L${ARROW_SIZE},0 L0,${ARROW_SIZE} Z`)
       .attr('fill', '#999');
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
      .attr('marker-end', 'url(#arrow)');
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
    gSel.selectAll('g.node > circle')
        .attr('fill', d => colorFn(d.id));
    gSel.selectAll('g.node')
        .on('click', (_,d) => clickHandler(d.id));
  };

  /* ---------- D3 lifecycle ---------- */
  useEffect(() => {
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
  }, [data]);

  useEffect(() => {
    const handleNodeClick = id => {
      if (mode === 'completed') {
        toggleCompleted(id);
      } else {
        setSelectedCourse(id);
        const course = courseMap[id];
        if (onNodeClick && course) onNodeClick(course.code);
      }
    };

    updateGraphVisuals(gRef.current, nodeColor, handleNodeClick);
  }, [completedCourses, externalCourses, selectedCourse, mode, futureMode, data, onNodeClick, courseMap]);

  /* ---------- UI ---------- */

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-4xl border-2 border-gray-400 rounded-lg p-4">
        {/* Saving indicator */}
        {saving && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-blue-700 text-sm font-medium">Saving your progress...</span>
          </div>
        )}

        <h2 className="text-xl font-bold mb-2">Course Prerequisites Graph</h2>

        <div className="text-lg font-semibold my-2">
          Current Mode:&nbsp;
          <span className="text-blue-500">
            {mode === 'completed'
              ? (futureMode ? 'Completed + Future' : 'Completed')
              : mode === 'prereqs'
                ? 'Prereqs'
                : selectedCourse
                  ? `Showing prereqs for ${courseMap[selectedCourse]?.code || selectedCourse}`
                  : 'Default'}
          </span>
        </div>
        {selectedCourse && mode === 'prereqs' &&
          <div className="text-sm text-gray-600 mb-4">
            Click background or switch mode to clear selection.
          </div>}

        {/* ---------- External Courses Management ---------- */}
        {mode === 'completed' && (
          <div className="mb-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">External Courses (AMS, MAT, etc.)</h3>
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
            <p className="text-sm text-gray-600 mt-1">
              Add courses from other departments (Math, Physics, etc.) that you've completed.
            </p>
          </div>
        )}

        {/* ---------- buttons ---------- */}
        <div className="flex flex-wrap gap-4 my-4 justify-center">
          <button
            onClick={() => { setMode('completed'); setSelectedCourse(null); }}
            className={`px-4 py-2 rounded text-white
                        ${mode === 'completed' ? 'bg-green-700' : 'bg-green-500'}`}>
            Completed Mode
          </button>

          {mode === 'completed' &&
            <button
              onClick={() => setFutureMode(f => !f)}
              className={`px-4 py-2 rounded text-white
                          ${futureMode ? 'bg-purple-700' : 'bg-purple-500'}`}>
              Future Mode
            </button>}

          <button
            onClick={() => setMode('prereqs')}
            className={`px-4 py-2 rounded text-white
                        ${mode === 'prereqs' ? 'bg-orange-700' : 'bg-orange-500'}`}>
            Prereqs Mode
          </button>
        </div>

        {/* ---------- graph ---------- */}
        <svg ref={svgRef} width="100%" height={HEIGHT} />
      </div>
    </div>
  );
}
