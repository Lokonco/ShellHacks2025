// Utility to expose JS functions callable from Pyodide.
// This is extracted from PythonInputContext.vue to keep things DRY and reusable.
// Now includes GeometryUtils functions for comprehensive CAD functionality.

import { CircularLinkedList } from "./CircularLinkedList";
import { GeometryUtils } from "./GeometryUtils";
import { LevelOfDetail } from "./LevelOfDetail";

export function installPyToJsSketchBridge(py: any) {
  console.log('Installing unified Python-to-JS bridge...');
  
  const g: any = globalThis as any;
  
  // Install drawing functions
  send_points_registry(g);
  send_points_multi_registry(g);
  print_circular_list_registry(g);
  
  // Install GeometryUtils functions
  geometry_utils_registry(g);

  // Also inject into Python so users can call functions without importing from js
  try {
    if (py && typeof py.runPython === 'function') {
      py.runPython(
        "import builtins\n" +
        "from js import send_points, send_points_multi, print_circular_list, geometry\n" +
        "builtins.send_points = send_points\n" +
        "builtins.send_points_multi = send_points_multi\n" +
        "builtins.print_circular_list = print_circular_list\n" +
        "builtins.geometry = geometry\n"
      );
    }
  } catch (e) {
    // non-fatal; Python code can still `from js import ...` manually
    console.warn('Bridge install: could not prebind functions into Python builtins', e);
  }
  
  console.log('Unified Python-to-JS bridge installed successfully');
}

function point_type(args: any[]) {
    const toArrayOfPoints = (maybeSeq: any) => {
        const seq = typeof maybeSeq?.toJs === 'function'
            ? maybeSeq.toJs({dict_converter: Object.fromEntries})
            : maybeSeq;
        const arr = Array.from(seq || []);
        return arr.map((p: any) => ({
            x: Number(p?.x ?? p?.get?.('x') ?? 0),
            y: Number(p?.y ?? p?.get?.('y') ?? 0),
            z: Number(p?.z ?? p?.get?.('z') ?? 0),
        }));
    };
    let normArrays: Array<Array<{ x: number, y: number, z: number }>> = [];
    try {
        normArrays = args.map(toArrayOfPoints);
        window.dispatchEvent(new CustomEvent('sketch:multi_points', {detail: normArrays}));
    } finally {
        // Attempt to destroy PyProxy arguments if provided
        for (const a of args) {
            try {
                if (a && typeof a.destroy === 'function') a.destroy();
            } catch {
            }
        }
    }
}

function send_points_multi_registry(g: any) {
    if ((g as any).send_points_multi) return;
    (g as any).send_points_multi = (...args: any[]) => {
        point_type(args);
    }
}

function send_points_registry(g: any) {
    if ((g as any).send_points) return;
    (g as any).send_points = (pyPoints: any) => {
        // Normalize single sequence to JS points array
        const toArrayOfPoints = (maybeSeq: any) => {
            const seq = typeof maybeSeq?.toJs === 'function'
                ? maybeSeq.toJs({dict_converter: Object.fromEntries})
                : maybeSeq;
            const arr = Array.from(seq || []);
            return arr.map((p: any) => ({
                x: Number(p?.x ?? p?.get?.('x') ?? 0),
                y: Number(p?.y ?? p?.get?.('y') ?? 0),
                z: Number(p?.z ?? p?.get?.('z') ?? 0),
            }));
        };
        try {
            const pts = toArrayOfPoints(pyPoints);
            // Fire both events so existing listeners work:
            // - 'sketch:points' for single-shape pipelines
            // - 'sketch:multi_points' for unified handling as one entry
            window.dispatchEvent(new CustomEvent('sketch:points', { detail: pts }));
            window.dispatchEvent(new CustomEvent('sketch:multi_points', { detail: [pts] }));
        } finally {
            try { if (pyPoints && typeof pyPoints.destroy === 'function') pyPoints.destroy(); } catch {}
        }
    }
}

