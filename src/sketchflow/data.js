export const STORAGE_PREFIX = "sketchflow-diagram-";
export const MAX_HISTORY = 20;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const GRID_SIZE = 20;

export const FONT_FAMILIES = [
  "Avenir Next",
  "Georgia",
  "Verdana",
  "Trebuchet MS",
  "Courier New",
  "Times New Roman",
  "Arial",
];

export const LINE_STYLE_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
];

export const PATH_TYPE_OPTIONS = [
  { value: "straight", label: "Straight" },
  { value: "orthogonal", label: "Orthogonal" },
  { value: "curved", label: "Curved" },
];

export const ARROW_TYPE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "diamond", label: "Diamond" },
  { value: "circle", label: "Circle" },
];

export const LABEL_POSITION_OPTIONS = [
  { value: "start", label: "Start" },
  { value: "middle", label: "Middle" },
  { value: "end", label: "End" },
];

export const CATEGORY_OPTIONS = ["All", "General", "Flowchart", "UML", "ERD", "Network", "Sequence"];

function defineShape(id, name, category, primitive, options = {}) {
  return {
    id,
    name,
    category,
    primitive,
    defaultWidth: options.defaultWidth ?? 160,
    defaultHeight: options.defaultHeight ?? 96,
    defaultLabel: options.defaultLabel ?? name,
    description: options.description ?? `${name} diagram element`,
    accent: options.accent ?? "#111111",
  };
}

