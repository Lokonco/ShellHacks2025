// https://stackoverflow.com/questions/75949590/how-can-i-make-loadpyodide-available-to-any-component
import {loadPyodide, type PyodideInterface} from "pyodide";

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
            this.instance = await loadPyodide();
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