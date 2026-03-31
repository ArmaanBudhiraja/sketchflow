import { buildSvgMarkup } from "./render";

function triggerDownload(blob, filename) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportDiagramAsSvg(diagram, options = {}) {
  const markup = buildSvgMarkup(diagram, options);
  const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });

  triggerDownload(blob, options.filename ?? "sketchflow-diagram.svg");
}

export async function exportDiagramAsPng(diagram, options = {}) {
  const markup = buildSvgMarkup(diagram, options);
  const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(blob);
  const image = new Image();
  const scale = options.scale ?? 1;
  const canvas = document.createElement("canvas");

  canvas.width = Math.round(diagram.width * scale);
  canvas.height = Math.round(diagram.height * scale);

  const context = canvas.getContext("2d");

  if (!context) {
    URL.revokeObjectURL(svgUrl);
    throw new Error("PNG export is unavailable because the canvas context could not be created.");
  }

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = svgUrl;
  });

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  URL.revokeObjectURL(svgUrl);

  const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

  if (!pngBlob) {
    throw new Error("The PNG export could not be generated.");
  }

  triggerDownload(pngBlob, options.filename ?? "sketchflow-diagram.png");
}
