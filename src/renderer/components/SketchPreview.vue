<template>
  <div ref="container" :style="containerStyle"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, defineProps, nextTick, watch } from 'vue';
import * as THREE from 'three';
import * as martinez from 'martinez-polygon-clipping';

// Reference to the container div for the Three.js canvas
const container = ref(null);

// Integrate pannable composable for drag tracking and camera panning
import { usePannable } from './usePannable';
import { useZoomable } from './useZoomable';
// panOffset is a ref({x, y}) that tracks the total pan distance in screen pixels
const { panOffset } = usePannable(container);

// --- Zooming logic ---
// 'inverted' controls scroll direction for zoom (can be made a prop or setting later)
const inverted = ref(false); // Set to true to invert scroll direction
const { zoomLevel } = useZoomable(container, inverted);
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
// - shapes: Array of shape objects, each with:
//   - points: Array<{x, y, z}>
//   - filled: Boolean (filled or outline)
//   - color: (optional) {r,g,b} (0-255)
//   - position: (optional) {x, y}
// - canvas_dimensions: Optional { width, height } to fix the canvas size in px (prevents resizing on reload)
const props = defineProps({
  // When provided, a single dynamic polyline/polygon to render
  points: {
    type: Array,
    default: null
  },
  // Fills the single `points` shape if true; ignored when `shapes` is used
  filled: {
    type: Boolean,
    default: false
  },
  // Multiple shapes mode (fallback when `points` is not provided)
  shapes: {
    type: Array,
    default: () => [
      {
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 100, y: 0, z: 0 },
          { x: 100, y: 100, z: 0 },
          { x: 0, y: 100, z: 0 },
        ],
        filled: false,
        color: { r: 255, g: 0, b: 0 },
        position: { x: 0, y: 0 }
      }
    ]
  },
  // New: fixed canvas size (optional)
  canvas_dimensions: {
    type: Object,
    default: null // { width, height } or null for auto
  }
});

// Internal shapes object for rendering
const shapes = ref([]);

function buildShapesFromProps() {
  // If `points` provided (and non-empty), prefer single-shape mode
  if (Array.isArray(props.points) && props.points.length > 0) {
    shapes.value = [
      {
        points: props.points.map(p => ({ x: p.x, y: p.y, z: p.z ?? 0 })),
        filled: !!props.filled,
        color: { r: 255, g: 0, b: 0 },
        position: { x: 0, y: 0 }
      }
    ];
  } else {
    // Fall back to multi-shape mode
    shapes.value = (props.shapes || []).map(s => ({ ...s }));
  }
}

// Helper: Convert {r,g,b} to THREE.Color
function rgbToThreeColor(rgb) {
  if (!rgb || typeof rgb !== 'object') return new THREE.Color(1, 0, 0); // default red
  return new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
}

