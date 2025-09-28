//-------Imports------//
import { ListNode, Point2d } from "./Node";
//-------------------//

export class CircularLinkedList {
    private head: ListNode | null = null;
    private _size: number = 0;

    //-------Constructor------//
    // Can start with list of points
    constructor(points: Point2d[] = []) {
        if(points.length > 0) {
            this.initializeFromPoints(points);
        }
    }
    //-----------------------//

    //-------Helper function-----//
    //Loops thru points & inserts nodes
    private initializeFromPoints(points: Point2d[]): void {
        for(const point of points) {
            this.addNode(point.x, point.y);
        }
    }
    //-------------------------//

    //---------Getters-----------//
    get size(): number {
        return this._size;
    }
    
    // Not needed but maybe comes in clutch
    get isEmpty(): boolean {
        return this._size === 0;
    }
    //--------------------------//

    //---------Add Node Function----------//
    addNode(x: number, y: number, index?: number): ListNode {
        const newNode = new ListNode(x, y);
        
        //Case1- Empty List
        if(this._size === 0) {
            this.head = newNode;
            newNode.next = newNode;
            newNode.prev = newNode;
        //Case2- Out of range -> insert at end
        } else if (index === undefined || index >= this._size) {
            this.insertAtEnd(newNode);
        //Case3- Valid Insert at pos
        } else {
            this.insertAtIndex(newNode, Math.max(0, index));
        }

        this._size++;
        return newNode;
    }

    //------Helper Functions------//

    //Finds tail node and will insert new node between tail & head
    private insertAtEnd(newNode: ListNode): void {
        if(!this.head) return;

        const tail = this.head.prev!;
        tail.next = newNode;
        newNode.prev = tail;
        newNode.next = this.head;
        this.head.prev = newNode;
    }

    private insertAtIndex(newNode: ListNode, index: number): void {
        //------Special Case-----//
        if (index === 0){
            this.insertAtEnd(newNode);
            this.head = newNode;
            return;
        }
        //-----------------------//

        const targetNode = this.getNodeAt(index);
        if(!targetNode) return;

        //Update connections
        const prevNode = targetNode.prev!;
        prevNode.next = newNode;
        newNode.prev = prevNode;
        newNode.next = targetNode;
        targetNode.prev = newNode;
    }
    //----------------------------//

    //--------Remove Node Functions--------//
    removeNode(index: number): ListNode | null {
        if(this._size === 0 || index < 0 || index >= this._size) {
            return null;
        }
        const nodeToRemove = this.getNodeAt(index);
        if (!nodeToRemove) return null;

        return this.removeNodeByRef(nodeToRemove);
    }

    removeNodeByRef(node: ListNode): ListNode | null {
        if (this._size === 0 || !node) return null;

        if(this._size === 1){
            this.head = null;
        } else {
            const prevNode = node.prev!;
            const nextNode = node.next!;
            prevNode.next = nextNode;
            nextNode.prev = prevNode;

            if(this.head === node){
                this.head = nextNode;
            }
        }

        // Clean up references to help garbage collection
        node.next = null;
        node.prev = null;
        this._size--;
        return node;
    }
    //------------------------------------//

    //--------Get Node Function--------//
    getNodeAt(index: number): ListNode | null {
        if (this._size === 0 || index < 0 || index >= this._size) {
            return null;
        }

        let current = this.head!;
        
        // Optimize traversal direction based on index
        if (index <= this._size / 2) {
            // Traverse forward from head
            for (let i = 0; i < index; i++) {
                current = current.next!;
            }
        } else {
            // Traverse backward from head
            for (let i = this._size - 1; i > index; i--) {
                current = current.prev!;
            }
        }
        
        return current;
    }
    //--------------------------------//

    //--------Find Closest Node--------//
    /**
     * Find the node closest to given coordinates
     * @param x - X coordinate
     * @param y - Y coordinate
     * @returns Closest node and distance or null if list is empty
     */
    findClosestNode(x: number, y: number): { node: ListNode; distance: number; index: number } | null {
        if (this._size === 0) return null;

        let closestNode = this.head!;
        let minDistance = closestNode.distanceTo({ x, y });
        let closestIndex = 0;

        this.traverse((node, index) => {
            const distance = node.distanceTo({ x, y });
            if (distance < minDistance) {
                minDistance = distance;
                closestNode = node;
                closestIndex = index;
            }
        });

        return { node: closestNode, distance: minDistance, index: closestIndex };
    }
    //--------------------------------//

    //--------Conversion Functions--------//
    /**
     * Convert list to array of points
     * @returns Array of Point2d objects
     */
    toArray(): Point2d[] {
        const points: Point2d[] = [];
        this.traverse((node) => {
            points.push(node.toPoint());
        });
        return points;
    }

    /**
     * Convert to SketchPreview format (with z coordinate)
     * @returns Array of {x, y, z} objects for SketchPreview component
     */
    toSketchPreviewFormat(): {x: number, y: number, z: number}[] {
        return this.toArray().map(p => ({x: p.x, y: p.y, z: 0}));
    }

    /**
     * Get array of all nodes (not just points)
     * @returns Array of ListNode objects
     */
    toNodeArray(): ListNode[] {
        const nodes: ListNode[] = [];
        this.traverse((node) => {
            nodes.push(node);
        });
        return nodes;
    }
    //----------------------------------//

