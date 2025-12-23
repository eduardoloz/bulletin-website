// Legend.js
import React, { useEffect, useState } from 'react';
import NodeInfo from './NodeInfo';

export default function Legend() {
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    const handler = (e) => setSelectedCourse(e?.detail?.course ?? null);
    window.addEventListener('course:selected', handler);
    return () => window.removeEventListener('course:selected', handler);
  }, []);

  // ✅ lower + slightly left (more centered in the whitespace)
  const wrapperStyle = {
    width: '450px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '305px',
    marginLeft: '-30px',  
  };

  const boxStyle = {
    backgroundColor: '#ffffffff',
    color: 'black',
    padding: '16px',
    borderRadius: '20px',
    boxShadow: '0 10px 20px rgba(224, 221, 221, 0.3)',
    fontFamily: 'sans-serif',
    width: '450px',
    height: '190px',
    border: '2px solid #000000ff',
  };

  const circleStyle = (color) => ({
    display: 'inline-block',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: color,
    marginRight: '8px',
    verticalAlign: 'middle',
  });

  const textStyle = { fontSize: '14px', marginBottom: '8px' };

  return (
    <div style={wrapperStyle}>
      <div style={boxStyle}>
        <h1 style={{ fontSize: '18px', marginBottom: '8px' }}>Legend</h1>
        <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Node Colors</h2>
        <h3 style={textStyle}>
          <span style={circleStyle('#CBD5E1')}></span>Untaken Course
        </h3>
        <h3 style={textStyle}>
          <span style={circleStyle('#34D399')}></span>Taken Course
        </h3>
        <h3 style={textStyle}>
          <span style={circleStyle('#60A5FA')}></span> Unlocked Course (you can take the course now)
        </h3>
      </div>

      <NodeInfo course={selectedCourse} />
    </div>
  );
}
