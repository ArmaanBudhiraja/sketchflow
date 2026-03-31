import {
  getConnectorGeometry,
  getConnectorLabelPoint,
  getConnectorPathData,
  getLineDash,
  getShapeDefinition,
} from "./data";

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatNumber(value) {
  return Number.parseFloat(Number(value ?? 0).toFixed(2));
}

function getTextAnchor(textAlign) {
  if (textAlign === "left") {
    return { x: 16, anchor: "start" };
  }

  if (textAlign === "right") {
    return { x: "calc-right", anchor: "end" };
  }

  return { x: "center", anchor: "middle" };
}

function buildTextMarkup(shape, options = {}) {
  const lines = String(shape.label ?? "")
    .split("\n")
    .filter(Boolean);

  if (!lines.length) {
    return "";
  }

  const anchorInfo = getTextAnchor(shape.textAlign);
  const x =
    anchorInfo.x === "center" ? shape.width / 2 : anchorInfo.x === "calc-right" ? shape.width - 16 : anchorInfo.x;
  const fontSize = options.fontSize ?? shape.fontSize;
  const startY = options.startY ?? shape.height / 2 - ((lines.length - 1) * (fontSize + 3)) / 2;

  return lines
    .map((line, index) => {
      const y = startY + index * (fontSize + 3);

      return `<text x="${formatNumber(x)}" y="${formatNumber(y)}" fill="${escapeXml(shape.fontColor)}" font-family="${escapeXml(
        shape.fontFamily,
      )}" font-size="${fontSize}" font-weight="${shape.fontWeight}" font-style="${escapeXml(
        shape.fontStyle,
      )}" text-decoration="${escapeXml(shape.textDecoration)}" text-anchor="${anchorInfo.anchor}" dominant-baseline="middle">${escapeXml(line)}</text>`;
    })
    .join("");
}

