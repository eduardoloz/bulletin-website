// CourseGraph.js
import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import courses from '../data/cse.json';
import CourseGraphProcessor from './CourseGraphProcessor'; // keep path

const WIDTH  = 960;   // SVG viewport
const HEIGHT = 800;
const RADIUS = 18;    // node circle size
const NODE_RADIUS = 28;     // was 18 — gives room for the label text
const ARROW_SIZE  = 6;      // new – overall “length” of the arrow head

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

      // first-generation unlocks
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

    /* ----- arrowhead defs: added EARLY and once ----- */
    svg.append('defs')
       .append('marker')
       .attr('id',          'arrow')
       .attr('markerUnits', 'strokeWidth')        // <- use strokeWidth here
       .attr('viewBox',     `0 ${-ARROW_SIZE} ${ARROW_SIZE*2} ${ARROW_SIZE*2}`)
       .attr('refX',        ARROW_SIZE)           // tip of the triangle
       .attr('refY',        0)
       .attr('markerWidth', ARROW_SIZE)
       .attr('markerHeight',ARROW_SIZE)
       .attr('orient',      'auto')
       .append('path')
       .attr('d', `M0,${-ARROW_SIZE} L${ARROW_SIZE},0 L0,${ARROW_SIZE} Z`)
       .attr('fill', '#999');
    

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

    const g      = gRef.current;
    const linkG  = g.select('.links');
    const nodeG  = g.select('.nodes');

    /* data join — LINKS */
    const linkKey = d => {
      const s = typeof d.source === 'object' ? d.source.id : d.source;
      const t = typeof d.target === 'object' ? d.target.id : d.target;
      return `${s}->${t}`;
    };
    const linksSel = linkG.selectAll('line').data(data.links, linkKey);

    // Remove any old links
    linksSel.exit().remove();

    // Enter new links
    linksSel.enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrow)');

    // Update existing links (ensure arrowhead is present after rebinds)
    linksSel
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

    nodesEnter.append('circle').attr('r', NODE_RADIUS);
    nodesEnter.append('text')
      .attr('y', 2)            // vertical centring inside the circle
      .attr('font-size', 11)   // readable but still fits
      .attr('text-anchor', 'middle')
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
    
    ticked(); // initial tick to position nodes

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
        .force('collide', d3.forceCollide(NODE_RADIUS + 4)        // prevent overlap
        )
        .on('tick', ticked);
    } else {
      simRef.current.nodes(data.nodes);
      simRef.current.force('link').links(data.links);
      simRef.current.alpha(1).restart();
    }

    /* ---------- helpers ---------- */
    function ticked() {
      /* --- shorten every link so arrowhead is not hidden --- */
      linkG.selectAll('line').each(function (d) {
        const dx   = d.target.x - d.source.x;
        const dy   = d.target.y - d.source.y;
        const dist = Math.hypot(dx, dy) || 1;          // avoid divide-by-zero
    
        // offset so the line starts/ends at the circle edge, not the centre
        const offX = (dx / dist) * (NODE_RADIUS + ARROW_SIZE);
        const offY = (dy / dist) * (NODE_RADIUS + ARROW_SIZE);        
    
        d3.select(this)
          .attr('x1', d.source.x + offX)               // just outside source circle
          .attr('y1', d.source.y + offY)
          .attr('x2', d.target.x - offX)               // just outside target circle
          .attr('y2', d.target.y - offY);
      });
    
      /* --- keep nodes where the simulation puts them --- */
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

  /* ---------- UI ---------- */
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-10">
      <div className="w-full max-w-4xl border-2 border-gray-400 rounded-lg p-10">
        <h2>Course Prerequisites Graph</h2>
        <div className="text-lg font-semibold my-2">
          Current Mode: <span className="text-blue-500">
            {mode === 'completed' ? (futureMode ? 'Completed + Future' : 'Completed')
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
