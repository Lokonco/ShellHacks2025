import { createApp } from 'vue'
import './style.css';
import App from './App.vue'

import { CircularLinkedList } from './utils/CircularLinkedList'
import { ListNode } from './utils/Node'


// Expose to Pyodide's `js` module
(globalThis as any).CircularLinkedList = CircularLinkedList;
(globalThis as any).ListNode = ListNode;

const app = createApp(App);

app.mount('#app');