function buildPrimitiveMarkup(shape) {
  const fill = escapeXml(shape.fill);
  const stroke = escapeXml(shape.stroke);
  const dash = getLineDash(shape.lineStyle);
  const common = `fill="${fill}" fill-opacity="${shape.fillOpacity}" stroke="${stroke}" stroke-width="${shape.strokeWidth}"${dash ? ` stroke-dasharray="${dash}"` : ""}`;
  const width = shape.width;
  const height = shape.height;

  if (shape.primitive === "rounded") {
    return `<rect x="0" y="0" width="${width}" height="${height}" rx="18" ry="18" ${common} />`;
  }

  if (shape.primitive === "circle") {
    return `<circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 2 - shape.strokeWidth}" ${common} />`;
  }

  if (shape.primitive === "ellipse" || shape.primitive === "derived-ellipse") {
    const extra = shape.primitive === "derived-ellipse" ? ` stroke-dasharray="8 6"` : dash ? ` stroke-dasharray="${dash}"` : "";
    return `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2 - shape.strokeWidth}" ry="${
      height / 2 - shape.strokeWidth
    }" fill="${fill}" fill-opacity="${shape.fillOpacity}" stroke="${stroke}" stroke-width="${shape.strokeWidth}"${extra} />`;
  }

  if (shape.primitive === "double-ellipse") {
    return [
      `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2 - shape.strokeWidth}" ry="${
        height / 2 - shape.strokeWidth
      }" ${common} />`,
      `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2 - shape.strokeWidth - 8}" ry="${
        height / 2 - shape.strokeWidth - 8
      }" fill="none" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`,
    ].join("");
  }

  if (shape.primitive === "diamond" || shape.primitive === "double-diamond") {
    const points = `${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}`;
    const outer = `<polygon points="${points}" ${common} />`;

    if (shape.primitive !== "double-diamond") {
      return outer;
    }

    const inset = 10;
    const innerPoints = `${width / 2},${inset} ${width - inset},${height / 2} ${width / 2},${height - inset} ${inset},${height / 2}`;
    return `${outer}<polygon points="${innerPoints}" fill="none" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`;
  }

  if (shape.primitive === "hexagon") {
    return `<polygon points="${width * 0.18},0 ${width * 0.82},0 ${width},${height / 2} ${width * 0.82},${height} ${
      width * 0.18
    },${height} 0,${height / 2}" ${common} />`;
  }

  if (shape.primitive === "triangle") {
    return `<polygon points="${width / 2},0 ${width},${height} 0,${height}" ${common} />`;
  }

  if (shape.primitive === "parallelogram") {
    return `<polygon points="${width * 0.16},0 ${width},0 ${width * 0.84},${height} 0,${height}" ${common} />`;
  }

  if (shape.primitive === "manual-input") {
    return `<polygon points="${width * 0.18},0 ${width},0 ${width * 0.82},${height} 0,${height}" ${common} />`;
  }

  if (shape.primitive === "trapezoid") {
    return `<polygon points="${width * 0.18},0 ${width * 0.82},0 ${width},${height} 0,${height}" ${common} />`;
  }

  if (shape.primitive === "terminator") {
    return `<rect x="0" y="0" width="${width}" height="${height}" rx="${height / 2}" ry="${height / 2}" ${common} />`;
  }

  if (shape.primitive === "double-rectangle") {
    return [
      `<rect x="0" y="0" width="${width}" height="${height}" ${common} />`,
      `<rect x="9" y="9" width="${width - 18}" height="${height - 18}" fill="none" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`,
    ].join("");
  }

  if (shape.primitive === "note") {
    const fold = 24;
    return `<path d="M0 0 H${width - fold} L${width} ${fold} V${height} H0 Z M${width - fold} 0 V${fold} H${width}" ${common} />`;
  }

  if (shape.primitive === "document") {
    return `<path d="M0 0 H${width} V${height - 18} C${width * 0.78} ${height + 5}, ${width * 0.42} ${height - 28}, 0 ${
      height - 10
    } Z" ${common} />`;
  }

  if (shape.primitive === "display") {
    return `<path d="M0 10 Q0 0 10 0 H${width - 22} Q${width} ${height / 2} ${width - 22} ${height} H10 Q0 ${height} 0 ${
      height - 10
    } Z" ${common} />`;
  }

  if (shape.primitive === "delay") {
    return `<path d="M0 0 H${width - height / 2} A${height / 2} ${height / 2} 0 0 1 ${width - height / 2} ${height} H0 Z" ${common} />`;
  }

  if (shape.primitive === "cylinder" || shape.primitive === "database") {
    const ellipseHeight = 18;
    return [
      `<ellipse cx="${width / 2}" cy="${ellipseHeight}" rx="${width / 2 - 4}" ry="${ellipseHeight}" fill="${fill}" fill-opacity="${shape.fillOpacity}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`,
      `<path d="M4 ${ellipseHeight} V${height - ellipseHeight} C4 ${height - 8}, ${width - 4} ${height - 8}, ${width - 4} ${height - ellipseHeight} V${ellipseHeight}" fill="${fill}" fill-opacity="${shape.fillOpacity}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`,
      `<ellipse cx="${width / 2}" cy="${height - ellipseHeight}" rx="${width / 2 - 4}" ry="${ellipseHeight}" fill="${fill}" fill-opacity="0" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`,
    ].join("");
  }

  if (shape.primitive === "cloud") {
    return `<path d="M${width * 0.2} ${height * 0.74} C${width * 0.08} ${height * 0.74}, ${width * 0.05} ${height * 0.48}, ${
      width * 0.19
    } ${height * 0.46} C${width * 0.2} ${height * 0.24}, ${width * 0.4} ${height * 0.14}, ${width * 0.54} ${
      height * 0.24
    } C${width * 0.62} ${height * 0.07}, ${width * 0.86} ${height * 0.16}, ${width * 0.87} ${height * 0.36} C${width} ${
      height * 0.38
    }, ${width} ${height * 0.72}, ${width * 0.82} ${height * 0.74} Z" ${common} />`;
  }

  if (shape.primitive === "package") {
    return `<path d="M0 24 H${width * 0.34} V0 H${width * 0.6} V24 H${width} V${height} H0 Z" ${common} />`;
  }

  if (shape.primitive === "component") {
    return [
      `<rect x="0" y="0" width="${width}" height="${height}" rx="14" ry="14" ${common} />`,
      `<rect x="${width - 28}" y="18" width="18" height="10" fill="none" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`,
      `<rect x="${width - 28}" y="38" width="18" height="10" fill="none" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`,
    ].join("");
  }

  if (shape.primitive === "node") {
    return [
      `<polygon points="16,0 ${width},0 ${width - 16},16 0,16" ${common} />`,
      `<rect x="0" y="16" width="${width - 16}" height="${height - 16}" ${common} />`,
      `<path d="M${width - 16} 16 V${height} M0 16 L16 0" fill="none" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`,
    ].join("");
  }

  if (shape.primitive === "actor") {
    const headRadius = 16;
    const midX = width / 2;
    return [
      `<circle cx="${midX}" cy="${headRadius + 6}" r="${headRadius}" fill="${fill}" fill-opacity="${shape.fillOpacity}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`,
      `<path d="M${midX} ${headRadius * 2 + 8} V${height - 44} M${midX - 34} ${headRadius * 3 + 10} H${midX + 34} M${midX} ${
        height - 44
      } L${midX - 28} ${height - 12} M${midX} ${height - 44} L${midX + 28} ${height - 12}" fill="none" stroke="${stroke}" stroke-width="${
        shape.strokeWidth
      }" />`,
    ].join("");
  }

  if (shape.primitive === "class-box" || shape.primitive === "object-box") {
    const separatorOne = Math.max(34, height * 0.28);
    const separatorTwo = Math.max(separatorOne + 26, height * 0.58);
    const markup = [`<rect x="0" y="0" width="${width}" height="${height}" ${common} />`];

    if (shape.primitive === "class-box") {
      markup.push(`<line x1="0" y1="${separatorOne}" x2="${width}" y2="${separatorOne}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`);
      markup.push(`<line x1="0" y1="${separatorTwo}" x2="${width}" y2="${separatorTwo}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`);
    }

    return markup.join("");
  }

  if (shape.primitive === "lifeline") {
    const headerHeight = 46;
    return [
      `<rect x="0" y="0" width="${width}" height="${headerHeight}" rx="14" ry="14" ${common} />`,
      `<line x1="${width / 2}" y1="${headerHeight}" x2="${width / 2}" y2="${height}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" stroke-dasharray="8 8" />`,
    ].join("");
  }

  if (shape.primitive === "server") {
    return [
      `<rect x="0" y="0" width="${width}" height="${height}" rx="16" ry="16" ${common} />`,
      `<line x1="16" y1="28" x2="${width - 16}" y2="28" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`,
      `<circle cx="${width - 26}" cy="14" r="3.5" fill="${stroke}" />`,
      `<circle cx="${width - 40}" cy="14" r="3.5" fill="${stroke}" />`,
    ].join("");
  }

  if (shape.primitive === "laptop") {
    return [
      `<rect x="16" y="8" width="${width - 32}" height="${height - 40}" rx="12" ry="12" ${common} />`,
      `<path d="M0 ${height - 28} H${width} L${width - 22} ${height} H22 Z" ${common} />`,
    ].join("");
  }

  if (shape.primitive === "desktop") {
    return [
      `<rect x="14" y="8" width="${width - 28}" height="${height - 42}" rx="12" ry="12" ${common} />`,
      `<line x1="${width / 2}" y1="${height - 34}" x2="${width / 2}" y2="${height - 14}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`,
      `<line x1="${width / 2 - 28}" y1="${height - 10}" x2="${width / 2 + 28}" y2="${height - 10}" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`,
    ].join("");
  }

  if (shape.primitive === "router") {
    const radius = Math.min(width, height) / 2 - 6;
    return [
      `<circle cx="${width / 2}" cy="${height / 2}" r="${radius}" ${common} />`,
      `<path d="M${width / 2} ${height * 0.2} V${height * 0.8} M${width * 0.2} ${height / 2} H${width * 0.8} M${width * 0.33} ${
        height * 0.33
      } L${width * 0.67} ${height * 0.67} M${width * 0.67} ${height * 0.33} L${width * 0.33} ${height * 0.67}" fill="none" stroke="${stroke}" stroke-width="${
        shape.strokeWidth
      }" />`,
    ].join("");
  }

  if (shape.primitive === "switch") {
    return [
      `<rect x="0" y="0" width="${width}" height="${height}" rx="14" ry="14" ${common} />`,
      ...[0, 1, 2, 3].map((index) => {
        const x = 18 + index * 32;
        return `<rect x="${x}" y="${height / 2 - 8}" width="18" height="16" fill="none" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`;
      }),
    ].join("");
  }

  if (shape.primitive === "firewall") {
    return [
      `<rect x="0" y="0" width="${width}" height="${height}" rx="14" ry="14" ${common} />`,
      ...[0, 1, 2].map((row) => {
        const offset = row % 2 === 0 ? 18 : 34;
        const y = 16 + row * 20;
        return `<path d="M${offset} ${y} H${offset + 24} V${y + 10} H${offset + 48} V${y + 20}" fill="none" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`;
      }),
    ].join("");
  }

  if (shape.primitive === "phone") {
    return [
      `<rect x="10" y="0" width="${width - 20}" height="${height}" rx="20" ry="20" ${common} />`,
      `<line x1="${width / 2 - 22}" y1="16" x2="${width / 2 + 22}" y2="16" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`,
      `<circle cx="${width / 2}" cy="${height - 18}" r="5" fill="none" stroke="${stroke}" stroke-width="${shape.strokeWidth}" />`,
    ].join("");
  }

  return `<rect x="0" y="0" width="${width}" height="${height}" ${common} />`;
}

