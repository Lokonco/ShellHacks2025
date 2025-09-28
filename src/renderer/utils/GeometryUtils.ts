import { Point2D, ListNode } from './Node';
import { CircularLinkedList } from './CircularLinkedList';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export class GeometryUtils {
  /**
   * Calculate the perimeter of the shape formed by the linked list
   */
  static calculatePerimeter(list: CircularLinkedList): number {
    if (list.size < 2) return 0;

    let perimeter = 0;
    
    list.traverse((node) => {
      const nextNode = node.next!;
      perimeter += this.distance(node, nextNode);
    });
    
    return perimeter;
  }

  /**
   * Calculate area of polygon using the shoelace formula
   * Works for simple polygons (non-self-intersecting)
   */
  static calculateArea(list: CircularLinkedList): number {
    if (list.size < 3) return 0;

    let area = 0;
    
    list.traverse((node) => {
      const nextNode = node.next!;
      area += node.x * nextNode.y - nextNode.x * node.y;
    });
    
    return Math.abs(area) / 2;
  }

  /**
   * Get bounding box that contains all nodes
   */
  static getBoundingBox(list: CircularLinkedList): BoundingBox {
    if (list.size === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    list.traverse((node) => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
    });

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Calculate distance between two points
   */
  static distance(p1: Point2D, p2: Point2D): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if a point is inside the polygon using ray casting algorithm
   */
  static isPointInPolygon(point: Point2D, list: CircularLinkedList): boolean {
    if (list.size < 3) return false;

    let inside = false;
    
    list.traverse((node) => {
      const nextNode = node.next!;
      
      // Ray casting algorithm
      if (((node.y > point.y) !== (nextNode.y > point.y)) &&
          (point.x < (nextNode.x - node.x) * (point.y - node.y) / (nextNode.y - node.y) + node.x)) {
        inside = !inside;
      }
    });
    
    return inside;
  }

  /**
   * Calculate the centroid (geometric center) of the polygon
   */
  static getCentroid(list: CircularLinkedList): Point2D {
    if (list.size === 0) return { x: 0, y: 0 };

    let sumX = 0;
    let sumY = 0;
    
    list.traverse((node) => {
      sumX += node.x;
      sumY += node.y;
    });

    return {
      x: sumX / list.size,
      y: sumY / list.size
    };
  }

  /**
   * Smooth the polygon using simple averaging
   * @param list - The list to smooth
   * @param iterations - Number of smoothing iterations
   * @param factor - Smoothing factor (0-1, where 1 is full smoothing)
   */
  static smooth(list: CircularLinkedList, iterations: number = 1, factor: number = 0.5): void {
    if (list.size < 3) return;

    for (let iter = 0; iter < iterations; iter++) {
      const newPositions: Point2D[] = [];
      
      list.traverse((node) => {
        const prev = node.prev!;
        const next = node.next!;
        
        // Calculate smoothed position
        const smoothedX = prev.x + node.x + next.x;
        const smoothedY = prev.y + node.y + next.y;
        
        // Blend with original position
        newPositions.push({
          x: node.x + (smoothedX / 3 - node.x) * factor,
          y: node.y + (smoothedY / 3 - node.y) * factor
        });
      });

      // Apply new positions
      let index = 0;
      list.traverse((node) => {
        const pos = newPositions[index++];
        node.setPosition(pos.x, pos.y);
      });
    }
  }

  /**
   * Scale the entire shape around a center point
   */
  static scale(
    list: CircularLinkedList, 
    scaleX: number, 
    scaleY: number = scaleX, 
    centerX: number = 0, 
    centerY: number = 0
  ): void {
    list.traverse((node) => {
      const newX = centerX + (node.x - centerX) * scaleX;
      const newY = centerY + (node.y - centerY) * scaleY;
      node.setPosition(newX, newY);
    });
  }

  /**
   * Translate (move) the entire shape
   */
  static translate(list: CircularLinkedList, deltaX: number, deltaY: number): void {
    list.traverse((node) => {
      node.setPosition(node.x + deltaX, node.y + deltaY);
    });
  }

  /**
   * Rotate the shape around a center point
   */
  static rotate(
    list: CircularLinkedList, 
    angleRadians: number, 
    centerX: number = 0, 
    centerY: number = 0
  ): void {
    const cos = Math.cos(angleRadians);
    const sin = Math.sin(angleRadians);
    
    list.traverse((node) => {
      const x = node.x - centerX;
      const y = node.y - centerY;
      
      const newX = centerX + x * cos - y * sin;
      const newY = centerY + x * sin + y * cos;
      
      node.setPosition(newX, newY);
    });
  }

  /**
   * Calculate the signed area (positive if counter-clockwise, negative if clockwise)
   */
  static getSignedArea(list: CircularLinkedList): number {
    if (list.size < 3) return 0;

    let area = 0;
    
    list.traverse((node) => {
      const nextNode = node.next!;
      area += node.x * nextNode.y - nextNode.x * node.y;
    });
    
    return area / 2;
  }

  /**
   * Check if the polygon vertices are ordered counter-clockwise
   */
  static isCounterClockwise(list: CircularLinkedList): boolean {
    return this.getSignedArea(list) > 0;
  }

  /**
   * Ensure the polygon is oriented counter-clockwise
   */
  static ensureCounterClockwise(list: CircularLinkedList): void {
    if (!this.isCounterClockwise(list)) {
      list.reverse();
    }
  }

  /**
   * Find the closest point on the polygon perimeter to a given point
   */
  static closestPointOnPerimeter(point: Point2D, list: CircularLinkedList): {
    point: Point2D;
    distance: number;
    segmentStart: Point2D;
    segmentEnd: Point2D;
  } | null {
    if (list.size < 2) return null;

    let closestPoint: Point2D = { x: 0, y: 0 };
    let minDistance = Infinity;
    let closestSegmentStart: Point2D = { x: 0, y: 0 };
    let closestSegmentEnd: Point2D = { x: 0, y: 0 };

    list.traverse((node) => {
      const nextNode = node.next!;
      const segmentResult = this.closestPointOnLineSegment(
        point, 
        node, 
        nextNode
      );
      
      if (segmentResult.distance < minDistance) {
        minDistance = segmentResult.distance;
        closestPoint = segmentResult.point;
        closestSegmentStart = node;
        closestSegmentEnd = nextNode;
      }
    });

    return {
      point: closestPoint,
      distance: minDistance,
      segmentStart: closestSegmentStart,
      segmentEnd: closestSegmentEnd
    };
  }

  /**
   * Find closest point on a line segment to a given point
   */
  private static closestPointOnLineSegment(
    point: Point2D, 
    segmentStart: Point2D, 
    segmentEnd: Point2D
  ): { point: Point2D; distance: number } {
    const dx = segmentEnd.x - segmentStart.x;
    const dy = segmentEnd.y - segmentStart.y;
    
    if (dx === 0 && dy === 0) {
      // Degenerate segment (point)
      return {
        point: { x: segmentStart.x, y: segmentStart.y },
        distance: this.distance(point, segmentStart)
      };
    }

    const t = Math.max(0, Math.min(1, 
      ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / (dx * dx + dy * dy)
    ));

    const closestPoint = {
      x: segmentStart.x + t * dx,
      y: segmentStart.y + t * dy
    };

    return {
      point: closestPoint,
      distance: this.distance(point, closestPoint)
    };
  }

  // ========== ADVANCED CAD FEATURES ==========

  /**
   * Create an offset curve (parallel curve at specified distance)
   * @param list - Original shape
   * @param distance - Offset distance (positive = outward, negative = inward)
   * @returns New CircularLinkedList representing the offset curve
   */
  static offset(list: CircularLinkedList, distance: number): CircularLinkedList {
    if (list.size < 3) return new CircularLinkedList();

    const offsetPoints: Point2D[] = [];
    
    list.traverse((node) => {
      const prev = node.prev!;
      const next = node.next!;
      
      // Calculate normal vectors for adjacent segments
      const v1 = this.normalize({ x: node.x - prev.x, y: node.y - prev.y });
      const v2 = this.normalize({ x: next.x - node.x, y: next.y - node.y });
      
      // Calculate perpendicular vectors (normals)
      const n1 = { x: -v1.y, y: v1.x };
      const n2 = { x: -v2.y, y: v2.x };
      
      // Average the normals to get the offset direction
      const avgNormal = this.normalize({
        x: (n1.x + n2.x) / 2,
        y: (n1.y + n2.y) / 2
      });
      
      // Calculate offset point
      offsetPoints.push({
        x: node.x + avgNormal.x * distance,
        y: node.y + avgNormal.y * distance
      });
    });
    
    return new CircularLinkedList(offsetPoints);
  }

  /**
   * Create a fillet (rounded corner) at a specific node
   * @param list - The shape to modify
   * @param nodeIndex - Index of the node to fillet
   * @param radius - Fillet radius
   */
  static fillet(list: CircularLinkedList, nodeIndex: number, radius: number): void {
    if (list.size < 3 || radius <= 0) return;
    
    const node = list.getNodeAt(nodeIndex);
    if (!node) return;
    
    const prev = node.prev!;
    const next = node.next!;
    
    // Calculate vectors from node to adjacent nodes
    const v1 = this.normalize({ x: prev.x - node.x, y: prev.y - node.y });
    const v2 = this.normalize({ x: next.x - node.x, y: next.y - node.y });
    
    // Calculate the angle between vectors
    const angle = Math.acos(Math.max(-1, Math.min(1, v1.x * v2.x + v1.y * v2.y)));
    
    // Calculate fillet arc parameters
    const arcDistance = radius / Math.tan(angle / 2);
    
    // Calculate arc start and end points
    const startPoint = {
      x: node.x + v1.x * arcDistance,
      y: node.y + v1.y * arcDistance
    };
    
    const endPoint = {
      x: node.x + v2.x * arcDistance,
      y: node.y + v2.y * arcDistance
    };
    
    // Replace the corner node with arc points
    const arcPoints = this.generateArcPoints(startPoint, endPoint, node, radius, 8);
    
    // Remove the original node
    list.removeNodeByRef(node);
    
    // Insert arc points
    arcPoints.forEach((point, i) => {
      list.addNode(point.x, point.y, nodeIndex + i);
    });
  }

  /**
   * Generate arc points between two points around a center
   */
  private static generateArcPoints(
    start: Point2D, 
    end: Point2D, 
    center: Point2D, 
    radius: number, 
    segments: number
  ): Point2D[] {
    const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
    const endAngle = Math.atan2(end.y - center.y, end.x - center.x);
    
    let angleDiff = endAngle - startAngle;
    if (angleDiff < 0) angleDiff += 2 * Math.PI;
    
    const points: Point2D[] = [];
    
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (angleDiff * i) / segments;
      points.push({
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      });
    }
    
    return points;
  }

  /**
   * Generate a circle as a CircularLinkedList
   */
  static generateCircle(center: Point2D, radius: number, segments: number = 32): CircularLinkedList {
    const points: Point2D[] = [];
    
    for (let i = 0; i < segments; i++) {
      const angle = (2 * Math.PI * i) / segments;
      points.push({
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      });
    }
    
    return new CircularLinkedList(points);
  }

  /**
   * Generate a rectangle as a CircularLinkedList
   */
  static generateRectangle(x: number, y: number, width: number, height: number): CircularLinkedList {
    const points: Point2D[] = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height }
    ];
    
    return new CircularLinkedList(points);
  }

  /**
   * Snap a point to the nearest grid intersection
   */
  static snapToGrid(point: Point2D, gridSize: number): Point2D {
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
  }

  /**
   * Normalize a vector to unit length
   */
  private static normalize(vector: Point2D): Point2D {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (length === 0) return { x: 0, y: 0 };
    
    return {
      x: vector.x / length,
      y: vector.y / length
    };
  }

  /**
   * Calculate the dot product of two vectors
   */
  static dotProduct(v1: Point2D, v2: Point2D): number {
    return v1.x * v2.x + v1.y * v2.y;
  }

  /**
   * Calculate the cross product of two 2D vectors (returns scalar)
   */
  static crossProduct(v1: Point2D, v2: Point2D): number {
    return v1.x * v2.y - v1.y * v2.x;
  }
}
