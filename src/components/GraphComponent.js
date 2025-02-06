import React from 'react';
import { Graph } from 'react-d3-graph';

const CourseGraph = () => {
    const data = {
        nodes: [
            { id: "CSE 114", x: 400, y: 100 }, // Position of CSE 114
            { id: "CSE 214", x: 400, y: 200 }, // Position of CSE 214 
            { id: "CSE 215", x: 200, y: 600 },
            { id: "CSE 216", x: 200, y: 600 },
            { id: "CSE 220", x: 200, y: 300 },
            { id: "CSE 260", x: 200, y: 400 }

          // Additional courses...
        ],
        links: [
            { source: "CSE 114", target: "CSE 214" },
            { source: "CSE 214", target: "CSE 216" },
            { source: "CSE 260", target: "CSE 214"},

            // Additional prerequisite links...
        ]
    };

    const myConfig = {
        nodeHighlightBehavior: true,
        node: {
            color: 'lightgreen',
            size: 300,
            highlightStrokeColor: 'blue',
            labelProperty: 'id',
        },
        link: {
            highlightColor: 'lightblue',
            renderLabel: true,
        },
        directed: true,
        height: 800
    };

    return (
        <div>
            <h2>Course Prerequisites Graph</h2>
            <Graph
                id="course-graph"
                data={data}
                config={myConfig}
            />
        </div>
    );
};

export default CourseGraph;
