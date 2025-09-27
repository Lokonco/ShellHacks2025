<template>
  <div ref="container" :style="containerStyle"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, defineProps, nextTick } from 'vue';
import * as THREE from 'three';

// Reference to the container div for the Three.js canvas
const container = ref(null);
// Three.js objects are instance-scoped so each component is independent
let renderer = null;
let camera = null;
let scene = null;
let resizeObserver = null;

// Computed style for the container div: if fixed canvas size, set width/height in px
import { computed } from 'vue';
const containerStyle = computed(() => {
  if (props.canvas_dimensions && props.canvas_dimensions.width && props.canvas_dimensions.height) {
    return {
      width: props.canvas_dimensions.width + 'px',
      height: props.canvas_dimensions.height + 'px',
    };
  }
  return {};
});

// Props:
// - points: Array of {x, y, z} objects defining the polygon's vertices (in order)
// - filled: Boolean, true for filled shape, false for outline only
// - position: Object with x and y properties to offset the shape's position (default is { x: 0, y: 0 })
// - canvas_dimensions: Optional { width, height } to fix the canvas size in px (prevents resizing on reload)
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
  },
  // New: fixed canvas size (optional)
  canvas_dimensions: {
    type: Object,
    default: null // { width, height } or null for auto
  }
});

// Main Three.js setup and rendering logic
onMounted(() => {
  // Wait for DOM to be ready
  nextTick(() => {
    // Determine canvas size: use fixed size if provided, else container size
    let width = props.canvas_dimensions?.width || (container.value ? container.value.clientWidth : window.innerWidth / 2);
    let height = props.canvas_dimensions?.height || (container.value ? container.value.clientHeight : window.innerHeight);
    if (!width || !height) {
      width = window.innerWidth / 2;
      height = window.innerHeight;
    }

    // Create Three.js scene and camera
    scene = new THREE.Scene();
    scene.background = null;

    // Camera always views logical area (0,0) to (width,height)
    camera = new THREE.OrthographicCamera(0, width, height, 0, 1, 1000);
    camera.position.z = 5;

    // Create renderer and attach to DOM
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    if (props.canvas_dimensions) {
      renderer.domElement.style.width = width + 'px';
      renderer.domElement.style.height = height + 'px';
    } else {
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
    }
    renderer.domElement.style.display = 'block';
    container.value.appendChild(renderer.domElement);

    // Draw the shape(s) based on current props
    function drawScene() {
      // Remove previous objects
      while (scene.children.length > 0) scene.remove(scene.children[0]);

      // Offset all points by the position prop
      const offsetX = props.position.x || 0;
      const offsetY = props.position.y || 0;
      const pts = props.points.map(p => ({
        x: p.x + offsetX,
        y: p.y + offsetY,
        z: p.z ?? 0
      }));

      if (props.filled) {
        // Filled polygon
        const shape = new THREE.Shape();
        if (pts.length > 0) {
          shape.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            shape.lineTo(pts[i].x, pts[i].y);
          }
          shape.lineTo(pts[0].x, pts[0].y); // Close the shape
        }
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          wireframe: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
      } else {
        // Outline only
        const outlinePoints = pts.map(p => new THREE.Vector3(p.x, p.y, p.z));
        if (outlinePoints.length > 0 && !outlinePoints[0].equals(outlinePoints[outlinePoints.length - 1])) {
          outlinePoints.push(outlinePoints[0].clone());
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);
        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const line = new THREE.LineLoop(geometry, material);
        scene.add(line);
      }
      renderer.render(scene, camera);
    }

    // Initial draw
    drawScene();

    // Responsive resizing (only if not fixed size)
    if (!props.canvas_dimensions) {
      resizeObserver = new window.ResizeObserver(() => {
        let newWidth = container.value ? container.value.clientWidth : window.innerWidth / 2;
        let newHeight = container.value ? container.value.clientHeight : window.innerHeight;
        if (!newWidth || !newHeight) {
          newWidth = window.innerWidth / 2;
          newHeight = window.innerHeight;
        }
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(newWidth, newHeight);
        // Update camera to match new logical area
        camera.left = 0;
        camera.right = newWidth;
        camera.top = newHeight;
        camera.bottom = 0;
        camera.updateProjectionMatrix();
        drawScene();
      });
      resizeObserver.observe(container.value);
    }

    // Cleanup on unmount
    onBeforeUnmount(() => {
      if (resizeObserver && container.value) resizeObserver.unobserve(container.value);
      resizeObserver = null;
      if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer = null;
      camera = null;
      scene = null;
    });
  });
});
</script>

<style scoped>
div {
  width: 100%;
  height: 100%;
  background: #f0f0f0; /* Light gray background */
  border: 2px solid #bbb; /* Subtle border */
  border-radius: 8px;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  overflow: hidden; /* Ensure nothing spills outside the border */
}
</style>