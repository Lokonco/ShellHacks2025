// Level of Detail (LOD) system for adaptive shape resolution based on zoom level
// This system automatically adjusts the number of points/segments in shapes based on the current zoom level

import { CircularLinkedList } from './CircularLinkedList';
import { GeometryUtils } from './GeometryUtils';
import { Point2D } from './Node';

export interface LODConfig {
  minZoom: number;      // Minimum zoom level (most zoomed out)
  maxZoom: number;      // Maximum zoom level (most zoomed in)
  minSegments: number;  // Minimum number of segments when zoomed out
  maxSegments: number;  // Maximum number of segments when zoomed in
  smoothingFactor: number; // How much to smooth when zoomed out (0-1)
}

export class LevelOfDetail {
  private static defaultConfig: LODConfig = {
    minZoom: 0.2,
    maxZoom: 5.0,
    minSegments: 4,
    maxSegments: 64,
    smoothingFactor: 0.7
  };

  /**
   * Calculate the appropriate level of detail based on zoom level
   * @param zoomLevel Current zoom level from the canvas
   * @param config Optional LOD configuration
   * @returns LOD parameters for rendering
   */
  static calculateLOD(zoomLevel: number, config: Partial<LODConfig> = {}): {
    segments: number;
    smoothingIterations: number;
    smoothingFactor: number;
    showNodes: boolean;
    nodeSize: number;
  } {
    const cfg = { ...this.defaultConfig, ...config };
    
    // Clamp zoom level to configured range
    const clampedZoom = Math.max(cfg.minZoom, Math.min(cfg.maxZoom, zoomLevel));
    
    // Calculate zoom ratio (0 = most zoomed out, 1 = most zoomed in)
    const zoomRatio = (clampedZoom - cfg.minZoom) / (cfg.maxZoom - cfg.minZoom);
    
    // Calculate segments based on zoom level
    const segments = Math.round(cfg.minSegments + (cfg.maxSegments - cfg.minSegments) * zoomRatio);
    
    // Calculate smoothing parameters (more smoothing when zoomed out)
    const smoothingIterations = Math.round((1 - zoomRatio) * 3); // 0-3 iterations
    const smoothingFactor = cfg.smoothingFactor * (1 - zoomRatio);
    
    // Show individual nodes only when zoomed in enough
    const showNodes = zoomLevel > 1.5;
    const nodeSize = Math.max(2, Math.min(8, zoomLevel * 2));
    
    return {
      segments,
      smoothingIterations,
      smoothingFactor,
      showNodes,
      nodeSize
    };
  }

  /**
   * Apply LOD to a circular shape (circle, ellipse, etc.)
   * @param center Center point of the shape
   * @param radius Radius of the shape
   * @param zoomLevel Current zoom level
   * @param config Optional LOD configuration
   * @returns Optimized CircularLinkedList
   */
  static generateAdaptiveCircle(
    center: Point2D, 
    radius: number, 
    zoomLevel: number, 
    config: Partial<LODConfig> = {}
  ): CircularLinkedList {
    const lod = this.calculateLOD(zoomLevel, config);
    return GeometryUtils.generateCircle(center, radius, lod.segments);
  }

  /**
   * Apply LOD smoothing to an existing shape
   * @param list Original shape as CircularLinkedList
   * @param zoomLevel Current zoom level
   * @param config Optional LOD configuration
   * @returns Smoothed CircularLinkedList (creates a copy)
   */
  static applyAdaptiveSmoothing(
    list: CircularLinkedList, 
    zoomLevel: number, 
    config: Partial<LODConfig> = {}
  ): CircularLinkedList {
    const lod = this.calculateLOD(zoomLevel, config);
    
    // Create a copy to avoid modifying the original
    const smoothedList = list.clone();
    
    // Apply smoothing if zoom level is low enough
    if (lod.smoothingIterations > 0 && lod.smoothingFactor > 0) {
      GeometryUtils.smooth(smoothedList, lod.smoothingIterations, lod.smoothingFactor);
    }
    
    return smoothedList;
  }

