import xs from 'xstream';
import { run } from '@cycle/run';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

import {Landmark} from './Landmark';

import * as _ from 'lodash';

function intent(DOM){

    const click$ = DOM
        .select('.js-show-map')
        .events('click');

    const showMap$ = click$.fold((acc, x) => acc ? false : true, false);

    return showMap$;
}

function model(props$, DOM){
    const propsWithPixelCoordinates$ = props$.map(([currentLocation, settings, locations, currentLinksValues]) => {
        const landmark1 = settings.landmarks[0].location;
        const landmark2 = settings.landmarks[1].location;
        const coordinateLandmark1 = locations[landmark1].coordinates;
        const coordinateLandmark2 = locations[landmark2].coordinates;
        const pixelCoordinateLandmark1 = settings.landmarks[0].pixelCoordinates;
        const pixelCoordinateLandmark2 = settings.landmarks[1].pixelCoordinates;

        const linksIDs = currentLinksValues.map(currentLinkValue => currentLinkValue.id);

        return Object.keys(locations).map((key, value) => {
            const xRatio = (coordinateLandmark2.latitude - coordinateLandmark1.latitude) / (pixelCoordinateLandmark2.x - pixelCoordinateLandmark1.x);
            const x0 = (pixelCoordinateLandmark2.x * coordinateLandmark1.latitude - pixelCoordinateLandmark1.x * coordinateLandmark2.latitude) / (pixelCoordinateLandmark2.x - pixelCoordinateLandmark1.x);
            const curX = (locations[key].coordinates.latitude - x0) / xRatio - settings.landmarkImageDimension.x / 2;
            
            const yRatio = (coordinateLandmark2.longitude - coordinateLandmark1.longitude) / (pixelCoordinateLandmark2.y - pixelCoordinateLandmark1.y);
            const y0 = (pixelCoordinateLandmark2.y * coordinateLandmark1.longitude - pixelCoordinateLandmark1.y * coordinateLandmark2.longitude) / (pixelCoordinateLandmark2.y - pixelCoordinateLandmark1.y);
            const curY = (locations[key].coordinates.longitude - y0) / yRatio - settings.landmarkImageDimension.y;

            const isCurrentLocation = key === currentLocation.id;
            const isReachableLandmark = _.includes(linksIDs, key);

            return {
                settings: settings,
                location: Object.assign({}, locations[key], {id: key}),
                pixelCoordinates: {
                    x: curX,
                    y: curY,
                },
                isCurrentLocation: isCurrentLocation,
                isReachableLandmark: isReachableLandmark,
            }
        });
    });
    
    const landmarks$ = propsWithPixelCoordinates$.map(propsWithPixelCoordinates =>
        propsWithPixelCoordinates.map(propWithPixelCoordinates =>
            Landmark({DOM: DOM, props$: xs.of(propWithPixelCoordinates)})
        )
    );

    return landmarks$;
}

function view(value$, props$, action$){
    const landmarksVTree$ = value$.map(landmarks =>
        xs.combine(...landmarks.map(landmark => landmark.DOM))
    ).flatten();
    
    const vdom$ = xs.combine(value$, landmarksVTree$, props$, action$).map(([value, landmarksVTree, [currentLocation, settings, locations, currentLinksValues], showMap]) => {
        return (<div>
            <button selector=".js-show-map" type="button" >Show map</button>
            {showMap ?
                <div class-map="true">
                    <img src={settings.images.map} style={ ({position: 'relative', top: '0', left: '0'}) } />
                    {landmarksVTree}
                </div>
                : ""
            }
        </div>)}
    );

    return vdom$;
}

function _Map(sources) {
    const {props$, DOM} = sources;
    const action$ = intent(DOM);
    const value$ = model(props$, DOM);
    
    const changeLocation$ = value$.map(landmarks =>
        xs.merge(...landmarks.map(landmark => landmark.changeLocation$))
    ).flatten();

    const vdom$ = view(value$, props$, action$);

    const sinks = {
        DOM: vdom$,
        changeLocation$: changeLocation$,
    };

    return sinks;
}

export function Map(sources){ return isolate(_Map)(sources) };