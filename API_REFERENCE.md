# 🛠️ CAD Editor API Reference

**Complete Python API Documentation for the ShellHacks CAD Editor**

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Drawing Functions](#drawing-functions)
3. [Shape Generators](#shape-generators)
4. [Geometric Calculations](#geometric-calculations)
5. [Transformations](#transformations)
6. [Advanced CAD Features](#advanced-cad-features)
7. [Level of Detail System](#level-of-detail-system)
8. [Complete Examples](#complete-examples)
9. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

All functions are automatically available in Python - no imports needed!

```python
# Basic drawing - create a triangle
triangle = [
    {"x": 50, "y": 0},
    {"x": 100, "y": 100},
    {"x": 0, "y": 100}
]
send_points(triangle)
```

---

## 🎨 Drawing Functions

### `send_points(points)`
Draws a single shape on the canvas.

**Parameters:**
- `points` - List of point dictionaries with `x` and `y` coordinates

**Example:**
```python
# Draw a square
square = [
    {"x": 0, "y": 0},
    {"x": 100, "y": 0},
    {"x": 100, "y": 100},
    {"x": 0, "y": 100}
]
send_points(square)
```

### `send_points_multi(*shapes)`
Draws multiple shapes simultaneously with different colors.

**Parameters:**
- `*shapes` - Multiple point arrays (up to 5 shapes with automatic colors)

**Example:**
```python
# Draw multiple shapes at once
circle = geometry.generateCircle(50, 50, 30)
square = geometry.generateRectangle(100, 100, 50, 50)
send_points_multi(circle, square)
```

---

## 🔷 Shape Generators

### `geometry.generateRectangle(x, y, width, height)`
Creates a rectangular shape.

**Parameters:**
- `x, y` - Top-left corner coordinates
- `width, height` - Rectangle dimensions

**Returns:** List of points forming a rectangle

**Example:**
```python
rect = geometry.generateRectangle(10, 10, 80, 40)
send_points(rect)
```

### `geometry.generateCircle(centerX, centerY, radius, segments=32)`
Creates a circular shape.

**Parameters:**
- `centerX, centerY` - Center coordinates
- `radius` - Circle radius
- `segments` - Number of segments (optional, default: 32)

**Returns:** List of points forming a circle

**Example:**
```python
# Basic circle
circle = geometry.generateCircle(100, 100, 50)
send_points(circle)

# High-resolution circle
detailed_circle = geometry.generateCircle(200, 100, 50, 64)
send_points(detailed_circle)
```

---

## 📐 Geometric Calculations

### `geometry.calculateArea(points)`
Calculates the area of a polygon.

**Parameters:**
- `points` - List of points forming a closed polygon

**Returns:** Area as a number

**Example:**
```python
square = geometry.generateRectangle(0, 0, 10, 10)
area = geometry.calculateArea(square)
print(f"Square area: {area}")  # Output: 100
```

### `geometry.calculatePerimeter(points)`
Calculates the perimeter of a polygon.

**Parameters:**
- `points` - List of points forming a polygon

**Returns:** Perimeter as a number

**Example:**
```python
square = geometry.generateRectangle(0, 0, 10, 10)
perimeter = geometry.calculatePerimeter(square)
print(f"Square perimeter: {perimeter}")  # Output: 40
```

### `geometry.getBoundingBox(points)`
Gets the bounding box of a shape.

**Parameters:**
- `points` - List of points

**Returns:** Dictionary with `minX`, `minY`, `maxX`, `maxY`, `width`, `height`

**Example:**
```python
circle = geometry.generateCircle(100, 100, 50)
bbox = geometry.getBoundingBox(circle)
print(f"Bounding box: {bbox['width']} x {bbox['height']}")
```

### `geometry.getCentroid(points)`
Calculates the geometric center of a shape.

**Parameters:**
- `points` - List of points

**Returns:** Dictionary with `x` and `y` coordinates

**Example:**
```python
triangle = [{"x": 0, "y": 0}, {"x": 100, "y": 0}, {"x": 50, "y": 100}]
center = geometry.getCentroid(triangle)
print(f"Center: ({center['x']}, {center['y']})")
```

### `geometry.isPointInPolygon(point, points)`
Tests if a point is inside a polygon.

**Parameters:**
- `point` - Dictionary with `x` and `y` coordinates
- `points` - List of points forming the polygon

**Returns:** Boolean (True if inside, False if outside)

**Example:**
```python
square = geometry.generateRectangle(0, 0, 100, 100)
test_point = {"x": 50, "y": 50}
inside = geometry.isPointInPolygon(test_point, square)
print(f"Point is inside: {inside}")  # Output: True
```

### `geometry.distance(point1, point2)`
Calculates distance between two points.

**Parameters:**
- `point1, point2` - Dictionaries with `x` and `y` coordinates

**Returns:** Distance as a number

**Example:**
```python
p1 = {"x": 0, "y": 0}
p2 = {"x": 3, "y": 4}
dist = geometry.distance(p1, p2)
print(f"Distance: {dist}")  # Output: 5.0
```

---

## 🔄 Transformations

### `geometry.scale(points, scaleX, scaleY=None, centerX=0, centerY=0)`
Scales a shape around a center point.

**Parameters:**
- `points` - List of points to scale
- `scaleX` - X-axis scale factor
- `scaleY` - Y-axis scale factor (optional, defaults to scaleX)
- `centerX, centerY` - Center of scaling (optional, defaults to origin)

**Returns:** List of scaled points

**Example:**
```python
square = geometry.generateRectangle(0, 0, 50, 50)
# Scale 2x around center of square
scaled = geometry.scale(square, 2.0, 2.0, 25, 25)
send_points(scaled)
```

### `geometry.translate(points, deltaX, deltaY)`
Moves a shape by specified distances.

**Parameters:**
- `points` - List of points to move
- `deltaX, deltaY` - Movement distances

**Returns:** List of translated points

**Example:**
```python
circle = geometry.generateCircle(0, 0, 30)
moved = geometry.translate(circle, 100, 50)
send_points(moved)
```

### `geometry.rotate(points, angleRadians, centerX=0, centerY=0)`
Rotates a shape around a center point.

**Parameters:**
- `points` - List of points to rotate
- `angleRadians` - Rotation angle in radians
- `centerX, centerY` - Center of rotation (optional)

**Returns:** List of rotated points

**Example:**
```python
import math
square = geometry.generateRectangle(0, 0, 50, 50)
# Rotate 45 degrees around center
rotated = geometry.rotate(square, math.pi/4, 25, 25)
send_points(rotated)
```

---

## 🔧 Advanced CAD Features

### `geometry.smooth(points, iterations=1, factor=0.5)`
Smooths a shape by averaging adjacent points.

**Parameters:**
- `points` - List of points to smooth
- `iterations` - Number of smoothing passes (optional)
- `factor` - Smoothing strength 0-1 (optional)

**Returns:** List of smoothed points

**Example:**
```python
# Create a rough shape and smooth it
rough_shape = [{"x": 0, "y": 0}, {"x": 50, "y": 10}, {"x": 100, "y": 0}]
smooth_shape = geometry.smooth(rough_shape, 2, 0.7)
send_points_multi(rough_shape, smooth_shape)
```

### `geometry.offset(points, distance)`
Creates an offset curve at specified distance.

**Parameters:**
- `points` - List of points forming the original shape
- `distance` - Offset distance (positive = outward, negative = inward)

**Returns:** List of points forming the offset shape

**Example:**
```python
original = geometry.generateCircle(100, 100, 40)
offset_out = geometry.offset(original, 10)   # Expand by 10
offset_in = geometry.offset(original, -10)   # Shrink by 10
send_points_multi(original, offset_out, offset_in)
```

### `geometry.snapToGrid(point, gridSize)`
Snaps a point to the nearest grid intersection.

**Parameters:**
- `point` - Dictionary with `x` and `y` coordinates
- `gridSize` - Grid spacing

**Returns:** Dictionary with snapped coordinates

**Example:**
```python
point = {"x": 23.7, "y": 45.2}
snapped = geometry.snapToGrid(point, 10)
print(f"Snapped to: ({snapped['x']}, {snapped['y']})")  # Output: (20, 50)
```

---

## 🔍 Level of Detail System

The LOD system automatically adjusts shape complexity based on zoom level for optimal performance.

### `geometry.generateAdaptiveCircle(centerX, centerY, radius, zoomLevel)`
Creates a circle with appropriate detail for the zoom level.

**Parameters:**
- `centerX, centerY` - Center coordinates
- `radius` - Circle radius
- `zoomLevel` - Current zoom level (0.2 to 5.0)

**Returns:** List of points with appropriate resolution

**Example:**
```python
# Low detail for zoomed out view
simple_circle = geometry.generateAdaptiveCircle(100, 100, 50, 0.5)
# High detail for zoomed in view
detailed_circle = geometry.generateAdaptiveCircle(200, 100, 50, 3.0)
send_points_multi(simple_circle, detailed_circle)
```

### `geometry.applyAdaptiveSmoothing(points, zoomLevel)`
Applies zoom-appropriate smoothing to a shape.

**Parameters:**
- `points` - List of points to smooth
- `zoomLevel` - Current zoom level

**Returns:** List of adaptively smoothed points

**Example:**
```python
# Create a jagged shape
jagged = [{"x": i*10, "y": 50 + 20*((i%2)*2-1)} for i in range(10)]
# Apply adaptive smoothing
smoothed = geometry.applyAdaptiveSmoothing(jagged, 1.0)
send_points_multi(jagged, smoothed)
```

### `geometry.simplifyShape(points, zoomLevel)`
Reduces point count based on zoom level.

**Parameters:**
- `points` - List of points to simplify
- `zoomLevel` - Current zoom level

**Returns:** List of simplified points

**Example:**
```python
# Create complex shape with many points
complex_shape = [{"x": i, "y": 50 + 20*math.sin(i*0.1)} for i in range(100)]
# Simplify for different zoom levels
simple = geometry.simplifyShape(complex_shape, 0.5)  # Very simplified
detailed = geometry.simplifyShape(complex_shape, 2.0)  # Keep most points
send_points_multi(complex_shape, simple, detailed)
```

### `geometry.generateAdaptiveBezier(controlPoints, zoomLevel)`
Creates a bezier curve with zoom-appropriate resolution.

**Parameters:**
- `controlPoints` - List of control points
- `zoomLevel` - Current zoom level

**Returns:** List of points forming the bezier curve

**Example:**
```python
# Define bezier control points
controls = [{"x": 0, "y": 50}, {"x": 50, "y": 0}, {"x": 100, "y": 100}, {"x": 150, "y": 50}]
# Generate adaptive bezier
curve = geometry.generateAdaptiveBezier(controls, 1.5)
send_points_multi(controls, curve)
```

### `geometry.getRenderingHints(zoomLevel)`
Gets optimal rendering settings for a zoom level.

**Parameters:**
- `zoomLevel` - Current zoom level

**Returns:** Dictionary with rendering hints

**Example:**
```python
hints = geometry.getRenderingHints(2.0)
print(f"Show nodes: {hints['showNodes']}")
print(f"Node size: {hints['nodeSize']}")
print(f"Line width: {hints['lineWidth']}")
```

---

## 💡 Complete Examples

### Example 1: Basic CAD Drawing
```python
# Create a house shape
print("🏠 Drawing a house...")

# House base (rectangle)
base = geometry.generateRectangle(50, 100, 100, 80)

# Roof (triangle)
roof = [
    {"x": 50, "y": 100},   # Bottom left
    {"x": 150, "y": 100},  # Bottom right  
    {"x": 100, "y": 50}    # Top point
]

# Door (small rectangle)
door = geometry.generateRectangle(90, 140, 20, 40)

# Draw all parts
send_points_multi(base, roof, door)
print("✅ House complete!")
```

### Example 2: Geometric Analysis
```python
# Analyze a shape's properties
print("📐 Geometric analysis...")

# Create a circle
circle = geometry.generateCircle(100, 100, 50)

# Calculate properties
area = geometry.calculateArea(circle)
perimeter = geometry.calculatePerimeter(circle)
center = geometry.getCentroid(circle)
bbox = geometry.getBoundingBox(circle)

print(f"Circle area: {area:.2f}")
print(f"Circle perimeter: {perimeter:.2f}")
print(f"Center: ({center['x']:.1f}, {center['y']:.1f})")
print(f"Bounding box: {bbox['width']:.1f} x {bbox['height']:.1f}")

# Test point inside
test_point = {"x": 100, "y": 100}
inside = geometry.isPointInPolygon(test_point, circle)
print(f"Point (100,100) inside circle: {inside}")

send_points(circle)
```

### Example 3: Shape Transformations
```python
# Demonstrate transformations
print("🔄 Shape transformations...")

# Start with a square
original = geometry.generateRectangle(0, 0, 50, 50)

# Apply transformations
scaled = geometry.scale(original, 1.5, 1.5, 25, 25)
rotated = geometry.rotate(scaled, math.pi/4, 25, 25)  
final = geometry.translate(rotated, 100, 100)

# Show progression
send_points_multi(original, scaled, rotated, final)
print("✅ Transformations complete!")
```

### Example 4: Advanced CAD Operations
```python
# Advanced CAD features
print("🔧 Advanced CAD operations...")

# Create base shape
base_shape = geometry.generateCircle(150, 150, 60)

# Create offset versions
outer_offset = geometry.offset(base_shape, 20)
inner_offset = geometry.offset(base_shape, -15)

# Apply smoothing
smoothed = geometry.smooth(base_shape, 3, 0.8)

# Show all versions
send_points_multi(base_shape, outer_offset, inner_offset, smoothed)
print("✅ Advanced operations complete!")
```

### Example 5: Level of Detail Demo
```python
# Demonstrate LOD system
print("🔍 Level of Detail demonstration...")

import math

# Create the same circle at different zoom levels
center_x, center_y, radius = 200, 150, 80

# Different zoom levels
zoom_far = 0.3    # Zoomed out - simple
zoom_medium = 1.0  # Normal - medium detail
zoom_close = 3.0   # Zoomed in - high detail

# Generate adaptive circles
simple = geometry.generateAdaptiveCircle(center_x, center_y, radius, zoom_far)
medium = geometry.generateAdaptiveCircle(center_x + 200, center_y, radius, zoom_medium)  
detailed = geometry.generateAdaptiveCircle(center_x + 400, center_y, radius, zoom_close)

print(f"Zoom {zoom_far}: {len(simple)} points")
print(f"Zoom {zoom_medium}: {len(medium)} points") 
print(f"Zoom {zoom_close}: {len(detailed)} points")

send_points_multi(simple, medium, detailed)
print("✅ LOD demonstration complete!")
```

### Example 6: Complex Shape Creation
```python
# Create a complex mechanical part
print("⚙️ Creating mechanical part...")

import math

# Main body (hexagon)
main_body = []
for i in range(6):
    angle = (2 * math.pi * i) / 6
    x = 200 + 80 * math.cos(angle)
    y = 200 + 80 * math.sin(angle)
    main_body.append({"x": x, "y": y})

# Center hole
center_hole = geometry.generateCircle(200, 200, 30)

# Mounting holes (4 corners)
hole1 = geometry.generateCircle(150, 150, 10)
hole2 = geometry.generateCircle(250, 150, 10)
hole3 = geometry.generateCircle(250, 250, 10)
hole4 = geometry.generateCircle(150, 250, 10)

# Calculate total area (body minus holes)
body_area = geometry.calculateArea(main_body)
hole_area = geometry.calculateArea(center_hole) + 4 * geometry.calculateArea(hole1)
net_area = body_area - hole_area

print(f"Part area: {net_area:.2f} square units")

# Draw the part
send_points_multi(main_body, center_hole, hole1, hole2, hole3, hole4)
print("✅ Mechanical part complete!")
```

---

## 🔧 Troubleshooting

### Common Issues

**Q: My shape isn't appearing on screen**
```python
# Check your points format
points = [
    {"x": 0, "y": 0},      # ✅ Correct
    {"x": 100, "y": 100}   # ✅ Correct
]
# NOT: [0, 0, 100, 100]  # ❌ Wrong format
```

**Q: Getting "geometry is not defined" error**
```python
# Try manual import if automatic doesn't work
from js import geometry
rect = geometry.generateRectangle(0, 0, 50, 50)
```

**Q: Points are in wrong positions**
```python
# Remember: (0,0) is top-left corner
# Positive X goes right, positive Y goes down
rect = geometry.generateRectangle(10, 10, 50, 50)  # x, y, width, height
```

**Q: Shape looks jagged or low quality**
```python
# Increase segments for smoother circles
smooth_circle = geometry.generateCircle(100, 100, 50, 64)  # 64 segments
# Or use adaptive generation
adaptive = geometry.generateAdaptiveCircle(100, 100, 50, 2.0)  # High zoom
```

**Q: Performance issues with complex shapes**
```python
# Use LOD system for better performance
simplified = geometry.simplifyShape(complex_points, 0.5)  # Reduce detail
# Or apply adaptive smoothing
smooth = geometry.applyAdaptiveSmoothing(points, 1.0)
```

### Best Practices

1. **Always use dictionaries for points**: `{"x": 10, "y": 20}`
2. **Close your polygons**: Make sure first and last points connect
3. **Use appropriate zoom levels**: 0.2 (far) to 5.0 (close) for LOD functions
4. **Check your math**: Use `math.pi` for radians, not degrees
5. **Test with simple shapes first**: Start with rectangles and circles

### Performance Tips

1. **Use `send_points_multi()` for multiple shapes** - more efficient than multiple `send_points()` calls
2. **Leverage LOD functions** when working with complex shapes
3. **Simplify shapes** when high precision isn't needed
4. **Use appropriate segment counts** for circles (8-64 typically)

---

## 📚 Function Quick Reference

| Category | Function | Purpose |
|----------|----------|---------|
| **Drawing** | `send_points(points)` | Draw single shape |
| | `send_points_multi(*shapes)` | Draw multiple shapes |
| **Generators** | `geometry.generateRectangle(x,y,w,h)` | Create rectangle |
| | `geometry.generateCircle(x,y,r,segs)` | Create circle |
| **Calculations** | `geometry.calculateArea(points)` | Get area |
| | `geometry.calculatePerimeter(points)` | Get perimeter |
| | `geometry.getBoundingBox(points)` | Get bounds |
| | `geometry.getCentroid(points)` | Get center |
| | `geometry.distance(p1,p2)` | Point distance |
| | `geometry.isPointInPolygon(pt,poly)` | Point-in-polygon test |
| **Transforms** | `geometry.scale(pts,sx,sy,cx,cy)` | Scale shape |
| | `geometry.translate(pts,dx,dy)` | Move shape |
| | `geometry.rotate(pts,angle,cx,cy)` | Rotate shape |
| **Advanced** | `geometry.smooth(pts,iter,factor)` | Smooth shape |
| | `geometry.offset(pts,distance)` | Offset curve |
| | `geometry.snapToGrid(pt,size)` | Snap to grid |
| **LOD** | `geometry.generateAdaptiveCircle(x,y,r,zoom)` | Adaptive circle |
| | `geometry.applyAdaptiveSmoothing(pts,zoom)` | Adaptive smoothing |
| | `geometry.simplifyShape(pts,zoom)` | Simplify by zoom |
| | `geometry.generateAdaptiveBezier(ctrl,zoom)` | Adaptive bezier |
| | `geometry.getRenderingHints(zoom)` | Get render settings |

---

**🎉 Happy CAD Scripting!**

*This API reference covers all available functions in your ShellHacks CAD Editor. For more examples and tutorials, experiment with the provided code samples!*
