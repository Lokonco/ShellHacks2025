// Utility to expose a JS function callable from Pyodide: from js import send_points
// This is extracted from PythonInputContext.vue to keep things DRY and reusable.

import {any} from "three/src/Three.TSL";
import {CircularLinkedList} from "./CircularLinkedList";

export function installPyToJsSketchBridge(py: any) {
  const g: any = globalThis as any;
  send_points_registry(g);
  print_circular_list_registry(g);
}

function send_points_registry(g: any) {
    if ((g as any).send_points) return;
    (g as any).send_points = (pyPoints: any) => {
        try {
            const points = typeof pyPoints?.toJs === 'function'
                ? pyPoints.toJs({ dict_converter: Object.fromEntries })
                : pyPoints
            const norm = Array.from(points || []).map((p: any) => ({
                x: Number(p?.x ?? p?.get?.('x') ?? 0),
                y: Number(p?.y ?? p?.get?.('y') ?? 0),
                z: Number(p?.z ?? p?.get?.('z') ?? 0),
            }))
            window.dispatchEvent(new CustomEvent('sketch:points', { detail: norm }))
        } finally {
            if (pyPoints && typeof pyPoints.destroy === 'function') {
                try { pyPoints.destroy() } catch {}
            }
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