    //--------Traversal Functions--------//
    /**
     * Traverse all nodes in the list
     * @param callback - Function to call for each node
     */
    traverse(callback: (node: ListNode, index: number) => void): void {
        if (this._size === 0) return;

        let current = this.head!;
        for (let i = 0; i < this._size; i++) {
            callback(current, i);
            current = current.next!;
        }
    }

    /**
     * Traverse nodes in reverse order
     * @param callback - Function to call for each node
     */
    traverseReverse(callback: (node: ListNode, index: number) => void): void {
        if (this._size === 0) return;

        let current = this.head!.prev!; // Start from tail
        for (let i = this._size - 1; i >= 0; i--) {
            callback(current, i);
            current = current.prev!;
        }
    }
    //----------------------------------//

    //--------Utility Functions--------//
    /**
     * Reverse the direction of the list
     */
    reverse(): void {
        if (this._size <= 1) return;

        this.traverse((node) => {
            // Swap next and prev pointers
            const temp = node.next;
            node.next = node.prev;
            node.prev = temp;
        });

        // Update head to maintain same starting position
        this.head = this.head!.next;
    }

    /**
     * Create a deep copy of the entire list
     * @returns New CircularLinkedList instance
     */
    clone(): CircularLinkedList {
        const newList = new CircularLinkedList();
        this.traverse((node) => {
            const newNode = newList.addNode(node.x, node.y);
            // Copy metadata if it exists
            if (node.metaData) {
                newNode.metaData = { ...node.metaData, id: crypto.randomUUID() };
            }
        });
        return newList;
    }

    /**
     * Remove all nodes from the list
     */
    clear(): void {
        if (this._size === 0) return;

        // Break circular references to help garbage collection
        this.traverse((node) => {
            node.next = null;
            node.prev = null;
        });

        this.head = null;
        this._size = 0;
    }

    /**
     * Get the first node (head)
     * @returns Head node or null if empty
     */
    getFirst(): ListNode | null {
        return this.head;
    }

    /**
     * Get the last node (tail)
     * @returns Tail node or null if empty
     */
    getLast(): ListNode | null {
        return this.head?.prev || null;
    }

    /**
     * Check if the list contains a specific node
     * @param searchNode - Node to search for
     * @returns True if found, false otherwise
     */
    contains(searchNode: ListNode): boolean {
        if (this._size === 0) return false;

        let found = false;
        this.traverse((node) => {
            if (node === searchNode) {
                found = true;
            }
        });
        return found;
    }

    /**
     * Find index of a specific node
     * @param searchNode - Node to find
     * @returns Index of node or -1 if not found
     */
    indexOf(searchNode: ListNode): number {
        if (this._size === 0) return -1;

        let foundIndex = -1;
        this.traverse((node, index) => {
            if (node === searchNode) {
                foundIndex = index;
            }
        });
        return foundIndex;
    }
    //--------------------------------//

    //--------Geometric Calculations--------//

    /**
     * Calculate the area enclosed by the polygon using the shoelace formula
     * @returns Area of the polygon (positive for counter-clockwise, negative for clockwise)
     */
    calculateArea(): number {
        if (this._size < 3) return 0;

        let area = 0;
        this.traverse((node) => {
            const nextNode = node.next!;
            area += (node.x * nextNode.y) - (nextNode.x * node.y);
        });
        return Math.abs(area) / 2;
    }

    /**
     * Get the bounding box of all nodes
     * @returns Object with min/max x,y coordinates
     */
    getBoundingBox(): { minX: number; maxX: number; minY: number; maxY: number } | null {
        if (this._size === 0) return null;

        let minX = this.head!.x;
        let maxX = this.head!.x;
        let minY = this.head!.y;
        let maxY = this.head!.y;

        this.traverse((node) => {
            minX = Math.min(minX, node.x);
            maxX = Math.max(maxX, node.x);
            minY = Math.min(minY, node.y);
            maxY = Math.max(maxY, node.y);
        });

        return { minX, maxX, minY, maxY };
    }
    //------------------------------------//

    //--------Debug Functions--------//
    /**
     * Get string representation for debugging
     */
    toString(): string {
        if (this._size === 0) return 'CircularLinkedList: []';
        
        const points = this.toArray();
        const pointsStr = points.map(p => `(${p.x}, ${p.y})`).join(' -> ');
        return `CircularLinkedList[${this._size}]: ${pointsStr} -> (circular)`;
    }

    /**
     * Validate the integrity of the circular list
     * Useful for debugging - checks if all connections are correct
     */
    validate(): boolean {
        if (this._size === 0) return this.head === null;
        if (this._size === 1) {
            return this.head !== null && 
                   this.head.next === this.head && 
                   this.head.prev === this.head;
        }

        let nodeCount = 0;
        let current = this.head!;
        
        // Check forward traversal
        do {
            if (!current.next || !current.prev) return false;
            if (current.next.prev !== current) return false;
            if (current.prev.next !== current) return false;
            
            current = current.next;
            nodeCount++;
            
            if (nodeCount > this._size + 1) return false; // Prevent infinite loop
        } while (current !== this.head);

        return nodeCount === this._size;
    }
    //------------------------------//
}