export function buildShapeMarkup(shape) {
  const primitiveMarkup = buildPrimitiveMarkup(shape);
  const definition = getShapeDefinition(shape.typeId);
  const labelStartY = definition.primitive === "lifeline" ? 24 : definition.primitive === "actor" ? shape.height - 10 : undefined;
  const labelFontSize = definition.primitive === "lifeline" ? Math.min(shape.fontSize, 14) : shape.fontSize;
  const labelMarkup = buildTextMarkup(shape, { startY: labelStartY, fontSize: labelFontSize });
  const transform = `translate(${formatNumber(shape.x)} ${formatNumber(shape.y)}) rotate(${shape.rotation} ${formatNumber(
    shape.width / 2,
  )} ${formatNumber(shape.height / 2)})`;
  const extraDecoration =
    shape.typeId === "key-attribute"
      ? `<line x1="20" y1="${shape.height / 2 + shape.fontSize / 2 + 6}" x2="${shape.width - 20}" y2="${
          shape.height / 2 + shape.fontSize / 2 + 6
        }" stroke="${escapeXml(shape.fontColor)}" stroke-width="1.5" />`
      : "";

  return `<g transform="${transform}" opacity="${shape.visible ? 1 : 0.35}">${primitiveMarkup}${extraDecoration}${labelMarkup}</g>`;
}

