import "../../global.css";
import Navbar from "../components/navbar";
import Sidebar from "../components/sidebar";
import Board from "../components/Board";
import type { DiagramNode } from "../components/types/node";
import { useState, useEffect } from "react";



const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const Page = () => {
  const [zoomIndex, setZoomIndex] = useState<number>(2); // 100%
   const [offset, setOffset] = useState({ x: 0, y: 0 });
   const [nodes, setNodes] = useState<DiagramNode[]>([]);

  const resetView = () => {
    setZoomIndex(2); // 100%
    setOffset({ x: 0, y: 0 });
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        resetView();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const zoomIn = () => {
    setZoomIndex((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1));
  };

  const zoomOut = () => {
    setZoomIndex((i) => Math.max(i - 1, 0));
  };

  const setZoomByValue = (value: number) => {
    const index = ZOOM_LEVELS.indexOf(value);
    if (index !== -1) setZoomIndex(index);
  };

  const scale = ZOOM_LEVELS[zoomIndex];
  return (
    <div>
      <Navbar 
        scale={scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomChange={setZoomByValue}
        onResetView={resetView}
      />
      <div className="page-center">
        <Sidebar />
        <hr className="sidebar-divider-line"/>
        <Board scale={scale} offset={offset} setOffset={setOffset} nodes={nodes} setNodes={setNodes}/>
      </div>
    </div>
  );
};

export default Page;


