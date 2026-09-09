// Use only fixed table dimensions and viewport dimensions. Body motion must
// never participate in camera projection, including after a pointer release.
export function trayFrustum(width: number, depth: number, aspect: number, sizeMultiplier = 1) {
  const safeAspect = Math.max(.1, aspect);
  const margin = 1.15;
  // Desktop uses the close projection; the regular tray keeps more breathing room.
  const space = Math.max(1, 2 / sizeMultiplier);
  const halfHeight = Math.max((depth / 2 + margin) * space, (width / 2 + margin) * space / safeAspect);
  return { left: -halfHeight*safeAspect, right:halfHeight*safeAspect, top:halfHeight, bottom:-halfHeight };
}
