'use client';
import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import * as C from 'cannon-es';
import { geometry, facesOf } from '@/lib/dice-geometry';
import { replayTable, STEP, hull, snapshotMotion, isDeliberateThrow, type Motion } from '@/lib/dice-physics';
import type { Roll } from '@/lib/dice';
import { trayFrustum } from '@/lib/dice-camera';
import { diceImpact, confirmedSound, unlockSound } from '@/lib/dice-audio';
function makeDie(die: { sides: number; kept: boolean; tens?: boolean; units?: boolean }, color: string) {
        const group = new T.Group(),
          g = geometry(die.sides),
          faces = facesOf(g),
          c = new T.Color(color);
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
        if (die.sides !== 4) faces.forEach((f, j) => {
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
  if (die.sides === 4) {
    // Each vertex carries the value of the opposite face on all three adjacent faces.
    faces.forEach(f => f.points.forEach(vertex => {
      const value = faces.findIndex(other => !other.points.some(p => p.distanceTo(vertex) < 0.001)) + 1;
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff'; ctx.font = 'bold 100px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(value), 64, 64);
      const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
      const label = new T.Mesh(new T.PlaneGeometry(.32, .32), new T.MeshBasicMaterial({map: texture, transparent: true, depthWrite: false}));
      label.position.copy(f.center).lerp(vertex, .58).addScaledVector(f.normal, .012);
      const y = vertex.clone().sub(f.center).normalize(), x = new T.Vector3().crossVectors(y, f.normal).normalize();
      label.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, f.normal));
      group.add(label);
    }));
  }
  return group;
}
export default function DiceStage({ roll, transparent = false, color = '#32a6c8', sizeMultiplier = 1, interactive = true, fresh = false, pendingExpression, onSettled, onThrow }: {
  roll: Roll | null; pendingExpression?: string; transparent?: boolean; color?: string; sizeMultiplier?: number; interactive?: boolean; fresh?: boolean; onSettled?: (id: string) => void; onThrow?: (parent: string, release: Motion[]) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const settledCallback = useRef(onSettled);
  settledCallback.current = onSettled;
  const throwCallback = useRef(onThrow);
  throwCallback.current = onThrow;
  const rendererRef = useRef<T.WebGLRenderer | null>(null);
  useEffect(() => () => { rendererRef.current?.dispose(); rendererRef.current = null; }, []);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = host.current!;
    let renderer: T.WebGLRenderer;
    try { renderer = rendererRef.current ??= new T.WebGLRenderer({alpha: true, antialias: true}); }
    catch { setFailed(true); if(roll) settledCallback.current?.(roll.id); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0, 0);
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);
    const scene = new T.Scene(), camera = new T.OrthographicCamera(-8,8,5,-5,.1,100);
    camera.position.set(0, 20, .001); camera.lookAt(0,0,0);
    camera.updateMatrixWorld();
    scene.add(new T.HemisphereLight(0xcdefff,0x294351,3));
    const light = new T.DirectionalLight(0xffffff,4); light.position.set(-3,12,5); light.castShadow = true;
    light.shadow.camera.left=-30; light.shadow.camera.right=30; light.shadow.camera.top=30; light.shadow.camera.bottom=-30;
    scene.add(light);
    const floor = new T.Mesh(new T.PlaneGeometry(100,100), new T.ShadowMaterial({opacity:.22}));
    floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; scene.add(floor);
    const diceScale = (roll?.physics?.diceScale ?? (roll ? 1 : sizeMultiplier > 1 ? sizeMultiplier : 1));
    const logical = roll?.dice || [{sides:20,value:20,kept:true}];
    const dice = logical.flatMap(d => d.sides === 100 ? [{...d,sides:10,tens:true},{...d,sides:10,units:true}] : [d]);
    const table = replayTable(logical.map(d => d.sides), roll?.physics?.seed ?? 123, roll?.physics?.release, diceScale);
    const groups = dice.map(d => { const group = makeDie(d, roll?.color || color); group.scale.setScalar(diceScale); scene.add(group); return group; });
    let step = 0, replay = Boolean(roll?.physics), dragged = false;
    let notified = false;
    const notify = () => {
      if (roll && !notified) { notified=true; settledCallback.current?.(roll.id); confirmedSound(roll,fresh); }
    };
    // The client's own replay is cosmetic; the server's recorded poses are
    // authoritative and always win. Any drift between them (even a few
    // frames of client/server floating-point difference over a long tumble)
    // used to show as a hard teleport right when the dice "settle" - blend
    // into the authoritative pose over a few frames instead so a correction,
    // if any, reads as a soft settle rather than a reset-and-reroll.
    let correcting = false, correctStart = 0, correctFrom: { p: T.Vector3; q: T.Quaternion }[] = [];
    const CORRECT_MS = 180;
    const finish = () => {
      if (roll?.physics) {
        correctFrom = table.bodies.map((b) => ({
          p: new T.Vector3(b.position.x, b.position.y, b.position.z),
          q: new T.Quaternion(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w),
        }));
        correcting = true; correctStart = performance.now();
        table.bodies.forEach((body,i) => {
          const pose = roll.physics!.poses[i];
          body.position.set(pose.p[0],pose.p[1],pose.p[2]);
          body.quaternion.set(pose.q[0],pose.q[1],pose.q[2],pose.q[3]);
          body.velocity.setZero(); body.angularVelocity.setZero(); body.sleep();
        });
      }
      replay = false;
      notify();
    };
    if (!roll?.physics) {
      // Legacy history is placed at rest, never disguised as a new physical roll.
      let index = 0;
      const values = logical.flatMap(d => d.sides===100 ? [Math.floor((d.value%100)/10)+1,d.value%10+1] : [d.value]);
      table.bodies.forEach((body,i) => {
        const normal = hull(dice[i].sides).normals[values[index++]-1];
        const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(normal.x,normal.y,normal.z),new T.Vector3(0,dice[i].sides===4?-1:1,0));
        body.quaternion.set(q.x,q.y,q.z,q.w);
        const low = Math.min(...hull(dice[i].sides).vertices.map(v => body.quaternion.vmult(v).y));
        body.position.y = -low*diceScale+.01; body.velocity.setZero();body.angularVelocity.setZero();body.sleep();
      });
      notify();
    } else if (matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    for (const body of table.bodies) body.addEventListener('collide', (event: { contact: C.ContactEquation }) => {
      if ((replay && fresh) || dragged) diceImpact(Math.abs(event.contact.getImpactVelocityAlongNormal()));
    });
    const ray = new T.Raycaster(), pointer = new T.Vector2(), dragPlane = new T.Plane(new T.Vector3(0,1,0),-1.6*diceScale);
    const anchor = new C.Body({mass:0, type:C.Body.KINEMATIC, collisionFilterGroup:0, collisionFilterMask:0});
    table.world.addBody(anchor);
    let constraint: C.PointToPointConstraint | null = null, pointerId: number | null = null;
    function locate(e: PointerEvent) {
      const bounds = el.getBoundingClientRect();
      pointer.set((e.clientX-bounds.left)/bounds.width*2-1, -(e.clientY-bounds.top)/bounds.height*2+1);
      ray.setFromCamera(pointer,camera);
    }
    function move(e: PointerEvent) {
      if (!constraint) return;
      locate(e); const hit = new T.Vector3();
      if (ray.ray.intersectPlane(dragPlane,hit)) anchor.position.set(
        T.MathUtils.clamp(hit.x,-table.width/2+1.1*diceScale,table.width/2-1.1*diceScale),1.6*diceScale,
        T.MathUtils.clamp(hit.z,-table.depth/2+1.1*diceScale,table.depth/2-1.1*diceScale));
    }
    function down(e: PointerEvent) {
      unlockSound();
      if (!interactive || replay || e.button !== 0 || constraint) return;
      locate(e);
      const hits = ray.intersectObjects(groups,true);
      if (!hits.length) return;
      let obj = hits[0].object;
      while (obj.parent && !groups.includes(obj as T.Group)) obj = obj.parent;
      const index = groups.indexOf(obj as T.Group); if (index<0) return;
      const body = table.bodies[index]; body.wakeUp(); dragged = true;
      const p = hits[0].point, local = body.pointToLocalFrame(new C.Vec3(p.x,p.y,p.z));
      anchor.position.set(p.x,p.y,p.z);
      constraint = new C.PointToPointConstraint(body,local,anchor,new C.Vec3(),100);
      table.world.addConstraint(constraint); pointerId=e.pointerId;
      renderer.domElement.setPointerCapture(e.pointerId); el.style.cursor='grabbing'; e.preventDefault();
    }
    function up(event?: Event) {
      if (event?.type === 'pointerup' && constraint && roll && isDeliberateThrow(constraint.bodyA)) {
        for (const body of table.bodies) {
          if(body.velocity.length()>35)body.velocity.scale(35/body.velocity.length(),body.velocity);
          if(body.angularVelocity.length()>70)body.angularVelocity.scale(70/body.angularVelocity.length(),body.angularVelocity);
        }
        throwCallback.current?.(roll.id,table.bodies.map(snapshotMotion));
      }
      if (constraint) table.world.removeConstraint(constraint);
      constraint=null;
      if (pointerId!==null && renderer.domElement.hasPointerCapture(pointerId)) renderer.domElement.releasePointerCapture(pointerId);
      pointerId=null; el.style.cursor=interactive?'grab':'default';
    }
    renderer.domElement.style.touchAction='none';
    renderer.domElement.addEventListener('pointerdown',down); renderer.domElement.addEventListener('pointermove',move);
    renderer.domElement.addEventListener('pointerup',up); renderer.domElement.addEventListener('pointercancel',up);
    renderer.domElement.addEventListener('lostpointercapture',up); window.addEventListener('blur',up);
    let w=1,h=1;
    const resize=()=> {
      w=Math.max(1,el.clientWidth);h=Math.max(1,el.clientHeight);renderer.setSize(w,h);
      Object.assign(camera,trayFrustum(table.width,table.depth,w/h,sizeMultiplier));
      camera.updateProjectionMatrix();
    };
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    let frame=0, previous=performance.now(), accumulator=0;
    const animate=(now:number)=> {
      accumulator += Math.min((now-previous)/1000,.1);previous=now;
      while(accumulator>=STEP) {
        if (replay || dragged) table.world.step(STEP);
        if (replay && ++step >= roll!.physics!.steps) finish();
        accumulator-=STEP;
      }
      if (correcting) {
        const t = Math.min(1, (now - correctStart) / CORRECT_MS);
        table.bodies.forEach((b,i) => {
          groups[i].position.lerpVectors(correctFrom[i].p, new T.Vector3(b.position.x,b.position.y,b.position.z), t);
          groups[i].quaternion.slerpQuaternions(correctFrom[i].q, new T.Quaternion(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w), t);
        });
        if (t >= 1) correcting = false;
      } else {
        table.bodies.forEach((b,i)=> {groups[i].position.set(b.position.x,b.position.y,b.position.z);groups[i].quaternion.set(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w);});
      }
      el.style.cursor=(replay)?'progress':constraint?'grabbing':interactive?'grab':'default';
      renderer.render(scene,camera); frame=requestAnimationFrame(animate);
    };
    frame=requestAnimationFrame(animate);
    return ()=> {
      cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('blur',up);up();
      renderer.domElement.removeEventListener('pointerdown',down);
      renderer.domElement.removeEventListener('pointermove',move);
      renderer.domElement.removeEventListener('pointerup',up);
      renderer.domElement.removeEventListener('pointercancel',up);
      renderer.domElement.removeEventListener('lostpointercapture',up);
      scene.traverse(object=> {const mesh=object as T.Mesh;mesh.geometry?.dispose();
        const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
        materials.forEach(m=> {if(m){(m as T.MeshBasicMaterial).map?.dispose();m.dispose();}}); });
      renderer.domElement.remove();
    };
  // Keyed on roll?.id, not the roll object itself: a roll record never changes once
  // created, so a differently-referenced-but-same-id roll (e.g. re-fetched by a poll
  // that raced a direct roll response) must not tear down and restart the animation
  // already playing it - that looked like the dice resetting mid-air and re-rolling.
  }, [roll?.id,transparent,color,sizeMultiplier,interactive,fresh]);
  return <div className="dice-canvas" ref={host} aria-busy={Boolean(pendingExpression)} aria-label="Physics dice tray: drag to move, throw firmly to record a new roll">
    {pendingExpression && <span className="roll-waiting" role="status">Rolling…</span>}
    {failed && <p className="render-error">3D graphics unavailable. Your roll result is still shown below.</p>}
  </div>;
}
