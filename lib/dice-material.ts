import * as T from 'three';
import type { DiceAppearance } from './dice-appearance';

// Vertex colors travel with the die. No shader injection or changes to geometry
// positions, face ordering, collision hulls, or physics.
export function diceMaterial(
  g: T.BufferGeometry,
  a: DiceAppearance,
  kept: boolean,
  reduced: boolean,
) {
  const base = new T.Color(a.body),
    second = new T.Color(a.secondary),
    glitter = new T.Color(a.sparkle);
  const p = g.getAttribute('position');
  const colors = [];
  for (let i = 0; i < p.count; i++) {
    const c = base.clone();
    if (a.style === 'gradient')
      c.lerp(second, T.MathUtils.clamp((p.getY(i) + 1) / 2, 0, 1));
    if (a.style === 'dark') c.multiplyScalar(0.3);
    if (!kept) c.multiplyScalar(0.42);
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  const material = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: a.style === 'dark' ? 0.95 : a.style === 'metallic' ? 0.22 : 0.35,
    metalness: a.style === 'metallic' ? 0.85 : 0.12,
    flatShading: true,
  });
  if (a.style === 'sparkly' && !reduced) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#777777';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = glitter.getStyle();
    for (let i = 0; i < Math.round(220 * a.intensity); i++)
      ctx.fillRect(
        (i * 47) % 128,
        (i * 73 + Math.floor(i / 128) * 19) % 128,
        2,
        2,
      );
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    // Polyhedra lack UVs, so assign a stable local projection for flecks.
    const uv = [];
    for (let i = 0; i < p.count; i++)
      uv.push((p.getX(i) + p.getZ(i) + 2) / 4, (p.getY(i) + 1) / 2);
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    material.map = texture;
    material.emissive.copy(glitter);
    material.emissiveMap = texture;
    material.emissiveIntensity = 0.12 * a.intensity;
    material.roughness = 0.18;
  }
  return material;
}