export const SHAPE_DEFINITIONS = [
  defineShape("rectangle", "Rectangle", "General", "rectangle"),
  defineShape("rounded-rectangle", "Rounded Rectangle", "General", "rounded"),
  defineShape("circle", "Circle", "General", "circle", { defaultWidth: 120, defaultHeight: 120 }),
  defineShape("ellipse", "Ellipse", "General", "ellipse", { defaultWidth: 180, defaultHeight: 110 }),
  defineShape("diamond", "Diamond", "General", "diamond", { defaultWidth: 150, defaultHeight: 110 }),
  defineShape("hexagon", "Hexagon", "General", "hexagon"),
  defineShape("triangle", "Triangle", "General", "triangle", { defaultWidth: 150, defaultHeight: 120 }),
  defineShape("parallelogram", "Parallelogram", "General", "parallelogram"),
  defineShape("note", "Note", "General", "note"),
  defineShape("document", "Document", "General", "document"),
  defineShape("cylinder", "Cylinder", "General", "cylinder"),
  defineShape("cloud", "Cloud", "General", "cloud", { defaultWidth: 180, defaultHeight: 118 }),

  defineShape("process", "Process", "Flowchart", "rectangle"),
  defineShape("terminator", "Terminator", "Flowchart", "terminator", { defaultWidth: 180, defaultHeight: 86 }),
  defineShape("decision", "Decision", "Flowchart", "diamond", { defaultWidth: 170, defaultHeight: 120 }),
  defineShape("data", "Data", "Flowchart", "parallelogram"),
  defineShape("predefined-process", "Predefined Process", "Flowchart", "double-rectangle"),
  defineShape("document-flow", "Flow Document", "Flowchart", "document"),
  defineShape("manual-input", "Manual Input", "Flowchart", "manual-input"),
  defineShape("manual-operation", "Manual Operation", "Flowchart", "trapezoid"),
  defineShape("display", "Display", "Flowchart", "display"),
  defineShape("delay", "Delay", "Flowchart", "delay"),
  defineShape("preparation", "Preparation", "Flowchart", "hexagon"),
  defineShape("stored-data", "Stored Data", "Flowchart", "cylinder"),

  defineShape("uml-class", "UML Class", "UML", "class-box", { defaultHeight: 126, defaultLabel: "ClassName" }),
  defineShape("abstract-class", "Abstract Class", "UML", "class-box", { defaultHeight: 126, defaultLabel: "AbstractClass" }),
  defineShape("interface", "Interface", "UML", "class-box", { defaultHeight: 126, defaultLabel: "IService" }),
  defineShape("object", "Object", "UML", "object-box", { defaultHeight: 112, defaultLabel: "order:Order" }),
  defineShape("actor", "Actor", "UML", "actor", { defaultWidth: 120, defaultHeight: 160, defaultLabel: "Actor" }),
  defineShape("use-case", "Use Case", "UML", "ellipse", { defaultWidth: 190, defaultHeight: 108, defaultLabel: "Use Case" }),
  defineShape("package", "Package", "UML", "package"),
  defineShape("component", "Component", "UML", "component"),
  defineShape("node", "Node", "UML", "node"),
  defineShape("artifact", "Artifact", "UML", "note"),
  defineShape("uml-note", "UML Note", "UML", "note"),
  defineShape("lifeline", "Lifeline", "UML", "lifeline", { defaultWidth: 132, defaultHeight: 220, defaultLabel: "Participant" }),

  defineShape("entity", "Entity", "ERD", "rectangle", { defaultLabel: "Entity" }),
  defineShape("weak-entity", "Weak Entity", "ERD", "double-rectangle", { defaultLabel: "Weak Entity" }),
  defineShape("relationship", "Relationship", "ERD", "diamond", { defaultLabel: "Relates" }),
  defineShape("identifying-relationship", "Identifying Relationship", "ERD", "double-diamond", { defaultLabel: "Identifies" }),
  defineShape("attribute", "Attribute", "ERD", "ellipse", { defaultWidth: 170, defaultHeight: 88, defaultLabel: "attribute" }),
  defineShape("key-attribute", "Key Attribute", "ERD", "ellipse", { defaultWidth: 170, defaultHeight: 88, defaultLabel: "id" }),
  defineShape("multivalued-attribute", "Multivalued Attribute", "ERD", "double-ellipse", { defaultWidth: 176, defaultHeight: 94, defaultLabel: "phone" }),
  defineShape("derived-attribute", "Derived Attribute", "ERD", "derived-ellipse", { defaultWidth: 176, defaultHeight: 94, defaultLabel: "age" }),
  defineShape("associative-entity", "Associative Entity", "ERD", "rounded"),
  defineShape("cardinality-label", "Cardinality Label", "ERD", "note", { defaultWidth: 120, defaultHeight: 60, defaultLabel: "1..*" }),

  defineShape("server", "Server", "Network", "server"),
  defineShape("database-server", "Database Server", "Network", "database"),
  defineShape("laptop", "Laptop", "Network", "laptop", { defaultWidth: 170, defaultHeight: 112 }),
  defineShape("desktop", "Desktop", "Network", "desktop", { defaultWidth: 170, defaultHeight: 116 }),
  defineShape("router", "Router", "Network", "router", { defaultWidth: 136, defaultHeight: 136 }),
  defineShape("switch", "Switch", "Network", "switch", { defaultWidth: 166, defaultHeight: 98 }),
  defineShape("firewall", "Firewall", "Network", "firewall"),
  defineShape("cloud-service", "Cloud Service", "Network", "cloud", { defaultLabel: "Cloud" }),
  defineShape("load-balancer", "Load Balancer", "Network", "rounded"),
  defineShape("api-gateway", "API Gateway", "Network", "hexagon"),
  defineShape("storage-array", "Storage Array", "Network", "cylinder"),
  defineShape("mobile-device", "Mobile Device", "Network", "phone", { defaultWidth: 120, defaultHeight: 174 }),

  defineShape("participant", "Participant", "Sequence", "lifeline", { defaultWidth: 132, defaultHeight: 230 }),
  defineShape("boundary", "Boundary", "Sequence", "rounded", { defaultLabel: "Boundary" }),
  defineShape("controller", "Controller", "Sequence", "class-box", { defaultHeight: 118, defaultLabel: "Controller" }),
  defineShape("service", "Service", "Sequence", "class-box", { defaultHeight: 118, defaultLabel: "Service" }),
  defineShape("queue", "Queue", "Sequence", "cylinder", { defaultLabel: "Queue" }),
  defineShape("message-card", "Message Card", "Sequence", "note", { defaultWidth: 140, defaultHeight: 74, defaultLabel: "request()" }),
];