function print_circular_list_registry(g: any) {
    if ((g as any).print_circular_list) return;
    (g as any).print_circular_list = (pyList: any) => {
        try {
            const obj = typeof pyList?.toJs === 'function'
                ? pyList.toJs({ dict_converter: Object.fromEntries })
                : pyList;

            let linkedList: CircularLinkedList = obj;

            console.log(linkedList);

        } finally {
            if (pyList && typeof pyList.destroy === 'function') {
                try { pyList.destroy() } catch {}
            }
        }
    }
}

function geometry_utils_registry(g: any) {
    if ((g as any).geometry) return;
    
    // Helper function to convert Python points to JS format
    const convertPythonPoints = (pyPoints: any) => {
        if (!pyPoints) return [];
        
        // Handle different Python point formats
        if (typeof pyPoints?.toJs === 'function') {
            return pyPoints.toJs({ dict_converter: Object.fromEntries });
        }
        
        // Handle array of points
        if (Array.isArray(pyPoints)) {
            return pyPoints.map((p: any) => ({
                x: Number(p?.x ?? p?.get?.('x') ?? 0),
                y: Number(p?.y ?? p?.get?.('y') ?? 0)
            }));
        }
        
        return [];
    };

    // Install geometry functions on globalThis for Python access via js module
    (g as any).geometry = {
        // Area and perimeter calculations
        calculateArea: (pyPoints: any) => {
            try {
                const points = convertPythonPoints(pyPoints);
                const list = new CircularLinkedList(points);
                return GeometryUtils.calculateArea(list);
            } catch (e) {
                console.error('Error calculating area:', e);
                return 0;
            }
        },

        calculatePerimeter: (pyPoints: any) => {
            try {
                const points = convertPythonPoints(pyPoints);
                const list = new CircularLinkedList(points);
                return GeometryUtils.calculatePerimeter(list);
            } catch (e) {
                console.error('Error calculating perimeter:', e);
                return 0;
            }
        },

        getBoundingBox: (pyPoints: any) => {
            try {
                const points = convertPythonPoints(pyPoints);
                const list = new CircularLinkedList(points);
                return GeometryUtils.getBoundingBox(list);
            } catch (e) {
                console.error('Error getting bounding box:', e);
                return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
            }
        },

        getCentroid: (pyPoints: any) => {
            try {
                const points = convertPythonPoints(pyPoints);
                const list = new CircularLinkedList(points);
                return GeometryUtils.getCentroid(list);
            } catch (e) {
                console.error('Error getting centroid:', e);
                return { x: 0, y: 0 };
            }
        },

        // Point-in-polygon test
        isPointInPolygon: (point: any, pyPoints: any) => {
            try {
                const testPoint = { x: Number(point.x), y: Number(point.y) };
                const points = convertPythonPoints(pyPoints);
                const list = new CircularLinkedList(points);
                return GeometryUtils.isPointInPolygon(testPoint, list);
            } catch (e) {
                console.error('Error testing point in polygon:', e);
                return false;
            }
        },

        // Transformations (return modified points for visualization)
        scale: (pyPoints: any, scaleX: number, scaleY?: number, centerX?: number, centerY?: number) => {
            try {
                const points = convertPythonPoints(pyPoints);
                const list = new CircularLinkedList(points);
                GeometryUtils.scale(list, scaleX, scaleY, centerX, centerY);
                return list.toSketchPreviewFormat();
            } catch (e) {
                console.error('Error scaling:', e);
                return [];
            }
        },

        translate: (pyPoints: any, deltaX: number, deltaY: number) => {
            try {
                const points = convertPythonPoints(pyPoints);
                const list = new CircularLinkedList(points);
                GeometryUtils.translate(list, deltaX, deltaY);
                return list.toSketchPreviewFormat();
            } catch (e) {
                console.error('Error translating:', e);
                return [];
            }
        },

        rotate: (pyPoints: any, angleRadians: number, centerX?: number, centerY?: number) => {
            try {
                const points = convertPythonPoints(pyPoints);
                const list = new CircularLinkedList(points);
                GeometryUtils.rotate(list, angleRadians, centerX, centerY);
                return list.toSketchPreviewFormat();
            } catch (e) {
                console.error('Error rotating:', e);
                return [];
            }
        },

        // Advanced operations
        smooth: (pyPoints: any, iterations?: number, factor?: number) => {
            try {
                const points = convertPythonPoints(pyPoints);
                const list = new CircularLinkedList(points);
                GeometryUtils.smooth(list, iterations || 1, factor || 0.5);
                return list.toSketchPreviewFormat();
            } catch (e) {
                console.error('Error smoothing:', e);
                return [];
            }
        },

        offset: (pyPoints: any, distance: number) => {
            try {
                const points = convertPythonPoints(pyPoints);
                const list = new CircularLinkedList(points);
                const offsetList = GeometryUtils.offset(list, distance);
                return offsetList.toSketchPreviewFormat();
            } catch (e) {
                console.error('Error creating offset:', e);
                return [];
            }
        },

        // Shape generators
        generateCircle: (centerX: number, centerY: number, radius: number, segments?: number) => {
            try {
                const center = { x: centerX, y: centerY };
                const circle = GeometryUtils.generateCircle(center, radius, segments || 32);
                return circle.toSketchPreviewFormat();
            } catch (e) {
                console.error('Error generating circle:', e);
                return [];
            }
        },

        generateRectangle: (x: number, y: number, width: number, height: number) => {
            try {
                const rect = GeometryUtils.generateRectangle(x, y, width, height);
                return rect.toSketchPreviewFormat();
            } catch (e) {
                console.error('Error generating rectangle:', e);
                return [];
            }
        },

        // Utility functions
        snapToGrid: (point: any, gridSize: number) => {
            try {
                const p = { x: Number(point.x), y: Number(point.y) };
                return GeometryUtils.snapToGrid(p, gridSize);
            } catch (e) {
                console.error('Error snapping to grid:', e);
                return { x: 0, y: 0 };
            }
        },

        distance: (p1: any, p2: any) => {
            try {
                const point1 = { x: Number(p1.x), y: Number(p1.y) };
                const point2 = { x: Number(p2.x), y: Number(p2.y) };
                return GeometryUtils.distance(point1, point2);
            } catch (e) {
                console.error('Error calculating distance:', e);
                return 0;
            }
        },

        // Level of Detail (LOD) functions
        generateAdaptiveCircle: (centerX: number, centerY: number, radius: number, zoomLevel: number) => {
            try {
                const center = { x: centerX, y: centerY };
                const circle = LevelOfDetail.generateAdaptiveCircle(center, radius, zoomLevel);
                return circle.toSketchPreviewFormat();
            } catch (e) {
                console.error('Error generating adaptive circle:', e);
                return [];
            }
        },

        applyAdaptiveSmoothing: (pyPoints: any, zoomLevel: number) => {
            try {
                const points = convertPythonPoints(pyPoints);
                const list = new CircularLinkedList(points);
                const smoothed = LevelOfDetail.applyAdaptiveSmoothing(list, zoomLevel);
                return smoothed.toSketchPreviewFormat();
            } catch (e) {
                console.error('Error applying adaptive smoothing:', e);
                return [];
            }
        },

        simplifyShape: (pyPoints: any, zoomLevel: number) => {
            try {
                const points = convertPythonPoints(pyPoints);
                const list = new CircularLinkedList(points);
                const simplified = LevelOfDetail.simplifyShape(list, zoomLevel);
                return simplified.toSketchPreviewFormat();
            } catch (e) {
                console.error('Error simplifying shape:', e);
                return [];
            }
        },

        generateAdaptiveBezier: (pyControlPoints: any, zoomLevel: number) => {
            try {
                const controlPoints = convertPythonPoints(pyControlPoints);
                const bezier = LevelOfDetail.generateAdaptiveBezier(controlPoints, zoomLevel);
                return bezier.toSketchPreviewFormat();
            } catch (e) {
                console.error('Error generating adaptive bezier:', e);
                return [];
            }
        },

        getRenderingHints: (zoomLevel: number) => {
            try {
                return LevelOfDetail.getRenderingHints(zoomLevel);
            } catch (e) {
                console.error('Error getting rendering hints:', e);
                return {
                    showNodes: false,
                    nodeSize: 2,
                    lineWidth: 1,
                    showDetails: false,
                    antiAlias: true
                };
            }
        }
    };
}
