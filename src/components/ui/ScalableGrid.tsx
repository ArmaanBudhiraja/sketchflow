import { useState } from "react";

export default function ScalableGrid() {
  const [scale, setScale] = useState(1);

  return (
    <div
      onWheel={(e) => {
        e.preventDefault();
        setScale(s => Math.min(3, Math.max(0.5, s + e.deltaY * -0.001)));
      }}
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#0b0b0b",
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)
        `,
        backgroundSize: `
          ${20 * scale}px ${20 * scale}px,
          ${20 * scale}px ${20 * scale}px,
          ${100 * scale}px ${100 * scale}px,
          ${100 * scale}px ${100 * scale}px
        `
      }}
    />
  );
}
