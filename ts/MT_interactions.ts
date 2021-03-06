import { FSM } from "./FSM";
import * as transfo from "./transfo";


function multiTouch(element: HTMLElement) : void {
    let pointerId_1 : number, Pt1_coord_element : SVGPoint, Pt1_coord_parent : SVGPoint,
        pointerId_2 : number, Pt2_coord_element : SVGPoint, Pt2_coord_parent : SVGPoint,
        originalMatrix : SVGMatrix, originalMatrixInverse : SVGMatrix,
        getRelevantDataFromEvent = (evt : TouchEvent) : Touch => {
            for(let i=0; i<evt.changedTouches.length; i++) {
                console.log(evt);
                let touch = evt.changedTouches.item(i);
                if(touch.identifier === pointerId_1 || touch.identifier === pointerId_2) {
                    return touch;
                }
            }
            return null;
        };
    enum MT_STATES {Inactive, Translating, Rotozooming}
    let fsm = FSM.parse<MT_STATES>( {
        initialState: MT_STATES.Inactive,
        states: [MT_STATES.Inactive, MT_STATES.Translating, MT_STATES.Rotozooming],
        transitions : [
            { from: MT_STATES.Inactive, to: MT_STATES.Translating,
                eventTargets: [element],
                eventName: ["touchstart"],
                useCapture: false,
                action: (evt : TouchEvent) : boolean => {

                    let touch = evt.changedTouches.item(0);
                    pointerId_1 = touch.identifier;
                    originalMatrix =transfo.getMatrixFromElement(element);
                    Pt1_coord_parent = transfo.getPoint(touch.clientX, touch.clientY);
                    Pt1_coord_element = Pt1_coord_parent.matrixTransform(originalMatrix.inverse());
                    return true;
                }
            },
            { from: MT_STATES.Translating, to: MT_STATES.Translating,
                eventTargets: [document],
                eventName: ["touchmove"],
                useCapture: true,
                action: (evt : TouchEvent) : boolean => {
                    evt.preventDefault();
                    evt.stopPropagation();

                    let data = getRelevantDataFromEvent(evt);
                    Pt1_coord_parent = transfo.getPoint(data.clientX, data.clientY);
                    transfo.drag(element, originalMatrix, Pt1_coord_element, Pt1_coord_parent);
                    return true;
                }
            },
            { from: MT_STATES.Translating,
                to: MT_STATES.Inactive,
                eventTargets: [document],
                eventName: ["touchend"],
                useCapture: true,
                action: (evt : TouchEvent) : boolean => {

                    originalMatrix = transfo.getMatrixFromElement(element);
                    return true;
                }
            },
            { from: MT_STATES.Translating, to: MT_STATES.Rotozooming,
                eventTargets: [element],
                eventName: ["touchstart"],
                useCapture: false,
                action: (evt : TouchEvent) : boolean => {

                    var positionElement = element.getBoundingClientRect();

                    let touch =  evt.changedTouches.item(0);

                    Pt2_coord_element = transfo.getPoint(touch.clientX - positionElement.left,touch.clientY - positionElement.top);

                    originalMatrix = transfo.getMatrixFromElement(element);
                    return true;
                }
            },
            { from: MT_STATES.Rotozooming, to: MT_STATES.Rotozooming,
                eventTargets: [document],
                eventName: ["touchmove"],
                useCapture: true,
                action: (evt : TouchEvent) : boolean => {
                    evt.preventDefault();
                    evt.stopPropagation();

                    let touch = evt.changedTouches.item(0);
                    let touch2 = evt.changedTouches.item(1);


                    if(touch.identifier === pointerId_1) {
                        Pt1_coord_parent = transfo.getPoint(touch.clientX,touch.clientY);
                        if(touch2 !== null) {
                            Pt2_coord_parent = transfo.getPoint(touch2.clientX,touch2.clientY);
                        }
                    } else {
                        Pt2_coord_parent = transfo.getPoint(touch.clientX,touch.clientY);
                        if(touch2 !== null) {
                            Pt1_coord_parent = transfo.getPoint(touch2.clientX,touch2.clientY);
                        }
                    }

                    transfo.rotozoom(element,originalMatrix,Pt1_coord_element,Pt1_coord_parent,Pt2_coord_element,Pt2_coord_parent);

                    return true;
                }
            },
            { from: MT_STATES.Rotozooming,
                to: MT_STATES.Translating,
                eventTargets: [document],
                eventName: ["touchend"],
                useCapture: true,
                action: (evt : TouchEvent) : boolean => {
                    let touch = getRelevantDataFromEvent(evt);
                    if (touch !== null) {
                        if(touch.identifier === pointerId_1) {
                            Pt1_coord_element = Pt2_coord_element;
                            Pt1_coord_parent = Pt2_coord_parent;
                            pointerId_1 = pointerId_2;
                        }

                        Pt2_coord_parent = null;
                        Pt2_coord_element = null;
                        pointerId_2=null;
                    }

                    originalMatrix = transfo.getMatrixFromElement(element);
                    return true;
                }
            }
        ]
    } );
    fsm.start();
}

//______________________________________________________________________________________________________________________
//______________________________________________________________________________________________________________________
//______________________________________________________________________________________________________________________
function isString(s : any) : boolean {
    return typeof(s) === "string" || s instanceof String;
}

export let $ = (sel : string | Element | Element[]) : void => {
    let L : Element[] = [];
    if( isString(sel) ) {
        L = Array.from( document.querySelectorAll(<string>sel) );
    } else if(sel instanceof Element) {
        L.push( sel );
    } else if(sel instanceof Array) {
        L = sel;
    }
    L.forEach( multiTouch );
};
