import xs from 'xstream';

import { svg } from '@cycle/dom';

import { html } from 'snabbdom-jsx';

const locationNbOnPath = 4;

function model(pixelCoordinates$, progression$, path$, currentLocation$){
    // Keep only correct locations
    // const pathLocations$ = xs.combine(pixelCoordinates$, progression$, path$, currentLocation$)
    // .map(([pixelCoordinates, progression, path, currentLocation]) => {
    //     const pathLocationsIds = [...path.slice(0, progression + 1).map(o => o.location), currentLocation.id];
    //     const pathLocations = pathLocationsIds.map(pathLocationId =>
    //         pixelCoordinates.filter(o => o.location.id === pathLocationId)[0],
    //     );
    //     return pathLocations;
    // });

    // Keep all visited locations
    // const pathLocations$ = xs.combine(pixelCoordinates$, currentLocation$)
    // .map(([pixelCoordinates, currentLocation]) => 
    //     pixelCoordinates.filter(o => o.location.id === currentLocation.id)[0]
    // ).fold((stack, currentLocation) => [...stack, currentLocation], []);

    // Keep last visited locations
    const pathLocations$ = xs.combine(pixelCoordinates$, currentLocation$)
    .map(([pixelCoordinates, currentLocation]) => 
        pixelCoordinates.filter(o => o.location.id === currentLocation.id)[0]
    ).fold((stack, currentLocation) => [...stack, currentLocation].slice(-locationNbOnPath), [])
    .filter(pathLocations => pathLocations.length !== 0);

    return pathLocations$.map(pathLocations =>
        pathLocations.slice(0, pathLocations.length - 1).map((item, i) => ({
            x1: pathLocations[i].pixelCoordinates.x, 
            y1: pathLocations[i].pixelCoordinates.y, 
            x2: pathLocations[i + 1].pixelCoordinates.x, 
            y2: pathLocations[i + 1].pixelCoordinates.y,
        }))
    );
}

function view(state$){
    const vdom$ = state$.map(state => {
        const lines = state.map((line, i) =>
            svg.line({ attrs: { 
                x1: line.x1, 
                y1: line.y1, 
                x2: line.x2, 
                y2: line.y2, 
                style: `
                    stroke: rgb(200,200,200); 
                    stroke-width: 4; 
                    stroke-dasharray: 10, 10; 
                    stroke-linecap: round; 
                    stroke-opacity: ${/* 0.5 OR */ (locationNbOnPath + i - state.length) / locationNbOnPath};
                `
            }})
        );
        
        return svg.g([
            ...lines
        ]);
    });

    return vdom$;
}

export function Path(sources) {
    const {pixelCoordinates$, progression$, path$, currentLocation$} = sources;

    const state$ = model(pixelCoordinates$, progression$, path$, currentLocation$);
    const vdom$ = view(state$);

    const sinks = {
        DOM: vdom$,
    };

    return sinks;
}