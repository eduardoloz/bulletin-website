// CourseGraph.js
import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import courses from '../data/cse.json';
import CourseGraphProcessor from './CourseGraphProcessor'; // keep path

const WIDTH  = 960;   // SVG viewport
const HEIGHT = 800;
const RADIUS = 18;    // node circle size

export default function CourseGraph() {
  const processor = new CourseGraphProcessor(courses);
  const [completedCourses, setCompletedCourses] = useState(new Set());
  const [selectedCourse, setSelectedCourse]   = useState(null);
  const [mode, setMode]                       = useState('default'); // 'completed' | 'prereqs' | 'default'
  const [futureMode, setFutureMode]           = useState(false);

  const svgRef  = useRef(null);
  const gRef    = useRef(null);               // <g> that is zoomed / panned
  const simRef  = useRef(null);               // d3.forceSimulation

  // Build static graph structure only once
  const data = processor.processGraph();
  console.log('Graph data:', data);

  /* ---------- helpers ---------- */
  const toggleCompleted = id =>
    setCompletedCourses(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const resetGraph = () => {
    setCompletedCourses(new Set());
    setSelectedCourse(null);
    setMode('default');
  };

  const getAllPrerequisites = (id, visited = new Set()) => {
    if (visited.has(id)) return visited;
    visited.add(id);
    (processor.courseMap[id]?.prerequisite || [])
      .forEach(p => getAllPrerequisites(p, visited));
    return visited;
  };

  const nodeColor = id => {
    if (mode === 'completed') {
      if (completedCourses.has(id)) return 'green';

      // first‑generation unlocks
      const unlocked = new Set();
      data.links.forEach(l => completedCourses.has(l.source) && unlocked.add(l.target));

      if (unlocked.has(id)) return 'blue';

      if (futureMode) {
        const future = new Set();
        data.links.forEach(l => unlocked.has(l.source) && future.add(l.target));
        return future.has(id) ? 'purple' : '#ccc';
      }
      return '#ccc';
    }
    if (mode === 'prereqs' && selectedCourse) {
      return getAllPrerequisites(selectedCourse).has(id) ? 'orange' : '#eee';
    }
    return 'lightgreen';
  };

  /* ---------- initial scene & zoom ---------- */
  useEffect(() => {
    const svg = d3.select(svgRef.current)
                  .attr('viewBox', [0, 0, WIDTH, HEIGHT]);

    // single <g> that moves under zoom
    const g = svg.append('g').attr('pointer-events', 'all');
    gRef.current = g;

    // zoom/pan handler (event is first param in v6+)
    svg.call(
      d3.zoom()
        .scaleExtent([0.25, 4])
        .on('zoom', (event) => g.attr('transform', event.transform))
    );

    // lines behind nodes
    g.append('g').attr('class', 'links');
    g.append('g').attr('class', 'nodes');

    return () => svg.selectAll('*').remove();
  }, []);

  /* ---------- (re)draw graph whenever state changes ---------- */
  useEffect(() => {
    if (!gRef.current) return;
    /* ---------- give every node a starting spot ---------- */

    const g = gRef.current;
    const linkG = g.select('.links');
    const nodeG = g.select('.nodes');

    /* data join — LINKS */
    const linksSel = linkG.selectAll('line')
      .data(data.links, d => `${d.source}->${d.target}`);

    linksSel.exit().remove();
    linksSel.enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrow)');

    /* data join — NODES */
    const nodesSel = nodeG.selectAll('g.node')
      .data(data.nodes, d => d.id);

    const nodesEnter = nodesSel.enter().append('g')
      .attr('class', 'node')
      .call(d3.drag()                        // drag behaviour
        .on('start', dragstarted)
        .on('drag',  dragged)
        .on('end',   dragended));

    nodesEnter.append('circle').attr('r', RADIUS);
    nodesEnter.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 4)
      .attr('font-size', 10)
      .text(d => d.id);

    nodesSel.exit().remove();

    /* put every node where its x/y already are */
    nodeG.selectAll('g.node')
      .attr('transform', d => `translate(${d.x},${d.y})`);



    // Update colors every render
    nodeG.selectAll('circle')
      .attr('fill', d => nodeColor(d.id))
      .attr('stroke', '#333')
      .attr('stroke-width', 1.5);

    /* ---------- simulation ---------- */
if (!simRef.current) {


  simRef.current = d3.forceSimulation(data.nodes)
    .force('link',
      d3.forceLink(data.links)
        .id(d => d.id)
        .distance(120)
    )
    .force('charge',
      d3.forceManyBody().strength(-300)
    )
    .force('center',
      d3.forceCenter(WIDTH / 2, HEIGHT / 2)
    )
    // 2) Prevent node overlap
    .force('collide',
      d3.forceCollide(RADIUS + 4)
    )
    .on('tick', ticked);

} else {
  // re‑bind the nodes array
  simRef.current.nodes(data.nodes);
  // re‑bind the links on the link‑force
  simRef.current.force('link').links(data.links);
  // bump alpha so the layout re‑runs visibly
  simRef.current.alpha(1);
  // kick the sim back into motion
  simRef.current.restart();
}




    /* ---------- helpers ---------- */
    function ticked() {
      linkG.selectAll('line')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodeG.selectAll('g.node')
        .attr('transform', d => `translate(${d.x},${d.y})`);
    }

    function dragstarted(event, d) {
      if (!event.active) simRef.current.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x; d.fy = event.y;
    }
    function dragended(event, d) {
      if (!event.active) simRef.current.alphaTarget(0);
      d.fx = null; d.fy = null;
    }
  }, [completedCourses, selectedCourse, mode, futureMode]);

  /* ---------- click handling ---------- */
  useEffect(() => {
    if (!gRef.current) return;
    
    gRef.current.selectAll('g.node')
      .on('click', (_, d) => {
        if (mode === 'completed') toggleCompleted(d.id);
        else setSelectedCourse(d.id);
      });
  }, [mode, completedCourses]);

  /* ---------- arrowhead defs ---------- */
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (svg.select('defs').empty()) {
      svg.append('defs').append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 22)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#999');
    }
  }, []);

  /* ---------- UI ---------- */
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-10">
      <div className="w-full max-w-4xl border-2 border-gray-400 rounded-lg p-10">
        <h2>Course Prerequisites Graph</h2>
        <div className="text-lg font-semibold my-2">
          Current Mode: <span className="text-blue-500">
            {mode === 'completed' ? (futureMode ? 'Completed + Future' : 'Completed')
                                   : mode === 'prereqs' ? 'Prereqs' : 'Default'}
          </span>
        </div>

        <div className="flex space-x-4 my-4">
          <button
            onClick={() => setMode('completed')}
            className={`px-4 py-2 ${mode === 'completed' ? 'bg-green-700' : 'bg-green-500'} text-white rounded`}>
            Completed Mode
          </button>

          {mode === 'completed' && (
            <button
              onClick={() => setFutureMode(f => !f)}
              className={`px-4 py-2 ${futureMode ? 'bg-purple-700' : 'bg-purple-500'} text-white rounded`}>
              Future Mode
            </button>
          )}

          <button
            onClick={() => setMode('prereqs')}
            className={`px-4 py-2 ${mode === 'prereqs' ? 'bg-orange-700' : 'bg-orange-500'} text-white rounded`}>
            Prereqs Mode
          </button>

          <button onClick={resetGraph}
                  className="px-4 py-2 bg-red-500 text-white rounded">
            Reset
          </button>
        </div>

        <svg
  ref={svgRef}
  width="100%"
  height={HEIGHT}
  style={{
    border: "1px solid #888",
    backgroundColor: "#f9f9f9",
  }}
/>

      </div>
    </div>
  );
}
