<template>
  <div>
    <div ref="canvasContainer" style="width: 800px; height: 600px; border: 1px solid black;"></div>
    <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
      <button @click="exportSTL">Export as STL</button>
      <button @click="exportBatchZip" title="Run Python 20 times and export 20 STL models in a ZIP">Export 20x (ZIP)</button>
      <label style="margin-left: auto; display: flex; align-items: center; gap: 6px;">
        <span>Extrude depth</span>
        <input type="number" min="0" step="0.1" v-model.number="extrudeDepth" style="width: 80px;" />
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import pyodide from '../pyodide-loader';
import { installPyToJsSketchBridge } from '../utils/installPyToJsSketchBridge';
import pythonCode from '../stores/pythonCode';

// Define the component's props to accept the point data
const props = defineProps({
  // Expected format: [[{x, y}, {x, y}], [{x, y}, ...]]
  pointArrays: {
    type: Array,
    required: true,
  }
});

const canvasContainer = ref(null);
let scene, camera, renderer, controls;
let exportableMesh = null; // A reference to the mesh we want to export
// Reactive extrude depth (mm). Changing this automatically rebuilds the mesh.
const extrudeDepth = ref(10);

/**
 * Point in Polygon (PIP) Test using the Ray Casting Algorithm.
 * Determines if a 2D point is inside a given polygon.
 * @param {THREE.Vector2} point - The point to check.
 * @param {THREE.Vector2[]} polygon - An array of Vector2 points defining the polygon.
 * @returns {boolean} - True if the point is inside, false otherwise.
 */
function isPointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Main function to create the 3D mesh from the 2D point arrays.
 */
function createExtrudedMesh(fromPointArrays = null) {
  // 1) Convert to Vector2 arrays (rings)
  const source = fromPointArrays !== null ? fromPointArrays : props.pointArrays;
  const candidateRings = (Array.isArray(source) ? source : []);
  const rings = candidateRings
    .map((entry) => {
      const pts = Array.isArray(entry) ? entry : (Array.isArray(entry?.points) ? entry.points : []);
      return pts
        .map((p) => ({ x: Number(p?.x ?? 0), y: Number(p?.y ?? 0) }))
        .map((p) => new THREE.Vector2(p.x, p.y));
    })
    .filter(r => Array.isArray(r) && r.length >= 3);
  if (!rings.length) {
    console.error('No point arrays provided or input format invalid.');
    return null;
  }

  // Helpers
  const signedArea = (poly) => {
    let a = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      a += (poly[j].x * poly[i].y) - (poly[i].x * poly[j].y);
    }
    return 0.5 * a; // CCW > 0, CW < 0 (assuming non-self-intersecting)
  };

  const ensureCCW = (poly) => {
    if (signedArea(poly) < 0) poly.reverse();
    return poly;
  };
  const ensureCW = (poly) => {
    if (signedArea(poly) > 0) poly.reverse();
    return poly;
  };

  // 2) Build nesting info using point-in-polygon (ray casting)
  const nodes = rings.map((ring, idx) => ({
    id: idx,
    ring,
    depth: 0,
    containsCount: 0,
    parent: -1,
    children: [],
    areaAbs: Math.abs(signedArea(ring))
  }));

  // Compute how many other polygons contain each ring (use its first vertex as representative)
  for (let i = 0; i < nodes.length; i++) {
    const pi = nodes[i];
    const testPt = pi.ring[0];
    let count = 0;
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      if (isPointInPolygon(testPt, nodes[j].ring)) count++;
    }
    pi.containsCount = count;
    pi.depth = count; // even=filled, odd=hole by even-odd rule
  }

  // Determine immediate parent: among containers, pick the one with depth = this.depth-1 and minimal area
  for (let i = 0; i < nodes.length; i++) {
    const pi = nodes[i];
    let parentId = -1;
    let parentArea = Infinity;
    if (pi.depth > 0) {
      const testPt = pi.ring[0];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const pj = nodes[j];
        if (pj.depth === pi.depth - 1 && isPointInPolygon(testPt, pj.ring)) {
          if (pj.areaAbs < parentArea) {
            parentArea = pj.areaAbs;
            parentId = pj.id;
          }
        }
      }
    }
    pi.parent = parentId;
    if (parentId !== -1) nodes[parentId].children.push(pi.id);
  }

  // 3) Build THREE.Shape instances for every filled ring (even depth). Attach immediate hole children.
  const shapes = [];
  for (const n of nodes) {
    if (n.depth % 2 === 0) { // filled island
      const outer = ensureCCW([...n.ring]);
      const shape = new THREE.Shape(outer);

      // immediate children with odd depth are holes in this shape
      for (const childId of n.children) {
        const child = nodes[childId];
        if (child.depth % 2 === 1) {
          const holeRing = ensureCW([...child.ring]);
          const holePath = new THREE.Path(holeRing);
          shape.holes.push(holePath);
        }
      }
      shapes.push(shape);
    }
  }

  if (shapes.length === 0) {
    console.error('No filled regions could be determined from input rings.');
    return null;
  }

  // 4) Extrude all shapes together (supports multiple islands)
  const extrudeSettings = { steps: 1, depth: Number(extrudeDepth.value) || 0, bevelEnabled: false };
  const geometry = new THREE.ExtrudeGeometry(shapes, extrudeSettings);
  const material = new THREE.MeshStandardMaterial({ color: 0x007bff, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

/**
 * Initializes the Three.js scene, camera, and renderer.
 */
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeeee);

  camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
  camera.position.set(0, 0, 100);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(800, 600);
  canvasContainer.value.appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.AmbientLight(0x404040, 2));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 10, 10);
  scene.add(directionalLight);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);

  // Animation loop
  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();
}

