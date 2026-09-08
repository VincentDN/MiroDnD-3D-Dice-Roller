'use client';
import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { geometry, facesOf } from '@/lib/dice-geometry';
import type { Roll } from '@/lib/dice';
export default function DiceStage({
  roll,
  transparent = false,
  color = '#32a6c8',
}: {
  roll: Roll | null;
  transparent?: boolean;
  color?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const update = useRef<(r: Roll | null) => void>(() => {});
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = host.current!;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const scene = new T.Scene(),
      camera = new T.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 9, 11);
    camera.lookAt(0, 0, 0);
    scene.add(new T.HemisphereLight(0xcdefff, 0x294351, 3));
    const light = new T.DirectionalLight(0xffffff, 4);
    light.position.set(-3, 10, 5);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    scene.add(light);
    const floor = new T.Mesh(
      new T.PlaneGeometry(100, 100),
      new T.ShadowMaterial({ opacity: transparent ? 0.18 : 0.35 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    floor.receiveShadow = true;
    scene.add(floor);
    let objects: {
        group: T.Group;
        target: T.Quaternion;
        start: T.Quaternion;
        x: number;
        z: number;
        phase: number;
        height: number;
      }[] = [],
      start = 0,
      frame = 0,
      disposed = false;
    function clear() {
      for (const o of objects) {
        scene.remove(o.group);
        o.group.traverse((child: any) => {
          child.geometry?.dispose();
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];
          for (const m of mats) {
            m?.map?.dispose();
            m?.dispose();
          }
        });
      }
      objects = [];
    }
    function show(r: Roll | null) {
      clear();
      const dice = r
        ? r.dice.flatMap((d) =>
            d.sides === 100
              ? [
                  {
                    ...d,
                    sides: 10,
                    value: Math.floor((d.value % 100) / 10) + 1,
                    tens: true,
                  },
                  { ...d, sides: 10, value: (d.value % 10) + 1, units: true },
                ]
              : [d],
          )
        : [
            { sides: 20, value: 20, kept: true },
            { sides: 12, value: 12, kept: true },
          ];
      const cols = Math.min(8, Math.ceil(Math.sqrt(dice.length * 1.7))),
        rows = Math.ceil(dice.length / cols);
      const spread = dice.length > 12 ? 1.75 : 2.2;
      camera.position.set(0, Math.max(9, rows * 2.5), Math.max(11, cols * 2));
      camera.lookAt(0, 0, 0);
      dice.forEach((die: any, i) => {
        const group = new T.Group(),
          g = geometry(die.sides),
          faces = facesOf(g),
          c = new T.Color(r?.color || color);
        if (!die.kept) c.multiplyScalar(0.42);
        const material = new T.MeshStandardMaterial({
          color: c,
          roughness: 0.3,
          metalness: 0.18,
          flatShading: true,
        });
        const mesh = new T.Mesh(g, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        const edges = new T.LineSegments(
          new T.EdgesGeometry(g),
          new T.LineBasicMaterial({
            color: c.clone().lerp(new T.Color('white'), 0.32),
            transparent: true,
            opacity: 0.45,
          }),
        );
        group.add(edges);
        faces.forEach((f, j) => {
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#f3f5ea';
          ctx.font = 'bold 76px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const v = die.tens
            ? String(j * 10).padStart(2, '0')
            : die.units
              ? String(j)
              : String(j + 1);
          ctx.fillText(v, 64, 64);
          if (v === '6' || v === '9') {
            ctx.fillRect(50, 105, 28, 4);
          }
          const texture = new T.CanvasTexture(canvas);
          texture.colorSpace = T.SRGBColorSpace;
          const size = die.sides === 20 ? 0.55 : die.sides === 4 ? 0.65 : 0.72;
          const label = new T.Mesh(
            new T.PlaneGeometry(size, size),
            new T.MeshBasicMaterial({
              map: texture,
              transparent: true,
              depthWrite: false,
              polygonOffset: true,
              polygonOffsetFactor: -1,
            }),
          );
          label.position.copy(f.center).addScaledVector(f.normal, 0.009);
          label.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), f.normal);
          group.add(label);
        });
        const normal = faces[Math.min(die.value - 1, faces.length - 1)].normal;
        const target = new T.Quaternion().setFromUnitVectors(
          normal,
          new T.Vector3(0, 1, 0),
        );
        target.premultiply(
          new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -0.2),
        );
        // Set the actual lowest vertex on the table after orienting the chosen face up.
        const pos = g.getAttribute('position');
        let min = 0;
        for (let j = 0; j < pos.count; j++)
          min = Math.min(
            min,
            new T.Vector3().fromBufferAttribute(pos, j).applyQuaternion(target)
              .y,
          );
        const row = Math.floor(i / cols),
          inRow = Math.min(cols, dice.length - row * cols);
        const x = ((i % cols) - (inRow - 1) / 2) * spread,
          z = (row - (rows - 1) / 2) * spread;
        const initial = new T.Quaternion().setFromEuler(
          new T.Euler(i + 2, 1.5 * i, 2.4),
        );
        objects.push({
          group,
          target,
          start: initial,
          x,
          z,
          phase: i * 0.17,
          height: -min,
        });
        scene.add(group);
      });
      start = performance.now();
    }
    update.current = show;
    show(roll);
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate = (now: number) => {
      if (disposed) return;
      const t = reduced ? 1 : Math.min(1, (now - start) / 1800);
      for (const o of objects) {
        const ease = 1 - Math.pow(1 - t, 3);
        o.group.position.set(
          o.x + (1 - ease) * Math.sin(o.phase + 1) * 5,
          o.height + Math.abs(Math.sin(t * Math.PI * 3)) * 3 * (1 - t),
          o.z + (1 - ease) * 4,
        );
        if (t < 0.75) {
          o.group.quaternion
            .copy(o.start)
            .multiply(
              new T.Quaternion().setFromEuler(
                new T.Euler(t * 15, t * 11, t * 8),
              ),
            );
        } else {
          o.group.quaternion.slerp(
            o.target,
            Math.min(1, (t - 0.75) * 0.35 + 0.08),
          );
        }
        if (t === 1) o.group.quaternion.copy(o.target);
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      clear();
      floor.geometry.dispose();
      (floor.material as T.Material).dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      update.current = () => {};
    };
  }, [transparent, color]);
  useEffect(() => update.current(roll), [roll]);
  return (
    <div className="dice-canvas" ref={host} aria-label="Animated 3D dice">
      {failed && (
        <p className="render-error">
          3D graphics are unavailable on this device. Roll results still appear
          in the console.
        </p>
      )}
    </div>
  );
}