// Main Three.js setup and rendering logic
onMounted(() => {
  // Wait for DOM to be ready
  nextTick(() => {
    // Determine canvas size: use fixed size if provided, else container size
    let width = props.canvas_dimensions?.width || (container.value ? container.value.clientWidth : window.innerWidth / 2);
    let height = props.canvas_dimensions?.height || (container.value ? container.value.clientHeight : window.innerHeight);
    if (!width || !height) {
      width = window.innerWidth / 2;
      height = window.innerHeight / 10;
    }

    // Create Three.js scene and camera
    scene = new THREE.Scene();
    scene.background = null;

    // Camera always views logical area (0,0) to (width,height)
    // We'll apply panning by shifting the camera's view bounds by panOffset
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

    // --- Draw the shape(s) based on current props and pan/zoom ---
    function drawScene() {
      // Remove previous objects
      while (scene.children.length > 0) scene.remove(scene.children[0]);

      // Separate filled and non-filled shapes
      const filledShapes = shapes.value.filter(s => s.filled);
      const nonFilledShapes = shapes.value.filter(s => !s.filled);

      // Helper: Convert shapeObj to martinez polygon (array of rings)
      function toMartinezPolygon(shapeObj) {
        // Only outer ring supported for now
        const offsetX = shapeObj.position?.x || 0;
        const offsetY = shapeObj.position?.y || 0;
        const ring = shapeObj.points.map(p => [p.x + offsetX, p.y + offsetY]);
        // Ensure closed ring
        if (ring.length > 0 && (ring[0][0] !== ring[ring.length-1][0] || ring[0][1] !== ring[ring.length-1][1])) {
          ring.push([ring[0][0], ring[0][1]]);
        }
        return [ring];
      }

      // Render filled shapes with exclusion
      for (const filled of filledShapes) {
        let resultPoly = toMartinezPolygon(filled);
        let hadDiff = false;
        for (const hole of nonFilledShapes) {
          const holePoly = toMartinezPolygon(hole);
          resultPoly = martinez.diff(resultPoly, holePoly);
          hadDiff = true;
          if (!resultPoly || resultPoly.length === 0) {
            console.warn('[SketchPreview] martinez.diff returned empty/null for filled shape', filled, 'with hole', hole);
            break;
          }
        }
        if (!resultPoly || resultPoly.length === 0) {
          console.warn('[SketchPreview] Skipping rendering of filled shape due to empty result:', filled);
          continue;
        }
        // resultPoly is MultiPolygon: array of polygons (each polygon is array of rings)
        const color = rgbToThreeColor(filled.color);
        let rendered = false;
        for (const polygon of resultPoly) {
          // Each polygon may be either:
          // - an array of rings (first is outer, rest are holes)
          // - or a single ring (array of points)
          let outer, holes;
          if (Array.isArray(polygon[0]) && Array.isArray(polygon[0][0])) {
            // polygon is array of rings
            outer = polygon[0];
            holes = polygon.slice(1);
          } else if (Array.isArray(polygon[0]) && typeof polygon[0][0] === 'number') {
            // polygon is a single ring (array of points)
            outer = polygon;
            holes = [];
          } else {
            console.warn('[SketchPreview] Unexpected polygon structure:', polygon);
            continue;
          }
          // Check for at least 3 unique points in the outer ring (ignore closing point)
          const uniquePoints = Array.from(new Set(outer.slice(0, -1).map(pt => pt[0] + ',' + pt[1])));
          if (uniquePoints.length < 3) {
            console.warn('[SketchPreview] Skipping filled shape polygon with <3 unique points:', outer, filled);
            continue;
          }
          // Convert to THREE.Shape
          const shape = new THREE.Shape();
          if (outer.length > 0) {
            shape.moveTo(outer[0][0], outer[0][1]);
            for (let i = 1; i < outer.length; i++) {
              shape.lineTo(outer[i][0], outer[i][1]);
            }
          }
          // Add holes
          for (const hole of holes) {
            if (hole.length > 0) {
              const path = new THREE.Path();
              path.moveTo(hole[0][0], hole[0][1]);
              for (let i = 1; i < hole.length; i++) {
                path.lineTo(hole[i][0], hole[i][1]);
              }
              shape.holes.push(path);
            }
          }
          const geometry = new THREE.ShapeGeometry(shape);
          const material = new THREE.MeshBasicMaterial({ color, wireframe: false });
          const mesh = new THREE.Mesh(geometry, material);
          scene.add(mesh);
          rendered = true;
        }
        if (rendered) {
          console.log('[SketchPreview] Rendered filled shape:', filled);
        } else {
          console.warn('[SketchPreview] No polygons rendered for filled shape:', filled);
        }
      }

      // Render outlines for non-filled shapes
      for (const shapeObj of nonFilledShapes) {
        const offsetX = shapeObj.position?.x || 0;
        const offsetY = shapeObj.position?.y || 0;
        const pts = shapeObj.points.map(p => ({
          x: p.x + offsetX,
          y: p.y + offsetY,
          z: p.z ?? 0
        }));
        const color = rgbToThreeColor(shapeObj.color);
        const outlinePoints = pts.map(p => new THREE.Vector3(p.x, p.y, p.z));
        if (outlinePoints.length > 0 && !outlinePoints[0].equals(outlinePoints[outlinePoints.length - 1])) {
          outlinePoints.push(outlinePoints[0].clone());
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);
        const material = new THREE.LineBasicMaterial({ color });
        const line = new THREE.LineLoop(geometry, material);
        scene.add(line);
        console.log('[SketchPreview] Rendered outline for non-filled shape:', shapeObj);
      }

      renderer.render(scene, camera);
    }

    // --- Panning logic: update camera bounds and redraw on pan ---
    // This watcher will update the camera's view when panOffset changes
    watch(panOffset, (val) => {
      // Scale pan by 1/zoomLevel so panning feels consistent at all zooms
      const z = camera.zoom || 1;
      camera.left = 0 - val.x / z;
      camera.right = width - val.x / z;
      camera.top = height + val.y / z;
      camera.bottom = 0 + val.y / z;
      camera.updateProjectionMatrix();
      drawScene();
    }, { deep: true });

    // --- Zoom logic: update camera zoom and redraw on zoomLevel change ---
    watch(zoomLevel, (z) => {
      // Clamp zoom to a reasonable range
      const clamped = Math.max(0.2, Math.min(5, z));
      camera.zoom = clamped;
      // Also update camera bounds to keep pan consistent with new zoom
      const val = panOffset.value;
      camera.left = 0 - val.x / clamped;
      camera.right = width - val.x / clamped;
      camera.top = height + val.y / clamped;
      camera.bottom = 0 + val.y / clamped;
      camera.updateProjectionMatrix();
      drawScene();
    });

    // Build initial data from props and draw
    buildShapesFromProps();
    drawScene();

    // React to external prop changes
    watch(() => props.points, () => {
      buildShapesFromProps();
      drawScene();
    }, { deep: true });
    watch(() => props.filled, () => {
      buildShapesFromProps();
      drawScene();
    });
    watch(() => props.shapes, () => {
      buildShapesFromProps();
      drawScene();
    }, { deep: true });

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
        // Update camera to match new logical area, keeping pan and zoom
  // Keep pan and zoom consistent on resize
  const z = camera.zoom || 1;
  camera.left = 0 - panOffset.value.x / z;
  camera.right = newWidth - panOffset.value.x / z;
  camera.top = newHeight + panOffset.value.y / z;
  camera.bottom = 0 + panOffset.value.y / z;
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
  /* Light gray background with a 20px grid */
  background-color: #f0f0f0;
  background-image:
    repeating-linear-gradient(to right, #e0e0e0 0, #e0e0e0 1px, transparent 1px, transparent 20px),
    repeating-linear-gradient(to bottom, #e0e0e0 0, #e0e0e0 1px, transparent 1px, transparent 20px);
  border: 2px solid #bbb; /* Subtle border */
  border-radius: 8px;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  overflow: hidden; /* Ensure nothing spills outside the border */
}
</style>