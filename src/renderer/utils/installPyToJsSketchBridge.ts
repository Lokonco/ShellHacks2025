// Utility to expose JS functions callable from Pyodide.
// This is extracted from PythonInputContext.vue to keep things DRY and reusable.

import { CircularLinkedList } from "./CircularLinkedList";

export function installPyToJsSketchBridge(py: any) {
  const g: any = globalThis as any;
  send_points_registry(g);
  send_points_multi_registry(g);
  print_circular_list_registry(g);

  // Also inject into Python so users can call `send_points_multi` without importing from js
  try {
    if (py && typeof py.runPython === 'function') {
      py.runPython(
        "import builtins\n" +
        "from js import send_points, send_points_multi, print_circular_list\n" +
        "builtins.send_points = send_points\n" +
        "builtins.send_points_multi = send_points_multi\n" +
        "builtins.print_circular_list = print_circular_list\n"
      );
    }
  } catch (e) {
    // non-fatal; Python code can still `from js import ...` manually
    console.warn('Bridge install: could not prebind functions into Python builtins', e);
  }
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
        point_type([pyPoints]);
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
