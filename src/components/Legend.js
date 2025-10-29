export default function Legend() {
  const boxStyle = {
    position: "absolute",
    bottom: "20px",
    right: "100px",
    backgroundColor: "#dcc5c5ff",
    color: "black",
    padding: "16px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(165, 40, 40, 0.3)",
    fontFamily: "sans-serif",
    width: "450px",
    height: "190px",
  };

  return (
    <div style={boxStyle}>
      <h1 style={{ fontSize: "18px", marginBottom: "8px" }}>Legend</h1>
    </div>
  );
}