export function buildConnectorMarkup(diagram, connector) {
  const geometry = getConnectorGeometry(diagram, connector);

  if (!geometry) {
    return "";
  }

  const pathData = getConnectorPathData(geometry, connector.pathType);
  const dash = getLineDash(connector.lineStyle);
  const labelPoint = getConnectorLabelPoint(geometry, connector);
  const markerStart =
    connector.startArrow && connector.startArrow !== "none" ? ` marker-start="url(#sf-marker-${connector.startArrow})"` : "";
  const markerEnd =
    connector.endArrow && connector.endArrow !== "none" ? ` marker-end="url(#sf-marker-${connector.endArrow})"` : "";
  const labelMarkup = connector.label
    ? `<text x="${formatNumber(labelPoint.x)}" y="${formatNumber(labelPoint.y)}" fill="${escapeXml(
        connector.fontColor,
      )}" font-family="${escapeXml(connector.fontFamily)}" font-size="${connector.fontSize}" text-anchor="middle">${escapeXml(
        connector.label,
      )}</text>`
    : "";

  return `<g color="${escapeXml(connector.lineColor)}" opacity="${connector.visible ? 1 : 0.35}"><path d="${pathData}" fill="none" stroke="${escapeXml(
    connector.lineColor,
  )}" stroke-width="${connector.lineWidth}" stroke-opacity="${connector.lineOpacity}"${dash ? ` stroke-dasharray="${dash}"` : ""}${markerStart}${markerEnd} />${labelMarkup}</g>`;
}

export function buildMarkerDefinitions() {
  return `
    <marker id="sf-marker-open" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10" fill="none" stroke="currentColor" stroke-width="1.5" />
    </marker>
    <marker id="sf-marker-closed" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto-start-reverse">
      <path d="M0 0 L12 6 L0 12 Z" fill="currentColor" />
    </marker>
    <marker id="sf-marker-diamond" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto-start-reverse">
      <path d="M0 7 L6 0 L14 7 L6 14 Z" fill="currentColor" />
    </marker>
    <marker id="sf-marker-circle" markerWidth="12" markerHeight="12" refX="8" refY="6" orient="auto-start-reverse">
      <circle cx="6" cy="6" r="4" fill="currentColor" />
    </marker>
  `;
}

export function buildSvgMarkup(diagram, options = {}) {
  const scale = options.scale ?? 1;
  const width = diagram.width * scale;
  const height = diagram.height * scale;
  const background = options.transparentBackground ? "transparent" : diagram.background;
  const connectorMarkup = diagram.connectors
    .slice()
    .sort((left, right) => left.zIndex - right.zIndex)
    .map((connector) => buildConnectorMarkup(diagram, connector))
    .join("");
  const shapeMarkup = diagram.shapes
    .slice()
    .sort((left, right) => left.zIndex - right.zIndex)
    .map((shape) => buildShapeMarkup(shape))
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${diagram.width} ${
    diagram.height
  }" role="img" aria-label="${escapeXml(diagram.title)}">
  <defs>${buildMarkerDefinitions()}</defs>
  <rect width="100%" height="100%" fill="${escapeXml(background)}" />
  ${connectorMarkup}
  ${shapeMarkup}
</svg>`;
}
