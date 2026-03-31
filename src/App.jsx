import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ARROW_TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  FONT_FAMILIES,
  GRID_SIZE,
  LABEL_POSITION_OPTIONS,
  LINE_STYLE_OPTIONS,
  MAX_HISTORY,
  MAX_ZOOM,
  MIN_ZOOM,
  PATH_TYPE_OPTIONS,
  SHAPE_DEFINITIONS,
  TEMPLATE_OPTIONS,
  buildTemplateDiagram,
  clamp,
  createConnector,
  createId,
  createShapeFromDefinition,
  deepClone,
  expandShapeSelection,
  getConnectorGeometry,
  getConnectorPathData,
  getSelectionBounds,
  getSerializedDiagramSize,
  getShapeCenter,
  snapValue,
} from "./sketchflow/data";
import { exportDiagramAsPng, exportDiagramAsSvg } from "./sketchflow/export";
import { buildConnectorMarkup, buildMarkerDefinitions, buildShapeMarkup } from "./sketchflow/render";
import { deleteDiagram as deleteStoredDiagram, listStoredDiagrams, loadDiagram, saveDiagram } from "./sketchflow/storage";

const TOOL_OPTIONS = [
  { id: "select", label: "Select" },
  { id: "connect", label: "Connect" },
  { id: "pan", label: "Pan" },
];

const ALIGN_OPTIONS = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
  { id: "top", label: "Top" },
  { id: "middle", label: "Middle" },
  { id: "bottom", label: "Bottom" },
];

const DISTRIBUTE_OPTIONS = [
  { id: "horizontal", label: "Distribute H" },
  { id: "vertical", label: "Distribute V" },
];

const INITIAL_PAN = { x: 72, y: 52 };

function isEditableElement(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("input, textarea, select, button, [contenteditable='true']"));
}