/**
 * The STL export function.
 */
function exportSTL() {
  if (!exportableMesh) {
    alert("No mesh to export!");
    return;
  }
  const exporter = new STLExporter();
  const result = exporter.parse(exportableMesh, { binary: true });
  const blob = new Blob([result], { type: 'application/octet-stream' });

  const link = document.createElement('a');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.href = URL.createObjectURL(blob);
  link.download = 'sketch-export.stl';
  link.click();
  document.body.removeChild(link);
}

// Helper: export a mesh to binary STL ArrayBuffer
function meshToStlArrayBuffer(mesh) {
  const exporter = new STLExporter();
  const result = exporter.parse(mesh, { binary: true });
  if (result instanceof ArrayBuffer) return result;
  if (ArrayBuffer.isView(result)) return result.buffer;
  // If text STL, convert to UTF-8 bytes
  return new TextEncoder().encode(String(result)).buffer;
}

// Minimal ZIP (store method, no compression)
function makeZip(files) {
  // files: [{ name: string, data: ArrayBuffer }]
  const encoder = new TextEncoder();
  const records = [];
  const central = [];
  let offset = 0;

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  })();
  function crc32(ab) {
    const view = new Uint8Array(ab);
    let c = 0xffffffff;
    for (let i = 0; i < view.length; i++) {
      c = crcTable[(c ^ view[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }
  function dtDos(date) {
    // Convert JS Date to DOS time/date
    const d = date || new Date();
    const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1f);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear() - 1980;
    const dosDate = ((year & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f);
    return { time, date: dosDate };
  }

  for (const f of files) {
    const nameBytes = encoder.encode(f.name);
    const data = f.data instanceof ArrayBuffer ? f.data : f.data.buffer;
    const size = (data.byteLength >>> 0);
    const crc = crc32(data);
    const { time, date } = dtDos(new Date());

    // Local file header
    const lfh = new DataView(new ArrayBuffer(30));
    let p = 0;
    lfh.setUint32(p, 0x04034b50, true); p += 4; // signature
    lfh.setUint16(p, 20, true); p += 2;        // version needed
    lfh.setUint16(p, 0, true); p += 2;         // flags
    lfh.setUint16(p, 0, true); p += 2;         // method: 0 store
    lfh.setUint16(p, time, true); p += 2;      // time
    lfh.setUint16(p, date, true); p += 2;      // date
    lfh.setUint32(p, crc, true); p += 4;       // crc32
    lfh.setUint32(p, size, true); p += 4;      // comp size
    lfh.setUint32(p, size, true); p += 4;      // uncomp size
    lfh.setUint16(p, nameBytes.length, true); p += 2; // name len
    lfh.setUint16(p, 0, true); p += 2;         // extra len

    const localOffset = offset;
    const record = new Uint8Array(lfh.byteLength + nameBytes.length + size);
    record.set(new Uint8Array(lfh.buffer), 0);
    record.set(nameBytes, lfh.byteLength);
    record.set(new Uint8Array(data), lfh.byteLength + nameBytes.length);
    records.push(record);
    offset += record.byteLength;

    // Central directory header
    const cdfh = new DataView(new ArrayBuffer(46));
    p = 0;
    cdfh.setUint32(p, 0x02014b50, true); p += 4; // signature
    cdfh.setUint16(p, 20, true); p += 2;         // version made by
    cdfh.setUint16(p, 20, true); p += 2;         // version needed
    cdfh.setUint16(p, 0, true); p += 2;          // flags
    cdfh.setUint16(p, 0, true); p += 2;          // method
    cdfh.setUint16(p, time, true); p += 2;       // time
    cdfh.setUint16(p, date, true); p += 2;       // date
    cdfh.setUint32(p, crc, true); p += 4;        // crc32
    cdfh.setUint32(p, size, true); p += 4;       // comp size
    cdfh.setUint32(p, size, true); p += 4;       // uncomp size
    cdfh.setUint16(p, nameBytes.length, true); p += 2; // name len
    cdfh.setUint16(p, 0, true); p += 2;          // extra len
    cdfh.setUint16(p, 0, true); p += 2;          // comment len
    cdfh.setUint16(p, 0, true); p += 2;          // disk start
    cdfh.setUint16(p, 0, true); p += 2;          // int attrs
    cdfh.setUint32(p, 0, true); p += 4;          // ext attrs
    cdfh.setUint32(p, localOffset, true); p += 4;// local header offset

    const cent = new Uint8Array(cdfh.byteLength + nameBytes.length);
    cent.set(new Uint8Array(cdfh.buffer), 0);
    cent.set(nameBytes, cdfh.byteLength);
    central.push(cent);
  }

  const centralSize = central.reduce((s, u) => s + u.byteLength, 0);
  const centralOffset = offset;

  const eocd = new DataView(new ArrayBuffer(22));
  let p2 = 0;
  eocd.setUint32(p2, 0x06054b50, true); p2 += 4; // signature
  eocd.setUint16(p2, 0, true); p2 += 2; // number of this disk
  eocd.setUint16(p2, 0, true); p2 += 2; // disk where central starts
  eocd.setUint16(p2, central.length, true); p2 += 2; // entries on this disk
  eocd.setUint16(p2, central.length, true); p2 += 2; // total entries
  eocd.setUint32(p2, centralSize, true); p2 += 4; // central size
  eocd.setUint32(p2, centralOffset, true); p2 += 4; // central offset
  eocd.setUint16(p2, 0, true); p2 += 2; // comment len

  const totalSize = offset + centralSize + eocd.byteLength;
  const out = new Uint8Array(totalSize);
  let pos = 0;
  for (const r of records) { out.set(r, pos); pos += r.byteLength; }
  for (const c of central) { out.set(c, pos); pos += c.byteLength; }
  out.set(new Uint8Array(eocd.buffer), pos);

  return new Blob([out], { type: 'application/zip' });
}

async function exportBatchZip() {
  const code = pythonCode.get();
  if (!code || !code.trim()) {
    alert('No Python code available to run.');
    return;
  }
  const py = await new Promise(resolve => pyodide.onReady(resolve));
  // Ensure bridge installed to receive events
  try { installPyToJsSketchBridge(py); } catch {}

  const files = [];
  for (let i = 1; i <= 20; i++) {
    const points = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        window.removeEventListener('sketch:multi_points', handler);
        reject(new Error('Timed out waiting for Python output'));
      }, 10000);
      function handler(ev) {
        clearTimeout(timer);
        resolve(ev.detail);
      }
      window.addEventListener('sketch:multi_points', handler, { once: true });
      // Kick off python run (async if available)
      try {
        if (typeof py.runPythonAsync === 'function') {
          py.runPythonAsync(code);
        } else {
          py.runPython(code);
        }
      } catch (e) {
        clearTimeout(timer);
        window.removeEventListener('sketch:multi_points', handler);
        reject(e);
      }
    });

    const mesh = createExtrudedMesh(points);
    if (!mesh) {
      // create a placeholder text file if mesh failed
      const ab = new TextEncoder().encode('No mesh generated').buffer;
      files.push({ name: `model_${String(i).padStart(2,'0')}.txt`, data: ab });
      continue;
    }
    const ab = meshToStlArrayBuffer(mesh);
    // dispose mesh resources
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach(m => m && m.dispose && m.dispose());
    }
    files.push({ name: `model_${String(i).padStart(2,'0')}.stl`, data: ab });
  }

  const zipBlob = makeZip(files);
  const link = document.createElement('a');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.href = URL.createObjectURL(zipBlob);
  link.download = 'models_x20.zip';
  link.click();
  document.body.removeChild(link);
}

