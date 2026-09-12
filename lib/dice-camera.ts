// Use only fixed table dimensions and viewport dimensions. Body motion must
// never participate in camera projection, including after a pointer release.
export function trayFrustum(width: number, depth: number, aspect: number, sizeMultiplier = 1) {
  const safeAspect = Math.max(.1, aspect);
  // Frame the table without invisible padding. Physics walls are extended to
  // these viewport edges before interaction; die size never changes the camera.
  const halfHeight = Math.max(depth / 2, width / 2 / safeAspect);
  return { left: -halfHeight*safeAspect, right:halfHeight*safeAspect, top:halfHeight, bottom:-halfHeight };
}
