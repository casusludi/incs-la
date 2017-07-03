import xs from 'xstream';
import { run } from '@cycle/run';
import { svg } from '@cycle/dom';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

import * as _ from 'lodash';

function model(locationsWithPixelCoordinates$, progression$, jsonResponse$, currentLocation$){
    return xs.combine(locationsWithPixelCoordinates$, progression$, jsonResponse$, currentLocation$)
        .map(([locationsWithPixelCoordinates, progression, jsonResponse, currentLocation]) => {
            const pathLocations = [...jsonResponse.path.slice(0, progression + 1).map(o => o.location), currentLocation.id];
            
            return pathLocations.slice(0, pathLocations.length - 1).map((item, i) => {
                const curLocation = locationsWithPixelCoordinates.filter(o => o.location.id === pathLocations[i])[0];
                const nextLocation = locationsWithPixelCoordinates.filter(o => o.location.id === pathLocations[i + 1])[0];
                
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
        const lines = value.map(line => svg.line({ attrs: { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2, style: 'stroke: rgb(200,200,200); stroke-width: 4; stroke-dasharray: 10, 10; stroke-linecap: round; stroke-opacity: 0.5;' }}));
        return svg.g([
            ...lines
        ]);
    });

    return vdom$;
}

export function Path(sources) {
    const {locationsWithPixelCoordinates$, progression$, jsonResponse$, currentLocation$} = sources;

    const value$ = model(locationsWithPixelCoordinates$, progression$, jsonResponse$, currentLocation$);
    const vdom$ = view(value$);

    const sinks = {
        DOM: vdom$,
    };

    return sinks;
}