// Remove current mesh from scene and dispose resources
function clearCurrentMesh() {
  if (exportableMesh && scene) {
    scene.remove(exportableMesh);
    if (exportableMesh.geometry) exportableMesh.geometry.dispose();
    if (exportableMesh.material) {
      // Material can be an array or single
      const mats = Array.isArray(exportableMesh.material) ? exportableMesh.material : [exportableMesh.material];
      mats.forEach(m => m && m.dispose && m.dispose());
    }
    exportableMesh = null;
  }
}

// Build mesh from current props and center controls
function rebuildMesh() {
  if (!scene) return; // initScene not ready yet
  clearCurrentMesh();
  const mesh = createExtrudedMesh();
  exportableMesh = mesh;
  if (mesh) {
    scene.add(mesh);
    // Center camera target to mesh bounds
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    mesh.position.sub(center);
    if (controls) {
      controls.target.copy(new THREE.Vector3(0, 0, 0));
      controls.update();
    }
  }
}

// Watch for point array changes to auto-update mesh
watch(() => props.pointArrays, () => {
  rebuildMesh();
}, { deep: true });

// Watch extrude depth changes to auto-update mesh
watch(extrudeDepth, () => {
  rebuildMesh();
});

// Run this when the component is mounted
onMounted(() => {
  initScene();
  // Initial build
  rebuildMesh();
});
</script>