  /**
   * Simplify a shape by reducing the number of points based on zoom level
   * @param list Original shape
   * @param zoomLevel Current zoom level
   * @param config Optional LOD configuration
   * @returns Simplified CircularLinkedList
   */
  static simplifyShape(
    list: CircularLinkedList, 
    zoomLevel: number, 
    config: Partial<LODConfig> = {}
  ): CircularLinkedList {
    const lod = this.calculateLOD(zoomLevel, config);
    
    // If we're zoomed in enough, return the original
    if (zoomLevel > 2.0 || list.size <= lod.segments) {
      return list;
    }
    
    // Calculate how many points to keep
    const targetPoints = Math.max(3, Math.min(list.size, lod.segments));
    const step = Math.max(1, Math.floor(list.size / targetPoints));
    
    // Create simplified version by sampling points
    const simplifiedPoints: Point2D[] = [];
    let index = 0;
    
    list.traverse((node) => {
      if (index % step === 0) {
        simplifiedPoints.push(node.toPoint());
      }
      index++;
    });
    
    // Ensure we have at least 3 points for a valid polygon
    if (simplifiedPoints.length < 3 && list.size >= 3) {
      // Fall back to evenly spaced points
      simplifiedPoints.length = 0;
      const evenStep = list.size / 3;
      for (let i = 0; i < 3; i++) {
        const node = list.getNodeAt(Math.floor(i * evenStep));
        if (node) {
          simplifiedPoints.push(node.toPoint());
        }
      }
    }
    
    return new CircularLinkedList(simplifiedPoints);
  }

  /**
   * Generate adaptive bezier curve points based on zoom level
   * @param controlPoints Control points for the bezier curve
   * @param zoomLevel Current zoom level
   * @param config Optional LOD configuration
   * @returns CircularLinkedList with appropriate resolution
   */
  static generateAdaptiveBezier(
    controlPoints: Point2D[], 
    zoomLevel: number, 
    config: Partial<LODConfig> = {}
  ): CircularLinkedList {
    const lod = this.calculateLOD(zoomLevel, config);
    
    // Generate bezier curve with adaptive resolution
    const points: Point2D[] = [];
    const steps = lod.segments;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = this.calculateBezierPoint(controlPoints, t);
      points.push(point);
    }
    
    return new CircularLinkedList(points);
  }

  /**
   * Calculate a point on a bezier curve
   * @param controlPoints Array of control points
   * @param t Parameter (0-1)
   * @returns Point on the curve
   */
  private static calculateBezierPoint(controlPoints: Point2D[], t: number): Point2D {
    if (controlPoints.length === 0) return { x: 0, y: 0 };
    if (controlPoints.length === 1) return { ...controlPoints[0] };
    
    // Use De Casteljau's algorithm for any number of control points
    let points = [...controlPoints];
    
    while (points.length > 1) {
      const newPoints: Point2D[] = [];
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        newPoints.push({
          x: p1.x + t * (p2.x - p1.x),
          y: p1.y + t * (p2.y - p1.y)
        });
      }
      points = newPoints;
    }
    
    return points[0];
  }

  /**
   * Get rendering hints based on zoom level
   * @param zoomLevel Current zoom level
   * @param config Optional LOD configuration
   * @returns Rendering configuration
   */
  static getRenderingHints(zoomLevel: number, config: Partial<LODConfig> = {}): {
    showNodes: boolean;
    nodeSize: number;
    lineWidth: number;
    showDetails: boolean;
    antiAlias: boolean;
  } {
    const lod = this.calculateLOD(zoomLevel, config);
    
    return {
      showNodes: lod.showNodes,
      nodeSize: lod.nodeSize,
      lineWidth: Math.max(1, Math.min(3, zoomLevel * 0.8)),
      showDetails: zoomLevel > 1.0,
      antiAlias: zoomLevel < 3.0 // Disable anti-aliasing at very high zoom for performance
    };
  }
}
