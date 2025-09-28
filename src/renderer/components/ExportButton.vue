<template>
  <div class="three-container">
    <button @click="exportSTL">Download STL</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as THREE from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'

// STL exporter
const exporter = new STLExporter()

//TODO: Get points from
const points: { x: number; y: number }[] = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 }
]

// Mesh variable
let mesh: THREE.Mesh

// Create mesh from points
function createMeshFromPoints(points: { x: number; y: number }[], depth = 3) {
  const shape = new THREE.Shape(points.map(p => new THREE.Vector2(p.x, p.y)))
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
  return new THREE.Mesh(geometry, material)
}

// Initialize mesh
function initMesh() {
  mesh = createMeshFromPoints(points)
}

// Export STL
function exportSTL(binary = true) {
  if (!mesh) return
  const stlData = exporter.parse(mesh, { binary })
  const blob = new Blob([stlData], { type: 'application/octet-stream' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'mesh.stl'
  link.click()
}

onMounted(() => {
  initMesh()
})
</script>

<style scoped>
</style>