const SHAPE_DEFINITION_MAP = new Map(SHAPE_DEFINITIONS.map((shape) => [shape.id, shape]));

export const TEMPLATE_OPTIONS = [
  { id: "blank", name: "Blank Diagram", description: "Start from an empty canvas." },
  { id: "flowchart", name: "Flowchart", description: "Classic start, process, decision, and end flow." },
  { id: "uml", name: "UML Class Diagram", description: "Service and domain classes with associations." },
  { id: "erd", name: "ER Diagram", description: "Entities, attributes, and relationships." },
  { id: "network", name: "Network Diagram", description: "Devices and infrastructure connections." },
  { id: "sequence", name: "Sequence Diagram", description: "Participants, services, and message flow." },
];

function createBaseShape() {
  return {
    id: createId("shape"),
    x: 80,
    y: 80,
    width: 160,
    height: 96,
    rotation: 0,
    label: "Element",
    fill: "#ffffff",
    fillOpacity: 1,
    stroke: "#111111",
    strokeWidth: 2,
    lineStyle: "solid",
    fontFamily: FONT_FAMILIES[0],
    fontSize: 15,
    fontColor: "#111111",
    fontWeight: 600,
    fontStyle: "normal",
    textDecoration: "none",
    textAlign: "center",
    visible: true,
    locked: false,
    zIndex: 1,
    groupId: null,
    notes: "",
  };
}

function createBaseConnector() {
  return {
    id: createId("connector"),
    fromId: "",
    toId: "",
    label: "",
    labelPosition: "middle",
    pathType: "orthogonal",
    lineColor: "#111111",
    lineWidth: 2,
    lineStyle: "solid",
    lineOpacity: 1,
    startArrow: "none",
    endArrow: "closed",
    fontFamily: FONT_FAMILIES[0],
    fontSize: 14,
    fontColor: "#111111",
    visible: true,
    locked: false,
    zIndex: 0,
  };
}

export function createId(prefix = "id") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