function slugify(value) {
  return String(value ?? "sketchflow")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function getNow() {
  return new Date().toISOString();
}

function diagramsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeLayers(diagram) {
  const shapes = diagram.shapes
    .slice()
    .sort((left, right) => left.zIndex - right.zIndex)
    .map((shape, index) => ({
      ...shape,
      zIndex: index + 1,
    }));
  const connectors = diagram.connectors
    .slice()
    .sort((left, right) => left.zIndex - right.zIndex)
    .map((connector, index) => ({
      ...connector,
      zIndex: index + 1,
    }));

  return {
    ...diagram,
    shapes,
    connectors,
  };
}

function stampDiagram(diagram) {
  return normalizeLayers({
    ...diagram,
    updatedAt: getNow(),
  });
}

function getDefaultDropPoint(diagram, count) {
  return {
    x: clamp(150 + (count % 5) * 44, 60, Math.max(60, diagram.width - 240)),
    y: clamp(120 + (count % 6) * 38, 60, Math.max(60, diagram.height - 180)),
  };
}

function buildPreviewShape(definition) {
  const width = clamp(Math.round(definition.defaultWidth * 0.45), 58, 88);
  const height = clamp(Math.round(definition.defaultHeight * 0.45), 42, 76);

  return createShapeFromDefinition(
    definition.id,
    { x: 0, y: 0 },
    {
      width,
      height,
      label: definition.primitive === "actor" ? "Actor" : definition.primitive === "lifeline" ? "Flow" : "",
      fontSize: 12,
      strokeWidth: 1.6,
    },
  );
}

function getSelectionCluster(diagram, shapeId) {
  return expandShapeSelection(diagram, [shapeId]);
}

function toggleSelectionCluster(diagram, currentIds, shapeId) {
  const cluster = getSelectionCluster(diagram, shapeId);
  const next = new Set(currentIds);
  const fullySelected = cluster.every((id) => next.has(id));

  cluster.forEach((id) => {
    if (fullySelected) {
      next.delete(id);
    } else {
      next.add(id);
    }
  });

  return [...next];
}

function ensureExpandedSelection(diagram, shapeIds) {
  return expandShapeSelection(diagram, shapeIds);
}

function getCanvasPoint(clientX, clientY, element, zoom, pan) {
  const rect = element.getBoundingClientRect();

  return {
    x: (clientX - rect.left - pan.x) / zoom,
    y: (clientY - rect.top - pan.y) / zoom,
  };
}

function angleFromPoint(center, point) {
  const angle = (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI;
  return (angle + 360) % 360;
}

function createFreshDiagram(templateId = "blank") {
  const template = buildTemplateDiagram(templateId);
  const title =
    templateId === "blank" ? "Untitled SketchFlow" : template.title.endsWith("Template") ? template.title : `${template.title} Template`;

  return {
    ...template,
    title,
    updatedAt: getNow(),
    savedAt: null,
  };
}

function App() {
  const [diagram, setDiagram] = useState(() => createFreshDiagram("blank"));
  const [selectedShapeIds, setSelectedShapeIds] = useState([]);
  const [selectedConnectorId, setSelectedConnectorId] = useState(null);
  const [tool, setTool] = useState("select");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategory, setLibraryCategory] = useState("All");
  const [cursor, setCursor] = useState({ x: 0, y: 0, inside: false });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(INITIAL_PAN);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [interaction, setInteraction] = useState(null);
  const [connectorDraft, setConnectorDraft] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [statusMessage, setStatusMessage] = useState("SketchFlow is ready.");
  const [dirty, setDirty] = useState(true);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [storedDiagrams, setStoredDiagrams] = useState(() => listStoredDiagrams());
  const [exportOptions, setExportOptions] = useState({
    format: "png",
    scale: 1,
    transparentBackground: false,
    filename: "sketchflow-diagram",
  });

  const viewportRef = useRef(null);
  const latestDiagramRef = useRef(diagram);
  const statusTimeoutRef = useRef(null);
  const deferredSearch = useDeferredValue(librarySearch);

  useEffect(() => {
    latestDiagramRef.current = diagram;
  }, [diagram]);

  useEffect(() => {
    document.title = `SketchFlow · ${diagram.title}`;
  }, [diagram.title]);

  useEffect(() => {
    const shapeIds = new Set(diagram.shapes.map((shape) => shape.id));
    const connectorIds = new Set(diagram.connectors.map((connector) => connector.id));

    setSelectedShapeIds((current) => current.filter((id) => shapeIds.has(id)));
    setSelectedConnectorId((current) => (current && connectorIds.has(current) ? current : null));
  }, [diagram]);

  useEffect(() => {
    window.onbeforeunload = dirty
      ? (event) => {
          event.preventDefault();
          return "";
        }
      : null;

    return () => {
      window.onbeforeunload = null;
    };
  }, [dirty]);

  useEffect(() => {
    if (!activeMenu) {
      return undefined;
    }

    function handleWindowPointerDown(event) {
      if (event.target instanceof HTMLElement && event.target.closest(".sf-menubar")) {
        return;
      }

      setActiveMenu(null);
    }

    window.addEventListener("pointerdown", handleWindowPointerDown);
    return () => window.removeEventListener("pointerdown", handleWindowPointerDown);
  }, [activeMenu]);

  useEffect(() => {
    if (!interaction) {
      return undefined;
    }

    function handlePointerMove(event) {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const point = getCanvasPoint(event.clientX, event.clientY, viewport, zoom, pan);
      setCursor({
        x: clamp(point.x, 0, diagram.width),
        y: clamp(point.y, 0, diagram.height),
        inside: true,
      });

      if (interaction.type === "drag") {
        const deltaX = (event.clientX - interaction.originClientX) / zoom;
        const deltaY = (event.clientY - interaction.originClientY) / zoom;
        const activeIds = new Set(interaction.shapeIds);

        setDiagram((current) => ({
          ...current,
          updatedAt: getNow(),
          shapes: current.shapes.map((shape) => {
            if (!activeIds.has(shape.id)) {
              return shape;
            }

            const startPosition = interaction.startPositions.get(shape.id);
            if (!startPosition || shape.locked) {
              return shape;
            }

            return {
              ...shape,
              x: clamp(snapValue(startPosition.x + deltaX, current.snapToGrid), 0, current.width - shape.width),
              y: clamp(snapValue(startPosition.y + deltaY, current.snapToGrid), 0, current.height - shape.height),
            };
          }),
        }));
      }

      if (interaction.type === "resize") {
        const deltaX = (event.clientX - interaction.originClientX) / zoom;
        const deltaY = (event.clientY - interaction.originClientY) / zoom;

        setDiagram((current) => ({
          ...current,
          updatedAt: getNow(),
          shapes: current.shapes.map((shape) => {
            if (shape.id !== interaction.shapeId || shape.locked) {
              return shape;
            }

            return {
              ...shape,
              width: clamp(snapValue(interaction.startWidth + deltaX, current.snapToGrid), 48, current.width - shape.x),
              height: clamp(snapValue(interaction.startHeight + deltaY, current.snapToGrid), 42, current.height - shape.y),
            };
          }),
        }));
      }

      if (interaction.type === "rotate") {
        setDiagram((current) => ({
          ...current,
          updatedAt: getNow(),
          shapes: current.shapes.map((shape) => {
            if (shape.id !== interaction.shapeId || shape.locked) {
              return shape;
            }

            return {
              ...shape,
              rotation: Math.round(angleFromPoint(interaction.center, point)),
            };
          }),
        }));
      }

      if (interaction.type === "pan") {
        setPan({
          x: interaction.startPan.x + (event.clientX - interaction.originClientX),
          y: interaction.startPan.y + (event.clientY - interaction.originClientY),
        });
      }
    }

    function handlePointerUp() {
      if (interaction.previousDiagram && !diagramsEqual(interaction.previousDiagram, latestDiagramRef.current)) {
        setUndoStack((current) => [
          ...current.slice(-(MAX_HISTORY - 1)),
          {
            diagram: interaction.previousDiagram,
            description: interaction.description,
          },
        ]);
        setRedoStack([]);
        setDirty(true);
        setStatusMessage(interaction.completeMessage ?? interaction.description);
      }

      setInteraction(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [diagram.height, diagram.width, interaction, pan, zoom]);

  useEffect(() => {
    function handleKeyDown(event) {
      const command = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const editable = isEditableElement(event.target);

      if (command && key === "s") {
        event.preventDefault();
        handleSave();
        return;
      }

      if (command && key === "o") {
        event.preventDefault();
        refreshStored();
        setShowOpenDialog(true);
        return;
      }

      if (command && key === "e") {
        event.preventDefault();
        setExportOptions((current) => ({
          ...current,
          filename: slugify(diagram.title || "sketchflow-diagram"),
        }));
        setShowExportDialog(true);
        return;
      }

      if (command && key === "n") {
        event.preventDefault();
        handleApplyTemplate("blank");
        return;
      }

      if (command && key === "z") {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (command && key === "y") {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (editable) {
        return;
      }

      if (command && key === "a") {
        event.preventDefault();
        setSelectedConnectorId(null);
        setSelectedShapeIds(diagram.shapes.map((shape) => shape.id));
        return;
      }

      if (command && key === "d") {
        event.preventDefault();
        clearSelection();
        return;
      }

      if (command && key === "c") {
        event.preventDefault();
        handleCopy();
        return;
      }

      if (command && key === "v") {
        event.preventDefault();
        handlePaste();
        return;
      }

      if (command && key === "x") {
        event.preventDefault();
        handleCopy();
        deleteSelection();
        return;
      }

      if (event.key === "Delete") {
        event.preventDefault();
        deleteSelection();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setActiveMenu(null);
        setShowHelpDialog(false);
        setConnectorDraft(null);
        setShowInspector(false);
        clearSelection();
        setTool("select");
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        adjustZoom(0.1);
        return;
      }

      if (event.key === "-") {
        event.preventDefault();
        adjustZoom(-0.1);
        return;
      }

      if (command && event.key === "0") {
        event.preventDefault();
        setZoom(1);
        setPan(INITIAL_PAN);
        return;
      }

      if (event.key.toLowerCase() === "g" && !command) {
        event.preventDefault();
        if (event.shiftKey) {
          handleUngroup();
        } else {
          handleGroup();
        }
        return;
      }

      if (selectedShapeIds.length && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const delta =
          event.key === "ArrowLeft"
            ? { x: -step, y: 0 }
            : event.key === "ArrowRight"
              ? { x: step, y: 0 }
              : event.key === "ArrowUp"
                ? { x: 0, y: -step }
                : { x: 0, y: step };

        updateSelectedShapes(
          (shape, currentDiagram) => ({
            ...shape,
            x: clamp(shape.x + delta.x, 0, currentDiagram.width - shape.width),
            y: clamp(shape.y + delta.y, 0, currentDiagram.height - shape.height),
          }),
          "Move shape",
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [diagram, selectedShapeIds, clipboard, undoStack, redoStack]);

  const filteredShapes = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return SHAPE_DEFINITIONS.filter((shape) => {
      const categoryMatches = libraryCategory === "All" || shape.category === libraryCategory;
      const queryMatches =
        !query ||
        shape.name.toLowerCase().includes(query) ||
        shape.description.toLowerCase().includes(query) ||
        shape.category.toLowerCase().includes(query);

      return categoryMatches && queryMatches;
    });
  }, [deferredSearch, libraryCategory]);

  const expandedSelectedShapeIds = useMemo(
    () => ensureExpandedSelection(diagram, selectedShapeIds),
    [diagram, selectedShapeIds],
  );
  const selectedShapes = useMemo(
    () => diagram.shapes.filter((shape) => expandedSelectedShapeIds.includes(shape.id)),
    [diagram, expandedSelectedShapeIds],
  );
  const selectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null;
  const selectedConnector = useMemo(
    () => diagram.connectors.find((connector) => connector.id === selectedConnectorId) ?? null,
    [diagram.connectors, selectedConnectorId],
  );
  const selectionBounds = useMemo(
    () => getSelectionBounds(diagram, expandedSelectedShapeIds),
    [diagram, expandedSelectedShapeIds],
  );
  const connectorSelectionPath = useMemo(() => {
    if (!selectedConnector) {
      return "";
    }

    const geometry = getConnectorGeometry(diagram, selectedConnector);
    return getConnectorPathData(geometry, selectedConnector.pathType);
  }, [diagram, selectedConnector]);

  const connectorDraftPath = useMemo(() => {
    if (!connectorDraft || !cursor.inside) {
      return "";
    }

    const fromShape = diagram.shapes.find((shape) => shape.id === connectorDraft.fromId);
    if (!fromShape) {
      return "";
    }

    const center = getShapeCenter(fromShape);
    return `M ${center.x} ${center.y} L ${cursor.x} ${cursor.y}`;
  }, [connectorDraft, cursor, diagram.shapes]);

  const canAlign = expandedSelectedShapeIds.length >= 2;
  const canDistribute = expandedSelectedShapeIds.length >= 3;
  const canGroup = selectedShapes.length >= 2;
  const canUngroup = selectedShapes.some((shape) => shape.groupId);

  function setNotice(message) {
    window.clearTimeout(statusTimeoutRef.current);
    setStatusMessage(message);
    statusTimeoutRef.current = window.setTimeout(() => {
      setStatusMessage((current) => (current === message ? "SketchFlow is ready." : current));
    }, 3400);
  }

  function refreshStored() {
    setStoredDiagrams(listStoredDiagrams());
  }

  function clearSelection() {
    setSelectedShapeIds([]);
    setSelectedConnectorId(null);
  }

  function resetForDiagram(nextDiagram, options = {}) {
    setDiagram(nextDiagram);
    setUndoStack([]);
    setRedoStack([]);
    setConnectorDraft(null);
    setSelectedConnectorId(null);
    setSelectedShapeIds([]);
    setZoom(nextDiagram.zoomRecommendation ?? 1);
    setPan(INITIAL_PAN);
    setDirty(options.dirty ?? true);
    setNotice(options.message ?? "Loaded a fresh diagram.");
  }

  function commitDiagramChange(description, updater, options = {}) {
    const previous = deepClone(latestDiagramRef.current);
    const candidate = updater(deepClone(latestDiagramRef.current));

    if (!candidate) {
      return false;
    }

    const next = stampDiagram(candidate);

    if (diagramsEqual(previous, next)) {
      return false;
    }

    setDiagram(next);
    setUndoStack((current) => [
      ...current.slice(-(MAX_HISTORY - 1)),
      {
        diagram: previous,
        description,
      },
    ]);
    setRedoStack([]);
    setDirty(true);
    setNotice(options.message ?? description);

    return true;
  }

  function updateSelectedShapes(patchOrUpdater, description, options = {}) {
    const activeIds = [...expandedSelectedShapeIds];
    if (!activeIds.length) {
      return;
    }

    commitDiagramChange(description, (draft) => {
      const idSet = new Set(activeIds);
      draft.shapes = draft.shapes.map((shape) => {
        if (!idSet.has(shape.id) || (shape.locked && !options.includeLocked)) {
          return shape;
        }

        const nextValue =
          typeof patchOrUpdater === "function" ? patchOrUpdater(shape, draft) : { ...shape, ...patchOrUpdater };

        return {
          ...shape,
          ...nextValue,
        };
      });

      return draft;
    }, options);
  }

  function updateConnector(patchOrUpdater, description, options = {}) {
    if (!selectedConnectorId) {
      return;
    }

    commitDiagramChange(description, (draft) => {
      draft.connectors = draft.connectors.map((connector) => {
        if (connector.id !== selectedConnectorId || (connector.locked && !options.includeLocked)) {
          return connector;
        }

        const nextValue =
          typeof patchOrUpdater === "function" ? patchOrUpdater(connector, draft) : { ...connector, ...patchOrUpdater };

        return {
          ...connector,
          ...nextValue,
        };
      });

      return draft;
    }, options);
  }

  function adjustZoom(delta) {
    setZoom((current) => clamp(Number((current + delta).toFixed(2)), MIN_ZOOM, MAX_ZOOM));
  }

  function handleApplyTemplate(templateId) {
    if (dirty && !window.confirm("Discard the current diagram and start a new one?")) {
      return;
    }

    const nextDiagram = createFreshDiagram(templateId);
    resetForDiagram(nextDiagram, {
      dirty: true,
      message:
        templateId === "blank"
          ? "Started a blank SketchFlow diagram."
          : `Loaded the ${TEMPLATE_OPTIONS.find((item) => item.id === templateId)?.name ?? "template"}.`,
    });
  }

  function addShape(typeId, point) {
    const referencePoint = point ?? getDefaultDropPoint(latestDiagramRef.current, latestDiagramRef.current.shapes.length);
    const definition = SHAPE_DEFINITIONS.find((shape) => shape.id === typeId);
    const shape = createShapeFromDefinition(typeId, {
      x: referencePoint.x,
      y: referencePoint.y,
    });

    const placedShape = {
      ...shape,
      x: clamp(snapValue(referencePoint.x - shape.width / 2, latestDiagramRef.current.snapToGrid), 0, latestDiagramRef.current.width - shape.width),
      y: clamp(snapValue(referencePoint.y - shape.height / 2, latestDiagramRef.current.snapToGrid), 0, latestDiagramRef.current.height - shape.height),
      zIndex: latestDiagramRef.current.shapes.length + 1,
    };

    if (
      commitDiagramChange(`Add ${definition?.name ?? "shape"}`, (draft) => {
        draft.shapes.push(placedShape);
        return draft;
      })
    ) {
      setSelectedConnectorId(null);
      setSelectedShapeIds([placedShape.id]);
      setTool("select");
    }
  }

  function createConnectorBetween(fromId, toId) {
    const connector = createConnector(fromId, toId, {
      zIndex: latestDiagramRef.current.connectors.length + 1,
    });

    if (
      commitDiagramChange("Add connector", (draft) => {
        draft.connectors.push(connector);
        return draft;
      })
    ) {
      setConnectorDraft(null);
      setSelectedShapeIds([]);
      setSelectedConnectorId(connector.id);
      setTool("select");
    }
  }

  function handleSave() {
    const current = deepClone(latestDiagramRef.current);
    let title = String(current.title ?? "").trim();

    if (!title || title === "Untitled SketchFlow") {
      const response = window.prompt("Name this SketchFlow diagram", title || "SketchFlow Diagram");
      if (response === null) {
        return;
      }

      title = response.trim().slice(0, 255);
      if (!title) {
        return;
      }
    }

    const next = {
      ...current,
      title,
      savedAt: getNow(),
      updatedAt: getNow(),
    };

    try {
      saveDiagram(next);
      setDiagram(next);
      setDirty(false);
      refreshStored();
      setNotice(`Saved ${title}.`);
    } catch (error) {
      setNotice(error.message);
    }
  }

  function handleOpen(diagramId) {
    if (dirty && !window.confirm("Discard unsaved changes and open a saved diagram?")) {
      return;
    }

    try {
      const next = loadDiagram(diagramId);
      resetForDiagram(next, {
        dirty: false,
        message: `Opened ${next.title}.`,
      });
      setShowOpenDialog(false);
    } catch (error) {
      setNotice(error.message);
    }
  }

  function handleDeleteStored(diagramId) {
    if (!window.confirm("Delete this saved diagram from browser storage?")) {
      return;
    }

    deleteStoredDiagram(diagramId);
    refreshStored();
    setNotice("Deleted the saved diagram.");
  }

  function handleUndo() {
    const entry = undoStack.at(-1);

    if (!entry) {
      return;
    }

    const current = deepClone(latestDiagramRef.current);
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [
      ...stack.slice(-(MAX_HISTORY - 1)),
      {
        diagram: current,
        description: entry.description,
      },
    ]);
    setDiagram(entry.diagram);
    setSelectedShapeIds([]);
    setSelectedConnectorId(null);
    setConnectorDraft(null);
    setDirty(true);
    setNotice(`Undo: ${entry.description}`);
  }

  function handleRedo() {
    const entry = redoStack.at(-1);

    if (!entry) {
      return;
    }

    const current = deepClone(latestDiagramRef.current);
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [
      ...stack.slice(-(MAX_HISTORY - 1)),
      {
        diagram: current,
        description: entry.description,
      },
    ]);
    setDiagram(entry.diagram);
    setSelectedShapeIds([]);
    setSelectedConnectorId(null);
    setConnectorDraft(null);
    setDirty(true);
    setNotice(`Redo: ${entry.description}`);
  }

  function handleCopy() {
    if (!expandedSelectedShapeIds.length) {
      return;
    }

    const selectedSet = new Set(expandedSelectedShapeIds);
    const shapes = deepClone(latestDiagramRef.current.shapes.filter((shape) => selectedSet.has(shape.id)));
    const connectors = deepClone(
      latestDiagramRef.current.connectors.filter(
        (connector) => selectedSet.has(connector.fromId) && selectedSet.has(connector.toId),
      ),
    );

    setClipboard({
      shapes,
      connectors,
      pasteCount: 0,
    });
    setNotice(`Copied ${shapes.length} shape${shapes.length === 1 ? "" : "s"}.`);
  }

  function handlePaste() {
    if (!clipboard?.shapes?.length) {
      return;
    }

    const offset = 28 * (clipboard.pasteCount + 1);
    const idMap = new Map();
    const groupMap = new Map();

    const shapes = clipboard.shapes.map((shape) => {
      const nextId = createId("shape");
      idMap.set(shape.id, nextId);

      if (shape.groupId && !groupMap.has(shape.groupId)) {
        groupMap.set(shape.groupId, createId("group"));
      }

      return {
        ...shape,
        id: nextId,
        x: clamp(shape.x + offset, 0, latestDiagramRef.current.width - shape.width),
        y: clamp(shape.y + offset, 0, latestDiagramRef.current.height - shape.height),
        groupId: shape.groupId ? groupMap.get(shape.groupId) : null,
        zIndex: latestDiagramRef.current.shapes.length + idMap.size,
      };
    });

    const connectors = clipboard.connectors.map((connector, index) => ({
      ...connector,
      id: createId("connector"),
      fromId: idMap.get(connector.fromId),
      toId: idMap.get(connector.toId),
      zIndex: latestDiagramRef.current.connectors.length + index + 1,
    }));

    if (
      commitDiagramChange("Paste selection", (draft) => {
        draft.shapes.push(...shapes);
        draft.connectors.push(...connectors);
        return draft;
      })
    ) {
      setSelectedConnectorId(null);
      setSelectedShapeIds(shapes.map((shape) => shape.id));
      setClipboard((current) => ({
        ...current,
        pasteCount: (current?.pasteCount ?? 0) + 1,
      }));
    }
  }

  function deleteSelection() {
    if (!expandedSelectedShapeIds.length && !selectedConnectorId) {
      return;
    }

    const activeShapeIds = new Set(expandedSelectedShapeIds);
    const activeConnectorId = selectedConnectorId;

    if (
      commitDiagramChange("Delete selection", (draft) => {
        draft.shapes = draft.shapes.filter((shape) => !activeShapeIds.has(shape.id));
        draft.connectors = draft.connectors.filter((connector) => {
          if (activeConnectorId && connector.id === activeConnectorId) {
            return false;
          }

          return !activeShapeIds.has(connector.fromId) && !activeShapeIds.has(connector.toId);
        });

        return draft;
      })
    ) {
      clearSelection();
    }
  }

  function handleGroup() {
    if (!canGroup) {
      return;
    }

    const groupId = createId("group");
    updateSelectedShapes(
      (shape) => ({
        ...shape,
        groupId,
      }),
      "Group shapes",
      { message: "Grouped the selected shapes." },
    );
  }

  function handleUngroup() {
    if (!canUngroup) {
      return;
    }

    updateSelectedShapes(
      (shape) => ({
        ...shape,
        groupId: null,
      }),
      "Ungroup shapes",
      { message: "Ungrouped the selected shapes." },
    );
  }

  function handleAlign(mode) {
    if (!canAlign || !selectionBounds) {
      return;
    }

    updateSelectedShapes(
      (shape) => {
        if (mode === "left") {
          return { ...shape, x: selectionBounds.minX };
        }
        if (mode === "center") {
          return { ...shape, x: selectionBounds.minX + (selectionBounds.maxX - selectionBounds.minX) / 2 - shape.width / 2 };
        }
        if (mode === "right") {
          return { ...shape, x: selectionBounds.maxX - shape.width };
        }
        if (mode === "top") {
          return { ...shape, y: selectionBounds.minY };
        }
        if (mode === "middle") {
          return { ...shape, y: selectionBounds.minY + (selectionBounds.maxY - selectionBounds.minY) / 2 - shape.height / 2 };
        }

        return { ...shape, y: selectionBounds.maxY - shape.height };
      },
      "Align shapes",
      {
        message: `Aligned shapes ${mode}.`,
      },
    );
  }

  function handleDistribute(mode) {
    if (!canDistribute) {
      return;
    }

    const sorted = selectedShapes
      .slice()
      .sort((left, right) => (mode === "horizontal" ? left.x - right.x : left.y - right.y));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (!first || !last) {
      return;
    }

    const totalSize = sorted.reduce((sum, shape) => sum + (mode === "horizontal" ? shape.width : shape.height), 0);
    const span =
      (mode === "horizontal" ? last.x + last.width - first.x : last.y + last.height - first.y) - totalSize;
    const gap = span / (sorted.length - 1);
    let cursorPosition = mode === "horizontal" ? first.x : first.y;
    const positions = new Map();

    sorted.forEach((shape) => {
      positions.set(shape.id, cursorPosition);
      cursorPosition += (mode === "horizontal" ? shape.width : shape.height) + gap;
    });

    updateSelectedShapes(
      (shape) =>
        mode === "horizontal"
          ? { ...shape, x: positions.get(shape.id) ?? shape.x }
          : { ...shape, y: positions.get(shape.id) ?? shape.y },
      "Distribute shapes",
      {
        message: `Distributed shapes ${mode}.`,
      },
    );
  }

  function handleBringForward() {
    if (!expandedSelectedShapeIds.length) {
      return;
    }

    const selectedSet = new Set(expandedSelectedShapeIds);
    commitDiagramChange(
      "Bring forward",
      (draft) => {
        const remaining = draft.shapes.filter((shape) => !selectedSet.has(shape.id));
        const selected = draft.shapes.filter((shape) => selectedSet.has(shape.id));
        draft.shapes = [...remaining, ...selected];
        return draft;
      },
      { message: "Moved the selection to the front." },
    );
  }

  function handleSendBackward() {
    if (!expandedSelectedShapeIds.length) {
      return;
    }

    const selectedSet = new Set(expandedSelectedShapeIds);
    commitDiagramChange(
      "Send backward",
      (draft) => {
        const selected = draft.shapes.filter((shape) => selectedSet.has(shape.id));
        const remaining = draft.shapes.filter((shape) => !selectedSet.has(shape.id));
        draft.shapes = [...selected, ...remaining];
        return draft;
      },
      { message: "Moved the selection to the back." },
    );
  }

  function startPan(event) {
    setInteraction({
      type: "pan",
      originClientX: event.clientX,
      originClientY: event.clientY,
      startPan: pan,
      previousDiagram: null,
      description: "Pan canvas",
    });
  }

  function handleCanvasPointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    if (tool === "pan" || event.altKey) {
      startPan(event);
      return;
    }

    if (tool === "connect") {
      setConnectorDraft(null);
      return;
    }

    clearSelection();
  }

  function handleShapePointerDown(event, shapeId) {
    event.stopPropagation();
    const shape = latestDiagramRef.current.shapes.find((item) => item.id === shapeId);

    if (!shape) {
      return;
    }

    if (tool === "connect") {
      if (connectorDraft?.fromId && connectorDraft.fromId !== shapeId) {
        createConnectorBetween(connectorDraft.fromId, shapeId);
      } else {
        setConnectorDraft({ fromId: shapeId });
        setSelectedShapeIds([shapeId]);
        setSelectedConnectorId(null);
        setNotice("Choose another shape to complete the connector.");
      }

      return;
    }

    if (tool === "pan") {
      startPan(event);
      return;
    }

    const currentSelection = ensureExpandedSelection(latestDiagramRef.current, selectedShapeIds);
    const nextSelection = event.shiftKey
      ? toggleSelectionCluster(latestDiagramRef.current, currentSelection, shapeId)
      : currentSelection.includes(shapeId)
        ? currentSelection
        : getSelectionCluster(latestDiagramRef.current, shapeId);

    setSelectedConnectorId(null);
    setSelectedShapeIds(nextSelection);

    if (shape.locked || !nextSelection.includes(shapeId)) {
      return;
    }

    const startPositions = new Map(
      latestDiagramRef.current.shapes
        .filter((item) => nextSelection.includes(item.id))
        .map((item) => [item.id, { x: item.x, y: item.y }]),
    );

    setInteraction({
      type: "drag",
      originClientX: event.clientX,
      originClientY: event.clientY,
      shapeIds: nextSelection,
      startPositions,
      previousDiagram: deepClone(latestDiagramRef.current),
      description: "Move shape",
      completeMessage: "Moved the selected shape.",
    });
  }

  function handleConnectorPointerDown(event, connectorId) {
    event.stopPropagation();
    if (tool !== "select") {
      return;
    }

    setSelectedShapeIds([]);
    setSelectedConnectorId(connectorId);
  }

  function handleResizeHandlePointerDown(event) {
    if (!selectedShape || selectedShape.locked) {
      return;
    }

    event.stopPropagation();
    setInteraction({
      type: "resize",
      shapeId: selectedShape.id,
      originClientX: event.clientX,
      originClientY: event.clientY,
      startWidth: selectedShape.width,
      startHeight: selectedShape.height,
      previousDiagram: deepClone(latestDiagramRef.current),
      description: "Resize shape",
      completeMessage: "Resized the shape.",
    });
  }

  function handleRotateHandlePointerDown(event) {
    if (!selectedShape || selectedShape.locked) {
      return;
    }

    event.stopPropagation();
    setInteraction({
      type: "rotate",
      shapeId: selectedShape.id,
      center: getShapeCenter(selectedShape),
      previousDiagram: deepClone(latestDiagramRef.current),
      description: "Rotate shape",
      completeMessage: "Rotated the shape.",
    });
  }

  async function handleExport() {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\..+$/, "")
      .replace("T", "_");
    const filename = `${slugify(exportOptions.filename || diagram.title)}_${timestamp}.${exportOptions.format}`;

    try {
      if (exportOptions.format === "png") {
        await exportDiagramAsPng(diagram, {
          scale: exportOptions.scale,
          transparentBackground: exportOptions.transparentBackground,
          filename,
        });
      } else {
        exportDiagramAsSvg(diagram, {
          scale: exportOptions.scale,
          transparentBackground: exportOptions.transparentBackground,
          filename,
        });
      }

      setShowExportDialog(false);
      setNotice(`Exported ${filename}.`);
    } catch (error) {
      setNotice(error.message);
    }
  }

  function runMenuAction(action) {
    setActiveMenu(null);

    if (action === "file:new") {
      handleApplyTemplate("blank");
      return;
    }

    if (action === "file:open") {
      refreshStored();
      setShowOpenDialog(true);
      return;
    }

    if (action === "file:save") {
      handleSave();
      return;
    }

    if (action === "file:export") {
      setExportOptions((current) => ({
        ...current,
        filename: slugify(diagram.title || "sketchflow-diagram"),
      }));
      setShowExportDialog(true);
      return;
    }

    if (action === "edit:undo") {
      handleUndo();
      return;
    }

    if (action === "edit:redo") {
      handleRedo();
      return;
    }

    if (action === "edit:copy") {
      handleCopy();
      return;
    }

    if (action === "edit:paste") {
      handlePaste();
      return;
    }

    if (action === "edit:delete") {
      deleteSelection();
      return;
    }

    if (action === "edit:clear") {
      clearSelection();
      return;
    }

    if (action === "view:zoom-in") {
      adjustZoom(0.1);
      return;
    }

    if (action === "view:zoom-out") {
      adjustZoom(-0.1);
      return;
    }

    if (action === "view:reset-zoom") {
      setZoom(1);
      setPan(INITIAL_PAN);
      return;
    }

    if (action === "view:grid") {
      commitDiagramChange("Toggle grid", (draft) => {
        draft.showGrid = !draft.showGrid;
        return draft;
      });
      return;
    }

    if (action === "view:snap") {
      commitDiagramChange("Toggle snap to grid", (draft) => {
        draft.snapToGrid = !draft.snapToGrid;
        return draft;
      });
      return;
    }

    if (action === "view:properties") {
      setShowInspector((current) => !current);
      return;
    }

    if (action === "arrange:group") {
      handleGroup();
      return;
    }

    if (action === "arrange:ungroup") {
      handleUngroup();
      return;
    }

    if (action === "arrange:front") {
      handleBringForward();
      return;
    }

    if (action === "arrange:back") {
      handleSendBackward();
      return;
    }

    if (action === "arrange:left") {
      handleAlign("left");
      return;
    }

    if (action === "arrange:center") {
      handleAlign("center");
      return;
    }

    if (action === "arrange:right") {
      handleAlign("right");
      return;
    }

    if (action === "extras:flowchart") {
      handleApplyTemplate("flowchart");
      return;
    }

    if (action === "extras:uml") {
      handleApplyTemplate("uml");
      return;
    }

    if (action === "extras:erd") {
      handleApplyTemplate("erd");
      return;
    }

    if (action === "extras:network") {
      handleApplyTemplate("network");
      return;
    }

    if (action === "extras:sequence") {
      handleApplyTemplate("sequence");
      return;
    }

    if (action === "help:shortcuts" || action === "help:about") {
      setShowHelpDialog(true);
    }
  }

  const menuSections = [
    {
      id: "File",
      items: [
        { label: "New Diagram", action: "file:new" },
        { label: "Open Diagram", action: "file:open" },
        { label: "Save Diagram", action: "file:save" },
        { label: "Export", action: "file:export" },
      ],
    },
    {
      id: "Edit",
      items: [
        { label: "Undo", action: "edit:undo" },
        { label: "Redo", action: "edit:redo" },
        { label: "Copy", action: "edit:copy" },
        { label: "Paste", action: "edit:paste" },
        { label: "Delete Selection", action: "edit:delete" },
        { label: "Deselect", action: "edit:clear" },
      ],
    },
    {
      id: "View",
      items: [
        { label: "Zoom In", action: "view:zoom-in" },
        { label: "Zoom Out", action: "view:zoom-out" },
        { label: "Reset Zoom", action: "view:reset-zoom" },
        { label: diagram.showGrid ? "Hide Grid" : "Show Grid", action: "view:grid" },
        { label: diagram.snapToGrid ? "Disable Snap" : "Enable Snap", action: "view:snap" },
        { label: showInspector ? "Hide Properties" : "Show Properties", action: "view:properties" },
      ],
    },
    {
      id: "Arrange",
      items: [
        { label: "Group", action: "arrange:group" },
        { label: "Ungroup", action: "arrange:ungroup" },
        { label: "Bring to Front", action: "arrange:front" },
        { label: "Send to Back", action: "arrange:back" },
        { label: "Align Left", action: "arrange:left" },
        { label: "Align Center", action: "arrange:center" },
        { label: "Align Right", action: "arrange:right" },
      ],
    },
    {
      id: "Extras",
      items: [
        { label: "Flowchart Template", action: "extras:flowchart" },
        { label: "UML Template", action: "extras:uml" },
        { label: "ERD Template", action: "extras:erd" },
        { label: "Network Template", action: "extras:network" },
        { label: "Sequence Template", action: "extras:sequence" },
      ],
    },
    {
      id: "Help",
      items: [
        { label: "Keyboard Shortcuts", action: "help:shortcuts" },
        { label: "About SketchFlow", action: "help:about" },
      ],
    },
  ];

  const storageSummary = formatFileSize(getSerializedDiagramSize(diagram));

  return (
    <div className="sf-shell">
      <div className="sf-announcer" aria-live="polite">
        {statusMessage}
      </div>

      <header className="sf-topbar">
        <div className="sf-topbar-row sf-topbar-row-main">
          <div className="sf-brand">
            <div className="sf-brand-mark">SF</div>
            <div>
              <p className="sf-kicker">Browser Diagramming Studio</p>
              <h1>SketchFlow</h1>
            </div>
          </div>

          <nav className="sf-menubar" aria-label="Application menu">
            {menuSections.map((section) => (
              <div key={section.id} className="sf-menu-group">
                <button
                  type="button"
                  className={`sf-menu-trigger ${activeMenu === section.id ? "active" : ""}`}
                  onClick={() => setActiveMenu((current) => (current === section.id ? null : section.id))}
                >
                  {section.id}
                </button>

                {activeMenu === section.id ? (
                  <div className="sf-menu-popover">
                    {section.items.map((item) => (
                      <button key={item.action} type="button" className="sf-menu-item" onClick={() => runMenuAction(item.action)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>

          <div className="sf-topbar-actions">
            <button type="button" onClick={() => handleApplyTemplate("blank")}>
              New
            </button>
            <button
              type="button"
              onClick={() => {
                refreshStored();
                setShowOpenDialog(true);
              }}
            >
              Open
            </button>
            <button type="button" className="primary" onClick={handleSave}>
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setExportOptions((current) => ({
                  ...current,
                  filename: slugify(diagram.title || "sketchflow-diagram"),
                }));
                setShowExportDialog(true);
              }}
            >
              Export
            </button>
          </div>
        </div>

        <div className="sf-topbar-row sf-topbar-row-sub">
          <div className="sf-title-block">
            <label className="sf-title-label" htmlFor="diagram-title">
              Diagram title
            </label>
            <input
              id="diagram-title"
              className="sf-title-input"
              value={diagram.title}
              maxLength={255}
              onChange={(event) => {
                const nextTitle = event.target.value;
                setDiagram((current) => ({
                  ...current,
                  title: nextTitle,
                  updatedAt: getNow(),
                }));
                setDirty(true);
              }}
            />
            <span className={`sf-save-pill ${dirty ? "dirty" : "saved"}`}>{dirty ? "Unsaved" : "Saved"}</span>
          </div>

          <div className="sf-doc-meta">
            <span>{diagram.width}x{diagram.height}</span>
            <span>{diagram.shapes.length} shapes</span>
            <span>{diagram.connectors.length} connectors</span>
          </div>
        </div>
      </header>

      <div className="sf-main">
        <aside className="sf-panel sf-library">
          <div className="sf-panel-header">
            <div>
              <p className="sf-kicker">Shape Library</p>
              <h2>50+ diagram elements</h2>
            </div>
            <span className="sf-meta-pill">{filteredShapes.length} visible</span>
          </div>

          <div className="sf-field-stack">
            <label className="sf-field">
              <span>Search shapes</span>
              <input
                value={librarySearch}
                onChange={(event) => setLibrarySearch(event.target.value)}
                placeholder="Find by name or category"
              />
            </label>

            <label className="sf-field">
              <span>Category</span>
              <select value={libraryCategory} onChange={(event) => setLibraryCategory(event.target.value)}>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="sf-template-strip">
            {TEMPLATE_OPTIONS.filter((template) => template.id !== "blank").map((template) => (
              <button key={template.id} type="button" className="sf-template-card" onClick={() => handleApplyTemplate(template.id)}>
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </button>
            ))}
          </div>

          <div className="sf-shape-grid">
            {filteredShapes.map((shape) => {
              const preview = buildPreviewShape(shape);
              return (
                <button
                  key={shape.id}
                  type="button"
                  className="sf-shape-card"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/sketchflow-shape", shape.id);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => addShape(shape.id)}
                >
                  <svg viewBox={`0 0 ${preview.width} ${preview.height}`} aria-hidden="true">
                    <g dangerouslySetInnerHTML={{ __html: buildShapeMarkup(preview) }} />
                  </svg>
                  <strong>{shape.name}</strong>
                  <span>{shape.category}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="sf-center">
          <div className="sf-panel sf-toolbar-panel">
            <div className="sf-toolbar-group">
              <span className="sf-toolbar-label">Tool</span>
              <div className="sf-segmented">
                {TOOL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={tool === option.id ? "active" : ""}
                    onClick={() => {
                      setTool(option.id);
                      if (option.id !== "connect") {
                        setConnectorDraft(null);
                      }
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sf-toolbar-group">
              <span className="sf-toolbar-label">History</span>
              <button type="button" onClick={handleUndo} disabled={!undoStack.length}>
                Undo
              </button>
              <button type="button" onClick={handleRedo} disabled={!redoStack.length}>
                Redo
              </button>
            </div>

            <div className="sf-toolbar-group">
              <span className="sf-toolbar-label">Arrange</span>
              <button type="button" onClick={handleGroup} disabled={!canGroup}>
                Group
              </button>
              <button type="button" onClick={handleUngroup} disabled={!canUngroup}>
                Ungroup
              </button>
              <button type="button" onClick={handleBringForward} disabled={!expandedSelectedShapeIds.length}>
                Front
              </button>
              <button type="button" onClick={handleSendBackward} disabled={!expandedSelectedShapeIds.length}>
                Back
              </button>
            </div>

            <div className="sf-toolbar-group">
              <span className="sf-toolbar-label">View</span>
              <button type="button" onClick={() => adjustZoom(-0.1)} disabled={zoom <= MIN_ZOOM}>
                -
              </button>
              <span className="sf-zoom-readout">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => adjustZoom(0.1)} disabled={zoom >= MAX_ZOOM}>
                +
              </button>
              <button
                type="button"
                onClick={() =>
                  commitDiagramChange("Toggle grid", (draft) => {
                    draft.showGrid = !draft.showGrid;
                    return draft;
                  })
                }
              >
                {diagram.showGrid ? "Hide grid" : "Show grid"}
              </button>
              <button
                type="button"
                onClick={() =>
                  commitDiagramChange("Toggle snap to grid", (draft) => {
                    draft.snapToGrid = !draft.snapToGrid;
                    return draft;
                  })
                }
              >
                {diagram.snapToGrid ? "Snap on" : "Snap off"}
              </button>
              <button type="button" className={showInspector ? "active" : ""} onClick={() => setShowInspector((current) => !current)}>
                Properties
              </button>
            </div>
          </div>

          <div className="sf-panel sf-workspace-panel">
            <div className="sf-canvas-head">
              <div>
                <p className="sf-kicker">Interactive Canvas</p>
                <h2>{diagram.title}</h2>
              </div>
              <div className="sf-chip-row">
                <span className="sf-meta-pill">{diagram.shapes.length} shapes</span>
                <span className="sf-meta-pill">{diagram.connectors.length} connectors</span>
                <span className="sf-meta-pill">{storageSummary}</span>
              </div>
            </div>

            <div
              ref={viewportRef}
              className="sf-canvas-viewport"
              role="application"
              aria-label="SketchFlow diagram canvas"
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={(event) => {
                const viewport = viewportRef.current;
                if (!viewport) {
                  return;
                }

                const point = getCanvasPoint(event.clientX, event.clientY, viewport, zoom, pan);
                setCursor({
                  x: clamp(point.x, 0, diagram.width),
                  y: clamp(point.y, 0, diagram.height),
                  inside: true,
                });
              }}
              onPointerLeave={() => setCursor((current) => ({ ...current, inside: false }))}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const typeId = event.dataTransfer.getData("text/sketchflow-shape");
                if (!typeId || !viewportRef.current) {
                  return;
                }

                const point = getCanvasPoint(event.clientX, event.clientY, viewportRef.current, zoom, pan);
                addShape(typeId, point);
              }}
            >
              <div
                className="sf-canvas-stage"
                style={{
                  width: diagram.width,
                  height: diagram.height,
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                }}
              >
                <svg width={diagram.width} height={diagram.height} viewBox={`0 0 ${diagram.width} ${diagram.height}`}>
                  <defs>
                    <pattern
                      id="sf-grid-pattern"
                      width={GRID_SIZE}
                      height={GRID_SIZE}
                      patternUnits="userSpaceOnUse"
                    >
                      <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#d6d6d6" strokeWidth="1" />
                    </pattern>
                    <g dangerouslySetInnerHTML={{ __html: buildMarkerDefinitions() }} />
                  </defs>

                  <rect width={diagram.width} height={diagram.height} fill={diagram.background} rx="28" ry="28" />
                  {diagram.showGrid ? (
                    <rect width={diagram.width} height={diagram.height} fill="url(#sf-grid-pattern)" rx="28" ry="28" />
                  ) : null}

                  {diagram.connectors
                    .slice()
                    .sort((left, right) => left.zIndex - right.zIndex)
                    .map((connector) => (
                      <g
                        key={connector.id}
                        className={`sf-svg-connector ${selectedConnectorId === connector.id ? "selected" : ""}`}
                        onPointerDown={(event) => handleConnectorPointerDown(event, connector.id)}
                        dangerouslySetInnerHTML={{ __html: buildConnectorMarkup(diagram, connector) }}
                      />
                    ))}

                  {selectedConnector && connectorSelectionPath ? (
                    <path className="sf-selection-path" d={connectorSelectionPath} />
                  ) : null}

                  {diagram.shapes
                    .slice()
                    .sort((left, right) => left.zIndex - right.zIndex)
                    .map((shape) => (
                      <g
                        key={shape.id}
                        className={`sf-svg-shape ${expandedSelectedShapeIds.includes(shape.id) ? "selected" : ""}`}
                        onPointerDown={(event) => handleShapePointerDown(event, shape.id)}
                        dangerouslySetInnerHTML={{ __html: buildShapeMarkup(shape) }}
                      />
                    ))}

                  {connectorDraftPath ? <path className="sf-draft-path" d={connectorDraftPath} /> : null}

                  {selectionBounds ? (
                    <>
                      <rect
                        className="sf-selection-box"
                        x={selectionBounds.minX - 8}
                        y={selectionBounds.minY - 8}
                        width={selectionBounds.maxX - selectionBounds.minX + 16}
                        height={selectionBounds.maxY - selectionBounds.minY + 16}
                        rx="14"
                        ry="14"
                      />
                      {selectedShape ? (
                        <>
                          <line
                            className="sf-handle-link"
                            x1={selectedShape.x + selectedShape.width / 2}
                            y1={selectedShape.y - 8}
                            x2={selectedShape.x + selectedShape.width / 2}
                            y2={selectedShape.y - 32}
                          />
                          <circle
                            className="sf-rotate-handle"
                            cx={selectedShape.x + selectedShape.width / 2}
                            cy={selectedShape.y - 38}
                            r="8"
                            onPointerDown={handleRotateHandlePointerDown}
                          />
                          <rect
                            className="sf-resize-handle"
                            x={selectedShape.x + selectedShape.width - 8}
                            y={selectedShape.y + selectedShape.height - 8}
                            width="16"
                            height="16"
                            rx="4"
                            ry="4"
                            onPointerDown={handleResizeHandlePointerDown}
                          />
                        </>
                      ) : null}
                    </>
                  ) : null}
                </svg>
              </div>
            </div>

            <footer className="sf-statusbar">
              <span>Zoom {Math.round(zoom * 100)}%</span>
              <span>
                Cursor {Math.round(cursor.x)}, {Math.round(cursor.y)}
              </span>
              <span>Tool {tool}</span>
              <span>{undoStack.at(-1)?.description ? `Undo next: ${undoStack.at(-1).description}` : "No undo history"}</span>
            </footer>
          </div>
        </section>

        {showInspector ? <div className="sf-inspector-backdrop" onClick={() => setShowInspector(false)} /> : null}

        <aside className={`sf-panel sf-inspector ${showInspector ? "open" : "collapsed"}`} aria-hidden={!showInspector}>
          <div className="sf-panel-header">
            <div>
              <p className="sf-kicker">Properties Panel</p>
              <h2>
                {selectedShape
                  ? selectedShape.label || "Selected shape"
                  : selectedShapes.length > 1
                    ? `${selectedShapes.length} shapes selected`
                    : selectedConnector
                      ? selectedConnector.label || "Selected connector"
                      : "Nothing selected"}
              </h2>
            </div>
            <div className="sf-chip-row">
              {selectedShape || selectedConnector || selectedShapes.length > 1 ? (
                <button type="button" onClick={clearSelection}>
                  Clear
                </button>
              ) : null}
              <button type="button" onClick={() => setShowInspector(false)}>
                Close
              </button>
            </div>
          </div>

          {showInspector && selectedShape ? (
            <div className="sf-inspector-stack">
              <div className="sf-grid-two">
                <label className="sf-field">
                  <span>X</span>
                  <input
                    type="number"
                    value={Math.round(selectedShape.x)}
                    onChange={(event) =>
                      updateSelectedShapes(
                        {
                          x: clamp(Number(event.target.value) || 0, 0, diagram.width - selectedShape.width),
                        },
                        "Move shape",
                      )
                    }
                  />
                </label>
                <label className="sf-field">
                  <span>Y</span>
                  <input
                    type="number"
                    value={Math.round(selectedShape.y)}
                    onChange={(event) =>
                      updateSelectedShapes(
                        {
                          y: clamp(Number(event.target.value) || 0, 0, diagram.height - selectedShape.height),
                        },
                        "Move shape",
                      )
                    }
                  />
                </label>
                <label className="sf-field">
                  <span>Width</span>
                  <input
                    type="number"
                    value={Math.round(selectedShape.width)}
                    onChange={(event) =>
                      updateSelectedShapes(
                        {
                          width: clamp(Number(event.target.value) || selectedShape.width, 48, diagram.width - selectedShape.x),
                        },
                        "Resize shape",
                      )
                    }
                  />
                </label>
                <label className="sf-field">
                  <span>Height</span>
                  <input
                    type="number"
                    value={Math.round(selectedShape.height)}
                    onChange={(event) =>
                      updateSelectedShapes(
                        {
                          height: clamp(Number(event.target.value) || selectedShape.height, 42, diagram.height - selectedShape.y),
                        },
                        "Resize shape",
                      )
                    }
                  />
                </label>
                <label className="sf-field">
                  <span>Rotation</span>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={Math.round(selectedShape.rotation)}
                    onChange={(event) =>
                      updateSelectedShapes(
                        {
                          rotation: clamp(Number(event.target.value) || 0, 0, 360),
                        },
                        "Rotate shape",
                      )
                    }
                  />
                </label>
                <label className="sf-field">
                  <span>Z-index</span>
                  <input
                    type="number"
                    min="1"
                    value={selectedShape.zIndex}
                    onChange={(event) =>
                      updateSelectedShapes(
                        {
                          zIndex: Math.max(1, Number(event.target.value) || 1),
                        },
                        "Change layer order",
                      )
                    }
                  />
                </label>
              </div>

              <label className="sf-field">
                <span>Label</span>
                <textarea
                  rows="4"
                  value={selectedShape.label}
                  onChange={(event) => updateSelectedShapes({ label: event.target.value }, "Edit shape label")}
                />
              </label>

              <div className="sf-grid-two">
                <label className="sf-field">
                  <span>Fill</span>
                  <input type="color" value={selectedShape.fill} onChange={(event) => updateSelectedShapes({ fill: event.target.value }, "Change fill colour")} />
                </label>
                <label className="sf-field">
                  <span>Fill opacity</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={selectedShape.fillOpacity}
                    onChange={(event) => updateSelectedShapes({ fillOpacity: Number(event.target.value) }, "Change fill opacity")}
                  />
                </label>
                <label className="sf-field">
                  <span>Border</span>
                  <input type="color" value={selectedShape.stroke} onChange={(event) => updateSelectedShapes({ stroke: event.target.value }, "Change border colour")} />
                </label>
                <label className="sf-field">
                  <span>Border width</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={selectedShape.strokeWidth}
                    onChange={(event) => updateSelectedShapes({ strokeWidth: clamp(Number(event.target.value) || 0, 0, 10) }, "Change border width")}
                  />
                </label>
                <label className="sf-field">
                  <span>Line style</span>
                  <select value={selectedShape.lineStyle} onChange={(event) => updateSelectedShapes({ lineStyle: event.target.value }, "Change line style")}>
                    {LINE_STYLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sf-field">
                  <span>Font</span>
                  <select value={selectedShape.fontFamily} onChange={(event) => updateSelectedShapes({ fontFamily: event.target.value }, "Change font family")}>
                    {FONT_FAMILIES.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sf-field">
                  <span>Font size</span>
                  <input
                    type="number"
                    min="8"
                    max="72"
                    value={selectedShape.fontSize}
                    onChange={(event) => updateSelectedShapes({ fontSize: clamp(Number(event.target.value) || 8, 8, 72) }, "Change font size")}
                  />
                </label>
                <label className="sf-field">
                  <span>Font colour</span>
                  <input type="color" value={selectedShape.fontColor} onChange={(event) => updateSelectedShapes({ fontColor: event.target.value }, "Change font colour")} />
                </label>
                <label className="sf-field">
                  <span>Text align</span>
                  <select value={selectedShape.textAlign} onChange={(event) => updateSelectedShapes({ textAlign: event.target.value }, "Change text alignment")}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
                <label className="sf-field">
                  <span>Font weight</span>
                  <select value={selectedShape.fontWeight} onChange={(event) => updateSelectedShapes({ fontWeight: Number(event.target.value) }, "Change font weight")}>
                    <option value="400">Regular</option>
                    <option value="600">Semi Bold</option>
                    <option value="700">Bold</option>
                  </select>
                </label>
              </div>

              <div className="sf-toggle-row">
                <label>
                  <input
                    type="checkbox"
                    checked={selectedShape.locked}
                    onChange={(event) =>
                      updateSelectedShapes({ locked: event.target.checked }, "Toggle shape lock", {
                        includeLocked: true,
                      })
                    }
                  />
                  Locked
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedShape.visible}
                    onChange={(event) =>
                      updateSelectedShapes({ visible: event.target.checked }, "Toggle shape visibility", {
                        includeLocked: true,
                      })
                    }
                  />
                  Visible
                </label>
              </div>

              <div className="sf-action-grid">
                <button type="button" onClick={deleteSelection}>
                  Delete Shape
                </button>
              </div>
            </div>
          ) : showInspector && selectedShapes.length > 1 ? (
            <div className="sf-inspector-stack">
              <p className="sf-helper-copy">
                Multi-selection is active. Use the quick tools below for alignment, distribution, grouping, and shared styling.
              </p>
              <div className="sf-action-grid">
                {ALIGN_OPTIONS.map((option) => (
                  <button key={option.id} type="button" onClick={() => handleAlign(option.id)} disabled={!canAlign}>
                    {option.label}
                  </button>
                ))}
                {DISTRIBUTE_OPTIONS.map((option) => (
                  <button key={option.id} type="button" onClick={() => handleDistribute(option.id)} disabled={!canDistribute}>
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="sf-grid-two">
                <label className="sf-field">
                  <span>Fill</span>
                  <input type="color" value={selectedShapes[0].fill} onChange={(event) => updateSelectedShapes({ fill: event.target.value }, "Change fill colour")} />
                </label>
                <label className="sf-field">
                  <span>Border</span>
                  <input type="color" value={selectedShapes[0].stroke} onChange={(event) => updateSelectedShapes({ stroke: event.target.value }, "Change border colour")} />
                </label>
              </div>
            </div>
          ) : showInspector && selectedConnector ? (
            <div className="sf-inspector-stack">
              <div className="sf-grid-two">
                <label className="sf-field">
                  <span>From</span>
                  <select value={selectedConnector.fromId} onChange={(event) => updateConnector({ fromId: event.target.value }, "Change connector source")}>
                    {diagram.shapes.map((shape) => (
                      <option key={shape.id} value={shape.id}>
                        {shape.label || shape.typeId}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sf-field">
                  <span>To</span>
                  <select value={selectedConnector.toId} onChange={(event) => updateConnector({ toId: event.target.value }, "Change connector target")}>
                    {diagram.shapes.map((shape) => (
                      <option key={shape.id} value={shape.id}>
                        {shape.label || shape.typeId}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sf-field">
                  <span>Path</span>
                  <select value={selectedConnector.pathType} onChange={(event) => updateConnector({ pathType: event.target.value }, "Change connector path")}>
                    {PATH_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sf-field">
                  <span>Label position</span>
                  <select value={selectedConnector.labelPosition} onChange={(event) => updateConnector({ labelPosition: event.target.value }, "Change connector label position")}>
                    {LABEL_POSITION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sf-field">
                  <span>Line colour</span>
                  <input type="color" value={selectedConnector.lineColor} onChange={(event) => updateConnector({ lineColor: event.target.value }, "Change connector colour")} />
                </label>
                <label className="sf-field">
                  <span>Line width</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={selectedConnector.lineWidth}
                    onChange={(event) => updateConnector({ lineWidth: clamp(Number(event.target.value) || 1, 1, 10) }, "Change connector width")}
                  />
                </label>
                <label className="sf-field">
                  <span>Line style</span>
                  <select value={selectedConnector.lineStyle} onChange={(event) => updateConnector({ lineStyle: event.target.value }, "Change connector style")}>
                    {LINE_STYLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sf-field">
                  <span>Start arrow</span>
                  <select value={selectedConnector.startArrow} onChange={(event) => updateConnector({ startArrow: event.target.value }, "Change start arrow")}>
                    {ARROW_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sf-field">
                  <span>End arrow</span>
                  <select value={selectedConnector.endArrow} onChange={(event) => updateConnector({ endArrow: event.target.value }, "Change end arrow")}>
                    {ARROW_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sf-field">
                  <span>Font size</span>
                  <input
                    type="number"
                    min="8"
                    max="48"
                    value={selectedConnector.fontSize}
                    onChange={(event) => updateConnector({ fontSize: clamp(Number(event.target.value) || 8, 8, 48) }, "Change connector font size")}
                  />
                </label>
                <label className="sf-field">
                  <span>Font colour</span>
                  <input type="color" value={selectedConnector.fontColor} onChange={(event) => updateConnector({ fontColor: event.target.value }, "Change connector font colour")} />
                </label>
              </div>
              <label className="sf-field">
                <span>Connector label</span>
                <input value={selectedConnector.label} onChange={(event) => updateConnector({ label: event.target.value }, "Edit connector label")} />
              </label>
              <div className="sf-toggle-row">
                <label>
                  <input
                    type="checkbox"
                    checked={selectedConnector.locked}
                    onChange={(event) =>
                      updateConnector({ locked: event.target.checked }, "Toggle connector lock", {
                        includeLocked: true,
                      })
                    }
                  />
                  Locked
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedConnector.visible}
                    onChange={(event) =>
                      updateConnector({ visible: event.target.checked }, "Toggle connector visibility", {
                        includeLocked: true,
                      })
                    }
                  />
                  Visible
                </label>
              </div>

              <div className="sf-action-grid">
                <button type="button" onClick={deleteSelection}>
                  Delete Connector
                </button>
              </div>
            </div>
          ) : showInspector ? (
            <div className="sf-empty-state">
              <p>
                Select a shape or connector to edit its properties. The editor currently supports templates, drag-and-drop shapes,
                auto-routed connectors, history, layer controls, local storage, and PNG/SVG export.
              </p>
              <div className="sf-action-grid">
                <button type="button" onClick={handleCopy} disabled={!expandedSelectedShapeIds.length}>
                  Copy
                </button>
                <button type="button" onClick={handlePaste} disabled={!clipboard?.shapes?.length}>
                  Paste
                </button>
                <button type="button" onClick={deleteSelection} disabled={!expandedSelectedShapeIds.length && !selectedConnectorId}>
                  Delete
                </button>
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      {showOpenDialog ? (
        <div className="sf-modal-backdrop" role="presentation" onClick={() => setShowOpenDialog(false)}>
          <div className="sf-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="sf-modal-head">
              <div>
                <p className="sf-kicker">Local Storage</p>
                <h2>Saved diagrams</h2>
              </div>
              <button type="button" onClick={() => setShowOpenDialog(false)}>
                Close
              </button>
            </div>

            {storedDiagrams.length ? (
              <div className="sf-saved-list">
                {storedDiagrams.map((stored) => (
                  <article key={stored.id} className="sf-saved-card">
                    <div>
                      <strong>{stored.title}</strong>
                      <p>{stored.subtitle}</p>
                      <p>
                        Modified {stored.modifiedLabel} · {formatFileSize(stored.fileSize)}
                      </p>
                    </div>
                    <div className="sf-chip-row">
                      <button type="button" onClick={() => handleOpen(stored.id)}>
                        Open
                      </button>
                      <button type="button" onClick={() => handleDeleteStored(stored.id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="sf-helper-copy">No saved diagrams yet. Save the current canvas to create your first local file.</p>
            )}
          </div>
        </div>
      ) : null}

      {showExportDialog ? (
        <div className="sf-modal-backdrop" role="presentation" onClick={() => setShowExportDialog(false)}>
          <div className="sf-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="sf-modal-head">
              <div>
                <p className="sf-kicker">Export</p>
                <h2>Download diagram</h2>
              </div>
              <button type="button" onClick={() => setShowExportDialog(false)}>
                Close
              </button>
            </div>

            <div className="sf-grid-two">
              <label className="sf-field">
                <span>Format</span>
                <select value={exportOptions.format} onChange={(event) => setExportOptions((current) => ({ ...current, format: event.target.value }))}>
                  <option value="png">PNG</option>
                  <option value="svg">SVG</option>
                </select>
              </label>
              <label className="sf-field">
                <span>Scale</span>
                <select value={exportOptions.scale} onChange={(event) => setExportOptions((current) => ({ ...current, scale: Number(event.target.value) }))}>
                  <option value="1">100%</option>
                  <option value="1.5">150%</option>
                  <option value="2">200%</option>
                </select>
              </label>
            </div>

            <label className="sf-field">
              <span>Filename prefix</span>
              <input value={exportOptions.filename} onChange={(event) => setExportOptions((current) => ({ ...current, filename: event.target.value }))} />
            </label>

            <label className="sf-checkbox-field">
              <input
                type="checkbox"
                checked={exportOptions.transparentBackground}
                onChange={(event) => setExportOptions((current) => ({ ...current, transparentBackground: event.target.checked }))}
              />
              Transparent background
            </label>

            <div className="sf-modal-actions">
              <button type="button" className="primary" onClick={handleExport}>
                Export {exportOptions.format.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showHelpDialog ? (
        <div className="sf-modal-backdrop" role="presentation" onClick={() => setShowHelpDialog(false)}>
          <div className="sf-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="sf-modal-head">
              <div>
                <p className="sf-kicker">Help</p>
                <h2>SketchFlow shortcuts and tips</h2>
              </div>
              <button type="button" onClick={() => setShowHelpDialog(false)}>
                Close
              </button>
            </div>

            <div className="sf-help-grid">
              <p><strong>Ctrl/Cmd + S</strong> Save diagram</p>
              <p><strong>Ctrl/Cmd + O</strong> Open saved diagram</p>
              <p><strong>Ctrl/Cmd + E</strong> Export diagram</p>
              <p><strong>Ctrl/Cmd + Z / Y</strong> Undo or redo</p>
              <p><strong>Ctrl/Cmd + C / V / X</strong> Copy, paste, or cut shapes</p>
              <p><strong>Delete</strong> Remove the current selection</p>
              <p><strong>Arrow keys</strong> Move selected shapes</p>
              <p><strong>Shift + Arrow</strong> Move selected shapes faster</p>
              <p><strong>G / Shift + G</strong> Group or ungroup</p>
              <p><strong>Escape</strong> Close menus, inspector, and current selection</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
