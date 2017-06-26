import xs from 'xstream';
import { run } from '@cycle/run';
import { svg } from '@cycle/dom';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

import * as _ from 'lodash';

// function intent(DOM){

// }

function model(locationsWithPixelCoordinates$, progression$, path$){
    return xs.combine(locationsWithPixelCoordinates$, progression$, path$)
        .map(([locationsWithPixelCoordinates, progression, path]) => {
            return path.slice(0, progression).map((item, i) => {
                const curLocation = locationsWithPixelCoordinates.filter(item => item.location.id === path[i].location)[0];
                const nextLocation = locationsWithPixelCoordinates.filter(item => item.location.id === path[i + 1].location)[0];
                
                return {
                    x1: curLocation.pixelCoordinates.x, 
                    y1: curLocation.pixelCoordinates.y, 
                    x2: nextLocation.pixelCoordinates.x, 
                    y2: nextLocation.pixelCoordinates.y
                };
            })
    });
}

function view(value$){
    const vdom$ = value$.map(value => {
        const lines = value.map(line => svg.line({ attrs: { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2, style: "stroke: rgb(0,0,0); stroke-width: 2" }}));
        return svg.g([
            ...lines
        ]);
    });

    return vdom$;
}

function _Path(sources) {
    const {locationsWithPixelCoordinates$, progression$, path$} = sources;

    // const action$ = intent(DOM);
    const value$ = model(locationsWithPixelCoordinates$, progression$, path$);
    const vdom$ = view(value$);

    const sinks = {
        DOM: vdom$,
    };

    return sinks;
}

export function Path(sources){ return isolate(_Path)(sources) };