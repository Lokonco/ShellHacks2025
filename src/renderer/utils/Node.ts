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

// Type alias for consistency with GeometryUtils
export type Point2D = Point2d;
//-----------------------//

//-----Node Definition----//
export class ListNode {
    public x: number;
    public y: number;
    public next: ListNode | null = null;
    public prev: ListNode | null = null;
    public metaData?: NodeMetaData; //Optional meta data

    constructor (x: number, y: number, metaData?: Partial<NodeMetaData>) {
        this.x = x
        this.y = y
        if(metaData){
            this.metaData = {
                id: crypto.randomUUID(),
                selected: false,
                color: '#3498db',
                type: 'vertex',
                ...metaData
            };
        }
    }
    //-----Converts node into x,y obj-----//
    toPoint(): Point2d {
        return { x: this.x, y: this.y };
    }

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

    //-------Alternative method name for GeometryUtils compatibility-----//
    setPosition(x: number, y: number): void {
        this.setPos(x, y);
    }
    //----------------------------//


    //-------Debug function--------//
    toString(): string {
        return `Node(${this.x}, ${this.y})`;
    }
    //-----------------------------//

}
