import "../../global.css";
import { useRef, useEffect, useState } from "react";
import Rulers from "./ui/Ruler";
import type { DiagramNode } from "./types/node";
import { SHAPE_REGISTRY } from "./shapes/Registry";

type BoardProps = {
  scale: number;
  offset: { x: number; y: number };
  setOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  nodes: DiagramNode[];
  setNodes: React.Dispatch<React.SetStateAction<DiagramNode[]>>;
};

const BASE_UNIT = 100;
const SMALL_UNIT = 20;
const NODE_SIZE = 120;

/* CHANGE 1: snap helper (WORLD SPACE) */
const snap = (value: number, gridSize: number) =>
  Math.round(value / gridSize) * gridSize;

export default function Board({
  scale,
  offset,
  setOffset,
  nodes,
  setNodes,
}: BoardProps) {
  /* ===================== REFS ===================== */
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  const draggingNodeId = useRef<string | null>(null);
  const dragStartScreen = useRef({ x: 0, y: 0 });
  const dragStartWorld = useRef({ x: 0, y: 0 });
  const liveNodePos = useRef<{ x: number; y: number } | null>(null);

  /* 🔥 CHANGE 2: force re-render during drag */
  const [, forceRender] = useState(0);

  /* ===================== NODE DRAG START ===================== */
  const onNodeMouseDown = (
    e: React.MouseEvent,
    nodeId: string,
    nodeX: number,
    nodeY: number
  ) => {
    e.stopPropagation();

    draggingNodeId.current = nodeId;
    dragStartScreen.current = { x: e.clientX, y: e.clientY };
    dragStartWorld.current = { x: nodeX, y: nodeY };
    liveNodePos.current = { x: nodeX, y: nodeY };
  };

  /* ===================== PAN START ===================== */
  const onGridMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    };
  };

  /* ===================== GLOBAL MOUSE MOVE / UP ===================== */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      /* ================= NODE DRAG ================= */
      if (draggingNodeId.current && liveNodePos.current) {
        const dx =
          (e.clientX - dragStartScreen.current.x) / scale;
        const dy =
          (e.clientY - dragStartScreen.current.y) / scale;

        /* 🔥 CHANGE 3: SNAP WHILE DRAGGING */
        const rawX = dragStartWorld.current.x + dx;
        const rawY = dragStartWorld.current.y + dy;

        liveNodePos.current = {
          x: snap(rawX, SMALL_UNIT),
          y: snap(rawY, SMALL_UNIT),
        };

        forceRender((v) => v + 1);
        return;
      }

      /* ================= CANVAS PAN ================= */
      if (!isPanning.current) return;

      setOffset({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
    };

    const handleMouseUp = () => {
      /* ================= COMMIT NODE DRAG ================= */
      if (draggingNodeId.current && liveNodePos.current) {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === draggingNodeId.current
              ? { ...n, ...liveNodePos.current! }
              : n
          )
        );
      }

      draggingNodeId.current = null;
      liveNodePos.current = null;
      isPanning.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [scale, setOffset, setNodes]);

  /* ===================== DROP FROM SIDEBAR ===================== */
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();

    const type = e.dataTransfer.getData("shape/type");
    if (!type) return;

    const rect = e.currentTarget.getBoundingClientRect();

    /* 🔥 CHANGE 4: SNAP ON DROP */
    const x = snap(
      (e.clientX - rect.left - offset.x) / scale,
      SMALL_UNIT
    );
    const y = snap(
      (e.clientY - rect.top - offset.y) / scale,
      SMALL_UNIT
    );

    setNodes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        x,
        y,
      },
    ]);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  /* ===================== RENDER ===================== */
  return (
    <div className="board-main">
      <Rulers scale={scale} offset={offset} />

      <div
        className="grid-layer"
        onMouseDown={onGridMouseDown}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        {/* GRID */}
        <div
          className="board-inside"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            "--small-grid": `${SMALL_UNIT * scale}px`,
            "--large-grid": `${BASE_UNIT * scale}px`,
          } as React.CSSProperties}
        />

        {/* NODES */}
        <div className="nodes-layer">
          {nodes.map((node) => {
            const Shape = SHAPE_REGISTRY[node.type];
            if (!Shape) return null;

            const isDragging =
              draggingNodeId.current === node.id &&
              liveNodePos.current;

            const pos = isDragging
              ? liveNodePos.current!
              : node;

            return (
              <div
                key={node.id}
                className="node"
                onMouseDown={(e) =>
                  onNodeMouseDown(e, node.id, node.x, node.y)
                }
                style={{
                  transform: `
                    translate(
                      ${pos.x * scale + offset.x}px,
                      ${pos.y * scale + offset.y}px
                    )
                    scale(${scale})
                  `,
                }}
              >
                <Shape size={NODE_SIZE} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
