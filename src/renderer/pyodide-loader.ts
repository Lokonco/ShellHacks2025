// https://stackoverflow.com/questions/75949590/how-can-i-make-loadpyodide-available-to-any-component
import {loadPyodide, type PyodideInterface} from "pyodide";
import pythonConsole from './stores/pythonConsole'

interface PyodideLoader {
    instance: PyodideInterface | null;
    readyCallbacks: ((pyodide: PyodideInterface) => void)[];

    init(): Promise<void>;

    onReady(func: (pyodide: PyodideInterface) => void): void;
}

export default {
    instance: null,
    readyCallbacks: [],
    // initiate the pyodide instance
    async init() {
        // only initiate once
        if (!this.instance) {
            this.instance = await loadPyodide({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.3/full"
            });
            // Route Python stdout/stderr to our console store
            try {
                // @ts-ignore: setStdout exists in Pyodide 0.28+
                if (typeof (this.instance as any).setStdout === 'function') {
                    (this.instance as any).setStdout({
                        batched: (output: string) => {
                            pythonConsole.appendStdout(output)
                        },
                        isatty: false,
                    })
                }
                // @ts-ignore: setStderr exists in Pyodide 0.28+
                if (typeof (this.instance as any).setStderr === 'function') {
                    (this.instance as any).setStderr({
                        batched: (output: string) => {
                            pythonConsole.appendStderr(output)
                        },
                        isatty: false,
                    })
                }
            } catch (e) {
                console.warn('Failed to set Pyodide stdio handlers', e)
            }
            // after initiating success, execute the callback queue
            this.readyCallbacks.forEach((func) => {
                func(this.instance!);
            });
            this.readyCallbacks = []
        }
    },
    // use this function to ensure the instance is initiated
    onReady(func) {
        if (!this.instance) {
            this.readyCallbacks.push(func);
        } else {
            func(this.instance);
        }
    },
} as PyodideLoader;