<!-- TO-DO: Variable points, boolean for solid color or transparent fill -->

<template>
  <div ref="container"></div>
</template>

<script setup>
import { ref, onMounted, defineProps } from 'vue';
import * as THREE from 'three';

// Reference to the container div for the Three.js canvas
const container = ref(null);

// Props:
// - points: Array of {x, y, z} objects defining the polygon's vertices (in order)
// - filled: Boolean, true for filled shape, false for outline only
// - position: Object with x and y properties to offset the shape's position (default is { x: 0, y: 0 })
const props = defineProps({
  points: {
    type: Array,
    default: () => [
      { x: 0, y: 0, z: 0 },      // Bottom-left
      { x: 100, y: 0, z: 0 },    // Bottom-right
      { x: 100, y: 100, z: 0 },  // Top-right
      { x: 0, y: 100, z: 0 },    // Top-left
    ]
  },
  filled: {
    type: Boolean,
    default: false
  },
  // New: position offset for the shape (applied to all points)
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
});

onMounted(() => {
  // Set up the width and height for the renderer (half window width, full height)
  const width = window.innerWidth / 2; // Adjust size to fit a pane
  const height = window.innerHeight;

  // 1. Create a Three.js scene and set background color
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff); // White background

  // 2. Set up an orthographic camera for 2D rendering
  //    This camera looks at a "box" area from -width/2 to width/2, etc.
  const camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
  camera.position.z = 5; // Move camera back so we can see the shape

  // 3. Create the WebGL renderer and add its canvas to the container div
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  container.value.appendChild(renderer.domElement);

  // 4. Draw the shape, either filled or outline, based on the 'filled' prop
  // Offset all points by the position prop (default 0,0)
  const offsetX = props.position.x || 0;
  const offsetY = props.position.y || 0;
  // Create a new array of points with the offset applied
  const pts = props.points.map(p => ({
    x: p.x + offsetX,
    y: p.y + offsetY,
    z: p.z ?? 0
  }));

  if (props.filled) {
    // --- FILLED POLYGON ---
    // Create a THREE.Shape from the offset points
    const shape = new THREE.Shape();
    if (pts.length > 0) {
      shape.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        shape.lineTo(pts[i].x, pts[i].y);
      }
      shape.lineTo(pts[0].x, pts[0].y); // Close the shape
    }
    // Create geometry from the shape
    const geometry = new THREE.ShapeGeometry(shape);
    // Create a red material (not wireframe)
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: false
    });
    // Create a mesh and add to the scene
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
  } else {
    // --- OUTLINE ONLY ---
    // Convert offset points to Vector3 for BufferGeometry
    const outlinePoints = pts.map(p => new THREE.Vector3(p.x, p.y, p.z));
    // Ensure the outline is closed by repeating the first point at the end if needed
    if (outlinePoints.length > 0 && !outlinePoints[0].equals(outlinePoints[outlinePoints.length - 1])) {
      outlinePoints.push(outlinePoints[0].clone());
    }
    // Create geometry from the outline points
    const geometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);
    // Create a red line material
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    // Create a line loop and add to the scene
    const line = new THREE.LineLoop(geometry, material);
    scene.add(line);
  }

  // 5. Render the scene (no animation loop needed for static shape)
  renderer.render(scene, camera);
});
</script>

<style scoped>
div {
  width: 100%;
  height: 100%;
}
</style>