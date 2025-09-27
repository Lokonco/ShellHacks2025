//-----Interfaces-----//

//NodeMetaData is used for extra node information
export interface NodeMetaData {
    id: string; //Identifer 
    selected: boolean; // UI to see if node is selected
    color: string; //Color of the node
    type: 'vertex' | 'control' | 'anchor'; //Type of node, maybe control p for curve or anchor for polygon
}

//Cords with no meta data
export interface Point2d{ 
    x: number;
    y: number;
}
//-----------------------//

//------For Circular double linked list-----//
export class ListNode {
    public x: number;
    public y: number;
    public next: ListNode | null = null;
    public prev: ListNode | null = null;
    constructor (x: number, y: number) {
        this.x = x
        this.y = y
    }
}


//------Constructor-----//
export class BasicNode {
        x: number
        y : number
        metadata


    constructor (x: number, y: number, metadata?: Partial<NodeMetaData>) {
        this.x = x;
        this.y = y;
        this.metadata = {
            id: crypto.randomUUID(),
            selected: false,
            color: '#3498db',
            type: 'vertex',
            ...metadata
        };
    }
    //------------------//

    //-----Converts node into x,y obj-----//
    toPoint(): Point2d {
        return {x: this.x, y: this.y
        };
    }
    //----------------------//

    //--------Distance function------//
    //Formula- √(x1 - x2)^2 + (y1- y2)^2
    //For slecting nodes near mouse or whatever else u can think of

    distanceTo(other: ListNode | Point2d): number {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    //-------Function for updating node cords-----//
    setPos(x: number, y:number): void{
        this.x = x;
        this.y = y;
    }

    //-------Debug function--------//
    toString(): string {
        return 'Node'
    }
}
