<template>
  <div>
    <div ref="canvasContainer" style="width: 800px; height: 600px; border: 1px solid black;"></div>
    <button @click="exportSTL" style="margin-top: 10px;">Export as STL</button>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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
function createExtrudedMesh() {
  // 1) Convert to Vector2 arrays (rings)
  const candidateRings = (Array.isArray(props.pointArrays) ? props.pointArrays : []);
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
  const extrudeSettings = { steps: 1, depth: 10, bevelEnabled: false };
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

// Run this when the component is mounted
onMounted(() => {
  initScene();
  // Initial build
  rebuildMesh();
});
</script>