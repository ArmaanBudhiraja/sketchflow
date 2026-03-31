import { STORAGE_PREFIX, formatTimestamp, getSerializedDiagramSize, normalizeDiagram } from "./data";

function buildStorageKey(diagramId) {
  return `${STORAGE_PREFIX}${diagramId}`;
}

export function listStoredDiagrams() {
  if (typeof window === "undefined") {
    return [];
  }

  const diagrams = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key || !key.startsWith(STORAGE_PREFIX)) {
      continue;
    }

    try {
      const rawValue = window.localStorage.getItem(key);

      if (!rawValue) {
        continue;
      }

      const diagram = normalizeDiagram(JSON.parse(rawValue));
      diagrams.push({
        id: diagram.id,
        title: diagram.title,
        createdAt: diagram.createdAt,
        updatedAt: diagram.updatedAt,
        savedAt: diagram.savedAt,
        shapeCount: diagram.shapes.length,
        connectorCount: diagram.connectors.length,
        fileSize: getSerializedDiagramSize(diagram),
        subtitle: `${diagram.shapes.length} shapes · ${diagram.connectors.length} connectors`,
        modifiedLabel: formatTimestamp(diagram.updatedAt ?? diagram.savedAt),
      });
    } catch (error) {
      diagrams.push({
        id: key.replace(STORAGE_PREFIX, ""),
        title: "Unreadable diagram",
        createdAt: "",
        updatedAt: "",
        savedAt: "",
        shapeCount: 0,
        connectorCount: 0,
        fileSize: 0,
        subtitle: "Invalid data",
        modifiedLabel: "Unknown",
      });
    }
  }

  return diagrams.sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));
}

export function saveDiagram(diagram) {
  const serialized = JSON.stringify(diagram);
  const fileSize = new Blob([serialized]).size;

  if (fileSize > 5 * 1024 * 1024) {
    throw new Error("This diagram is larger than the 5 MB local-storage limit in the spec.");
  }

  window.localStorage.setItem(buildStorageKey(diagram.id), serialized);

  return {
    id: diagram.id,
    fileSize,
  };
}

export function loadDiagram(diagramId) {
  const rawValue = window.localStorage.getItem(buildStorageKey(diagramId));

  if (!rawValue) {
    throw new Error("That saved diagram could not be found in local storage.");
  }

  return normalizeDiagram(JSON.parse(rawValue));
}

export function deleteDiagram(diagramId) {
  window.localStorage.removeItem(buildStorageKey(diagramId));
}