export function deepClone(value) {
  return structuredClone(value);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function snapValue(value, enabled) {
  if (!enabled) {
    return value;
  }

  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function getShapeDefinition(typeId) {
  return SHAPE_DEFINITION_MAP.get(typeId) ?? SHAPE_DEFINITION_MAP.get("rectangle");
}

export function createShapeFromDefinition(typeId, point = {}, overrides = {}) {
  const definition = getShapeDefinition(typeId);

  return {
    ...createBaseShape(),
    id: overrides.id ?? createId("shape"),
    typeId: definition.id,
    category: definition.category,
    primitive: definition.primitive,
    width: overrides.width ?? definition.defaultWidth,
    height: overrides.height ?? definition.defaultHeight,
    x: point.x ?? overrides.x ?? 80,
    y: point.y ?? overrides.y ?? 80,
    label: overrides.label ?? definition.defaultLabel,
    fill: overrides.fill ?? "#ffffff",
    stroke: overrides.stroke ?? "#111111",
    accent: definition.accent,
    ...overrides,
  };
}

export function createConnector(fromId, toId, overrides = {}) {
  return {
    ...createBaseConnector(),
    id: overrides.id ?? createId("connector"),
    fromId,
    toId,
    ...overrides,
  };
}

export function createEmptyDiagram(overrides = {}) {
  const now = new Date().toISOString();

  return {
    id: overrides.id ?? createId("diagram"),
    title: overrides.title ?? "Untitled SketchFlow",
    description: overrides.description ?? "",
    width: overrides.width ?? 1600,
    height: overrides.height ?? 1000,
    background: overrides.background ?? "#ffffff",
    showGrid: overrides.showGrid ?? true,
    snapToGrid: overrides.snapToGrid ?? false,
    zoomRecommendation: overrides.zoomRecommendation ?? 1,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    savedAt: overrides.savedAt ?? null,
    shapes: overrides.shapes ?? [],
    connectors: overrides.connectors ?? [],
  };
}

export function normalizeDiagram(rawDiagram) {
  const raw = rawDiagram ?? {};
  const base = createEmptyDiagram(raw);

  const shapes = Array.isArray(raw.shapes)
    ? raw.shapes.map((shape) => ({
        ...createShapeFromDefinition(shape.typeId ?? "rectangle", shape, { id: shape.id }),
        ...shape,
        visible: shape.visible ?? true,
        locked: shape.locked ?? false,
        fillOpacity: shape.fillOpacity ?? 1,
        lineStyle: shape.lineStyle ?? "solid",
        fontFamily: shape.fontFamily ?? FONT_FAMILIES[0],
        fontWeight: shape.fontWeight ?? 600,
        fontStyle: shape.fontStyle ?? "normal",
        textDecoration: shape.textDecoration ?? "none",
        textAlign: shape.textAlign ?? "center",
        zIndex: shape.zIndex ?? 1,
      }))
    : [];

  const connectors = Array.isArray(raw.connectors)
    ? raw.connectors.map((connector) => ({
        ...createBaseConnector(),
        ...connector,
        visible: connector.visible ?? true,
        locked: connector.locked ?? false,
        pathType: connector.pathType ?? "orthogonal",
        lineStyle: connector.lineStyle ?? "solid",
        startArrow: connector.startArrow ?? "none",
        endArrow: connector.endArrow ?? "closed",
        labelPosition: connector.labelPosition ?? "middle",
        lineOpacity: connector.lineOpacity ?? 1,
        fontFamily: connector.fontFamily ?? FONT_FAMILIES[0],
      }))
    : [];

  return {
    ...base,
    ...raw,
    shapes: shapes.sort((left, right) => left.zIndex - right.zIndex),
    connectors: connectors.sort((left, right) => left.zIndex - right.zIndex),
  };
}

export function formatTimestamp(value) {
  if (!value) {
    return "Not saved";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getLineDash(style) {
  if (style === "dashed") {
    return "10 7";
  }

  if (style === "dotted") {
    return "2 7";
  }

  return "";
}

export function getShapeCenter(shape) {
  return {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2,
  };
}

function getAxisIntersection(shape, target) {
  const center = getShapeCenter(shape);
  const dx = target.x - center.x;
  const dy = target.y - center.y;

  if (dx === 0 && dy === 0) {
    return center;
  }

  const halfWidth = shape.width / 2;
  const halfHeight = shape.height / 2;
  const scale = Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight);

  return {
    x: center.x + dx / scale,
    y: center.y + dy / scale,
  };
}

function getEllipseIntersection(shape, target) {
  const center = getShapeCenter(shape);
  const rx = shape.width / 2;
  const ry = shape.height / 2;
  const dx = target.x - center.x;
  const dy = target.y - center.y;

  if (dx === 0 && dy === 0) {
    return center;
  }

  const angle = Math.atan2(dy, dx);

  return {
    x: center.x + Math.cos(angle) * rx,
    y: center.y + Math.sin(angle) * ry,
  };
}

export function getConnectionPoint(shape, target) {
  const primitive = getShapeDefinition(shape.typeId).primitive;

  if (primitive === "circle" || primitive === "ellipse" || primitive === "derived-ellipse" || primitive === "double-ellipse") {
    return getEllipseIntersection(shape, target);
  }

  return getAxisIntersection(shape, target);
}

export function getConnectorGeometry(diagram, connector) {
  const fromShape = diagram.shapes.find((shape) => shape.id === connector.fromId);
  const toShape = diagram.shapes.find((shape) => shape.id === connector.toId);

  if (!fromShape || !toShape) {
    return null;
  }

  const fromCenter = getShapeCenter(fromShape);
  const toCenter = getShapeCenter(toShape);
  const start = getConnectionPoint(fromShape, toCenter);
  const end = getConnectionPoint(toShape, fromCenter);

  let points = [start, end];

  if (connector.pathType === "orthogonal") {
    const midX = (start.x + end.x) / 2;
    points = [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  }

  return {
    start,
    end,
    points,
    fromShape,
    toShape,
  };
}

export function getConnectorPathData(geometry, pathType) {
  if (!geometry) {
    return "";
  }

  const { start, end, points } = geometry;

  if (pathType === "straight") {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  if (pathType === "curved") {
    const delta = Math.max(50, Math.abs(end.x - start.x) / 2);
    const controlOne = { x: start.x + delta, y: start.y };
    const controlTwo = { x: end.x - delta, y: end.y };
    return `M ${start.x} ${start.y} C ${controlOne.x} ${controlOne.y}, ${controlTwo.x} ${controlTwo.y}, ${end.x} ${end.y}`;
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export function getConnectorLabelPoint(geometry, connector) {
  if (!geometry) {
    return { x: 0, y: 0 };
  }

  const { start, end } = geometry;
  const ratio = connector.labelPosition === "start" ? 0.25 : connector.labelPosition === "end" ? 0.75 : 0.5;

  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio - 10,
  };
}

export function getSelectionBounds(diagram, shapeIds) {
  const selectedShapes = diagram.shapes.filter((shape) => shapeIds.includes(shape.id));

  if (!selectedShapes.length) {
    return null;
  }

  return selectedShapes.reduce(
    (bounds, shape) => ({
      minX: Math.min(bounds.minX, shape.x),
      minY: Math.min(bounds.minY, shape.y),
      maxX: Math.max(bounds.maxX, shape.x + shape.width),
      maxY: Math.max(bounds.maxY, shape.y + shape.height),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

export function expandShapeSelection(diagram, shapeIds) {
  const selectedSet = new Set(shapeIds);
  const groupIds = new Set(
    diagram.shapes
      .filter((shape) => selectedSet.has(shape.id) && shape.groupId)
      .map((shape) => shape.groupId),
  );

  if (!groupIds.size) {
    return [...selectedSet];
  }

  diagram.shapes.forEach((shape) => {
    if (shape.groupId && groupIds.has(shape.groupId)) {
      selectedSet.add(shape.id);
    }
  });

  return [...selectedSet];
}

export function getSerializedDiagramSize(diagram) {
  return new Blob([JSON.stringify(diagram)]).size;
}

function buildFlowchartTemplate() {
  const diagram = createEmptyDiagram({
    title: "Flowchart Template",
    width: 1500,
    height: 950,
    background: "#ffffff",
    snapToGrid: true,
  });

  const start = createShapeFromDefinition("terminator", { x: 140, y: 120 }, { label: "Start", fill: "#ffffff" });
  const capture = createShapeFromDefinition("process", { x: 140, y: 260 }, { label: "Capture input", fill: "#f1f1f1" });
  const validate = createShapeFromDefinition("decision", { x: 130, y: 430 }, { label: "Valid?", fill: "#d9d9d9" });
  const review = createShapeFromDefinition("manual-input", { x: 410, y: 425 }, { label: "Review data", fill: "#efefef" });
  const persist = createShapeFromDefinition("stored-data", { x: 140, y: 620 }, { label: "Persist output", fill: "#cccccc" });
  const finish = createShapeFromDefinition("terminator", { x: 140, y: 785 }, { label: "End", fill: "#ffffff" });

  diagram.shapes = [start, capture, validate, review, persist, finish].map((shape, index) => ({
    ...shape,
    zIndex: index + 1,
  }));
  diagram.connectors = [
    createConnector(start.id, capture.id),
    createConnector(capture.id, validate.id),
    createConnector(validate.id, review.id, { label: "No", labelPosition: "middle" }),
    createConnector(review.id, persist.id, { pathType: "curved" }),
    createConnector(validate.id, persist.id, { label: "Yes", labelPosition: "middle" }),
    createConnector(persist.id, finish.id),
  ];

  return diagram;
}

function buildUmlTemplate() {
  const diagram = createEmptyDiagram({
    title: "UML Class Diagram Template",
    width: 1600,
    height: 980,
    background: "#ffffff",
  });

  const user = createShapeFromDefinition("uml-class", { x: 120, y: 140 }, { label: "User\n- id: UUID\n- email: string\n+ login()" });
  const order = createShapeFromDefinition("uml-class", { x: 470, y: 140 }, { label: "Order\n- number: string\n- total: money\n+ submit()" });
  const payment = createShapeFromDefinition("interface", { x: 870, y: 140 }, { label: "<<interface>>\nPaymentGateway\n+ charge()" });
  const receipt = createShapeFromDefinition("object", { x: 470, y: 430 }, { label: "receipt:Receipt" });
  const actor = createShapeFromDefinition("actor", { x: 100, y: 420 }, { label: "Customer" });
  const packageShape = createShapeFromDefinition("package", { x: 980, y: 410 }, { label: "Billing Package" });

  diagram.shapes = [actor, user, order, payment, receipt, packageShape].map((shape, index) => ({
    ...shape,
    zIndex: index + 1,
  }));
  diagram.connectors = [
    createConnector(actor.id, user.id, { pathType: "straight", endArrow: "open", label: "uses" }),
    createConnector(user.id, order.id, { pathType: "straight", label: "places" }),
    createConnector(order.id, payment.id, { label: "depends on", pathType: "curved" }),
    createConnector(order.id, receipt.id, { label: "creates" }),
    createConnector(payment.id, packageShape.id, { pathType: "orthogonal", startArrow: "diamond", endArrow: "open" }),
  ];

  return diagram;
}

function buildErdTemplate() {
  const diagram = createEmptyDiagram({
    title: "ER Diagram Template",
    width: 1550,
    height: 980,
    background: "#ffffff",
  });

  const student = createShapeFromDefinition("entity", { x: 120, y: 240 }, { label: "Student", fill: "#f1f1f1" });
  const enrollment = createShapeFromDefinition("relationship", { x: 460, y: 260 }, { label: "Enrolled In", fill: "#dadada" });
  const course = createShapeFromDefinition("entity", { x: 820, y: 240 }, { label: "Course", fill: "#e4e4e4" });
  const studentId = createShapeFromDefinition("key-attribute", { x: 100, y: 80 }, { label: "student_id" });
  const studentName = createShapeFromDefinition("attribute", { x: 80, y: 450 }, { label: "name" });
  const courseCode = createShapeFromDefinition("key-attribute", { x: 850, y: 80 }, { label: "course_code" });
  const credits = createShapeFromDefinition("attribute", { x: 900, y: 450 }, { label: "credits" });
  const weak = createShapeFromDefinition("weak-entity", { x: 1180, y: 250 }, { label: "Section", fill: "#cfcfcf" });

  diagram.shapes = [student, enrollment, course, studentId, studentName, courseCode, credits, weak].map((shape, index) => ({
    ...shape,
    zIndex: index + 1,
  }));
  diagram.connectors = [
    createConnector(student.id, enrollment.id, { label: "1..*" }),
    createConnector(enrollment.id, course.id, { label: "*..1" }),
    createConnector(studentId.id, student.id, { pathType: "straight", endArrow: "none", startArrow: "none" }),
    createConnector(studentName.id, student.id, { pathType: "straight", endArrow: "none", startArrow: "none" }),
    createConnector(courseCode.id, course.id, { pathType: "straight", endArrow: "none", startArrow: "none" }),
    createConnector(credits.id, course.id, { pathType: "straight", endArrow: "none", startArrow: "none" }),
    createConnector(course.id, weak.id, { pathType: "orthogonal", label: "contains" }),
  ];

  return diagram;
}

function buildNetworkTemplate() {
  const diagram = createEmptyDiagram({
    title: "Network Diagram Template",
    width: 1600,
    height: 980,
    background: "#ffffff",
  });

  const clients = createShapeFromDefinition("desktop", { x: 80, y: 190 }, { label: "Workstations" });
  const wifi = createShapeFromDefinition("mobile-device", { x: 110, y: 470 }, { label: "Mobile App" });
  const router = createShapeFromDefinition("router", { x: 430, y: 295 }, { label: "Router" });
  const firewall = createShapeFromDefinition("firewall", { x: 690, y: 295 }, { label: "Firewall" });
  const loadBalancer = createShapeFromDefinition("load-balancer", { x: 965, y: 295 }, { label: "Load Balancer" });
  const app = createShapeFromDefinition("server", { x: 1220, y: 180 }, { label: "App Server" });
  const db = createShapeFromDefinition("database-server", { x: 1220, y: 450 }, { label: "Primary DB" });
  const cloud = createShapeFromDefinition("cloud-service", { x: 960, y: 90 }, { label: "Public Cloud" });

  diagram.shapes = [clients, wifi, router, firewall, loadBalancer, cloud, app, db].map((shape, index) => ({
    ...shape,
    zIndex: index + 1,
  }));
  diagram.connectors = [
    createConnector(clients.id, router.id, { label: "LAN" }),
    createConnector(wifi.id, router.id, { label: "TLS" }),
    createConnector(router.id, firewall.id),
    createConnector(firewall.id, loadBalancer.id),
    createConnector(loadBalancer.id, app.id, { label: "HTTP" }),
    createConnector(loadBalancer.id, db.id, { label: "Read replica", pathType: "curved" }),
    createConnector(cloud.id, loadBalancer.id, { pathType: "orthogonal", label: "Ingress" }),
  ];

  return diagram;
}

function buildSequenceTemplate() {
  const diagram = createEmptyDiagram({
    title: "Sequence Diagram Template",
    width: 1650,
    height: 1100,
    background: "#ffffff",
  });

  const user = createShapeFromDefinition("participant", { x: 120, y: 120 }, { label: "User" });
  const ui = createShapeFromDefinition("participant", { x: 420, y: 120 }, { label: "UI" });
  const service = createShapeFromDefinition("participant", { x: 720, y: 120 }, { label: "Service" });
  const queue = createShapeFromDefinition("participant", { x: 1030, y: 120 }, { label: "Queue" });
  const worker = createShapeFromDefinition("participant", { x: 1330, y: 120 }, { label: "Worker" });
  const note = createShapeFromDefinition("message-card", { x: 650, y: 770 }, { label: "Retry on failure" });

  diagram.shapes = [user, ui, service, queue, worker, note].map((shape, index) => ({
    ...shape,
    zIndex: index + 1,
  }));
  diagram.connectors = [
    createConnector(user.id, ui.id, { pathType: "straight", label: "openEditor()" }),
    createConnector(ui.id, service.id, { pathType: "straight", label: "saveDiagram()" }),
    createConnector(service.id, queue.id, { pathType: "straight", label: "publish(job)" }),
    createConnector(queue.id, worker.id, { pathType: "straight", label: "consume()" }),
    createConnector(worker.id, service.id, { pathType: "curved", label: "completed" }),
  ];

  return diagram;
}

export function buildTemplateDiagram(templateId) {
  if (templateId === "blank") {
    return createEmptyDiagram();
  }

  if (templateId === "flowchart") {
    return buildFlowchartTemplate();
  }

  if (templateId === "uml") {
    return buildUmlTemplate();
  }

  if (templateId === "erd") {
    return buildErdTemplate();
  }

  if (templateId === "network") {
    return buildNetworkTemplate();
  }

  if (templateId === "sequence") {
    return buildSequenceTemplate();
  }

  return createEmptyDiagram();
}
