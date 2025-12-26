// BASIC SHAPES
export { Circle } from "./Circle";
export { Ellipse } from "./Ellipse";
export { Square } from "./Square";
export { RoundedSquare } from "./RoundedSquare";
export { Rectangle } from "./Rectangle";
export { RoundedRectangle } from "./RoundedRectangle";

// FLOWCHART CORE
export { Process } from "./Process";
export { Step } from "./Step";
export { Diamond } from "./Diamond";
export { Parallelogram } from "./Parallelogram";
export { Trapezoid } from "./Trapezoid";
export { Hexagon } from "./Hexagon";
export { Triangle } from "./Triangle";

// STORAGE / SYSTEM
export { Cylinder } from "./Cylinder";
export { DataStorage } from "./DataStorage";
export { InternalStorage } from "./InternalStorage";
export { Tape } from "./Tape";
export { Cloud } from "./Cloud";
export { Document } from "./Document";
export { Note } from "./Note";
export { Card } from "./Card";

// CONTAINERS
export { Container } from "./Container";
export { ContainerVertical } from "./ContainerVertical";
export { ContainerHorizontal } from "./ContainerHorizontal";
export { Cube } from "./Cube";

// UML / LOGIC
export { Actor } from "./Actor";
export { And } from "./And";
export { Or } from "./Or";
export { Callout } from "./Callout";

// LISTS
export { List } from "./List";
export { ListItem } from "./ListItem";

// LINES / CONNECTORS / ARROWS
export { Line } from "./Line";
export { DashedLine } from "./DashedLine";
export { DottedLine } from "./DottedLine";
export { Arrow } from "./Arrow";
export { CurvedArrow } from "./CurvedArrow";
export { BidirectionalArrow } from "./BidirectionalArrow";
export { Link } from "./Link";

/* ------------------------------------------------------------------ */
/* 🔥 SHAPE REGISTRY (for palette, hover name, search, drag, etc.) */
/* ------------------------------------------------------------------ */

import { Circle } from "./Circle";
import { Ellipse } from "./Ellipse";
import { Square } from "./Square";
import { RoundedSquare } from "./RoundedSquare";
import { Rectangle } from "./Rectangle";
import { RoundedRectangle } from "./RoundedRectangle";
import { Process } from "./Process";
import { Step } from "./Step";
import { Diamond } from "./Diamond";
import { Parallelogram } from "./Parallelogram";
import { Trapezoid } from "./Trapezoid";
import { Hexagon } from "./Hexagon";
import { Triangle } from "./Triangle";
import { Cylinder } from "./Cylinder";
import { DataStorage } from "./DataStorage";
import { InternalStorage } from "./InternalStorage";
import { Tape } from "./Tape";
import { Cloud } from "./Cloud";
import { Document } from "./Document";
import { Note } from "./Note";
import { Card } from "./Card";
import { Container } from "./Container";
import { ContainerVertical } from "./ContainerVertical";
import { ContainerHorizontal } from "./ContainerHorizontal";
import { Cube } from "./Cube";
import { Actor } from "./Actor";
import { And } from "./And";
import { Or } from "./Or";
import { Callout } from "./Callout";
import { List } from "./List";
import { ListItem } from "./ListItem";
import { Line } from "./Line";
import { DashedLine } from "./DashedLine";
import { DottedLine } from "./DottedLine";
import { Arrow } from "./Arrow";
import { CurvedArrow } from "./CurvedArrow";
import { BidirectionalArrow } from "./BidirectionalArrow";
import { Link } from "./Link";

export const SHAPES = [
  { name: "Circle", Component: Circle },
  { name: "Ellipse", Component: Ellipse },
  { name: "Square", Component: Square },
  { name: "Rounded Square", Component: RoundedSquare },
  { name: "Rectangle", Component: Rectangle },
  { name: "Rounded Rectangle", Component: RoundedRectangle },

  { name: "Process", Component: Process },
  { name: "Step", Component: Step },
  { name: "Decision", Component: Diamond },
  { name: "Parallelogram", Component: Parallelogram },
  { name: "Trapezoid", Component: Trapezoid },
  { name: "Hexagon", Component: Hexagon },
  { name: "Triangle", Component: Triangle },

  { name: "Cylinder (Database)", Component: Cylinder },
  { name: "Data Storage", Component: DataStorage },
  { name: "Internal Storage", Component: InternalStorage },
  { name: "Tape", Component: Tape },
  { name: "Cloud", Component: Cloud },
  { name: "Document", Component: Document },
  { name: "Note", Component: Note },
  { name: "Card", Component: Card },

  { name: "Container", Component: Container },
  { name: "Container (Vertical)", Component: ContainerVertical },
  { name: "Container (Horizontal)", Component: ContainerHorizontal },
  { name: "Cube", Component: Cube },

  { name: "Actor", Component: Actor },
  { name: "AND", Component: And },
  { name: "OR", Component: Or },
  { name: "Callout", Component: Callout },

  { name: "List", Component: List },
  { name: "List Item", Component: ListItem },

  { name: "Line", Component: Line },
  { name: "Dashed Line", Component: DashedLine },
  { name: "Dotted Line", Component: DottedLine },
  { name: "Arrow", Component: Arrow },
  { name: "Curved Arrow", Component: CurvedArrow },
  { name: "Bidirectional Arrow", Component: BidirectionalArrow },
  { name: "Link", Component: Link },
];
