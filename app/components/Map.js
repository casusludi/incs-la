import xs from 'xstream';
import tween from 'xstream/extra/tween'
import delay from 'xstream/extra/delay'
import { run } from '@cycle/run';
import { svg } from '@cycle/dom';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

import {Landmark} from './Landmark';
import {Path} from './Path';

import * as _ from 'lodash';

function intent(DOM){

    return xs.merge(
        DOM.select('.js-show-map').events('click').fold((acc, x) => acc ? false : true, false).map(value => ({type: "showMap", value: value})),
    );
}

function model(DOM, progression$, path$, currentLocation$, settings$, locations$, currentLinksValues$){
    const locationsWithPixelCoordinates$ = xs.combine(currentLocation$, settings$, locations$, currentLinksValues$)
    .map(([currentLocation, settings, locations, currentLinksValues]) => {
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
    
    const landmarks$ = locationsWithPixelCoordinates$.map(locationsWithPixelCoordinates =>
        locationsWithPixelCoordinates.map(locationWithPixelCoordinates =>
            Landmark({DOM, props$: xs.of(locationWithPixelCoordinates)})
        )
    );

    const pathSink = Path({locationsWithPixelCoordinates$, progression$, path$});

    return {landmarks$, pathSink};
}

function view(value, currentLocation$, settings$, locations$, currentLinksValues$, progression$, path$, action$, travelAnimationState$){
    const landmarksVdom$ = value.landmarks$.map(landmarks => {
        // const latitudeIdentifiedLandmarks = landmarks.map(landmark =>
        //     landmark.latitude$.map(latitude =>
        //          ({landmark, latitude})
        //     )
        // );

        // return xs.combine(...latitudeIdentifiedLandmarks).map(latitudeIdentifiedLandmarksArray => {
        //     console.log(latitudeIdentifiedLandmarksArray);
        //     console.log(_.chain(latitudeIdentifiedLandmarksArray).sortBy('latitude').value());
        //     const test$ = xs.combine(...(_.chain(latitudeIdentifiedLandmarksArray).sortBy('latitude').map(o => o.landmark.DOM).value()));
        //     const test2$ = xs.merge(...(latitudeIdentifiedLandmarksArray.sort((a, b) => a.latitude - b.latitude).map(o => o.landmark.DOM)));
        //     test2$.addListener({
        //         next: (value) => {
        //             console.log('The Stream gave me a value: ', value);
        //         },
        //     });
        //     return xs.combine(...(_.chain(latitudeIdentifiedLandmarksArray).sortBy('latitude').map(o => o.landmark.DOM).value()));
        // });
        return  xs.combine(...landmarks.map(landmark => landmark.DOM));
    }).flatten();

    const showMap$ = action$.filter(action => action.type === "showMap").map(showMap => showMap.value);
    const pathVdom$ = value.pathSink.DOM;

    // travelAnimationState$.addListener({
    //     next: i => console.log(i),
    // });

    const travelAnimationVdom$ = travelAnimationState$.map(([currentLocationPixelCoordinates, newLocationPixelCoordinates, animationValue]) =>
        svg.line({ attrs: {
            x1: currentLocationPixelCoordinates.x + (newLocationPixelCoordinates.x - currentLocationPixelCoordinates.x) * animationValue,
            y1: currentLocationPixelCoordinates.y + (newLocationPixelCoordinates.y - currentLocationPixelCoordinates.y) * animationValue,
            x2: currentLocationPixelCoordinates.x + (newLocationPixelCoordinates.x - currentLocationPixelCoordinates.x) * (animationValue - 0.1),
            y2: currentLocationPixelCoordinates.y + (newLocationPixelCoordinates.y - currentLocationPixelCoordinates.y) * (animationValue - 0.1),
            style: 'stroke: rgb(200,0,0); stroke-width: 4; stroke-dasharray: 10, 5;'}})
    ).startWith("")
    .debug("travelAnimationVdom");
    
    const vdom$ = xs.combine(landmarksVdom$, pathVdom$, currentLocation$, settings$, locations$, currentLinksValues$, showMap$, travelAnimationVdom$)
    .map(([landmarksVdom, pathVdom, currentLocation, settings, locations, currentLinksValues, showMap, travelAnimationVdom]) =>
        <div>
            <button className="js-show-map" type="button" >Show map</button>
            {showMap ?
                <div class-map="true">
                    {
                        svg({ attrs: { viewBox:"0 0 792 574", width: "100%", height: "100%", 'background-color': "green"}}, [
                            svg.image({ attrs: { width: "100%", height: "100%", 'xlink:href': settings.images.map}}),
                            // pathVdom,
                            // travelAnimationVdom,
                            ...landmarksVdom,
                            svg.image(".js-show-map", { attrs: { width: "20px", height: "20px", x: "10px", y: "10px", 'xlink:href': settings.images.closeMapIcon}}),
                            {/*svg.rect(".js-show-map", { attrs: { width: "100%", height: "100%", fill:"red", "fill-opacity": "0.25"}}),*/}
                        ])
                    }
                </div>
                : ""
            }
        </div>
    );

    return vdom$;
}

function _Map(sources) {
    const {DOM, progression$, path$, currentLocation$, settings$, locations$, currentLinksValues$} = sources;
    const action$ = intent(DOM);
    const value = model(DOM, progression$, path$, currentLocation$, settings$, locations$, currentLinksValues$);
    
    const changeLocation$ = value.landmarks$.map(landmarks =>
        xs.merge(...landmarks.map(landmark => landmark.changeLocation$))
    ).flatten().debug("changeLocation");

    const getLandmark = function(location$){
        return xs.combine(location$, value.landmarks$).map(([location, landmarks]) => {
            const identifiedLandmarks = landmarks.map(landmark => 
                landmark.id$.map(id =>
                    {return {id, landmark}}
                )
            );
            
            console.log("MDR")
            
            return xs.combine(...identifiedLandmarks).map(identifiedLandmarksCombined =>
                identifiedLandmarksCombined.filter(identifiedLandmark => 
                    identifiedLandmark.id === location.id
                )[0].landmark
            );
        }).flatten();
    }

    const currentLandmark$ = getLandmark(currentLocation$).debug("current");

    const newLandmark$ = getLandmark(changeLocation$).debug("new");
    
    newLandmark$.addListener({
        next: i => console.log("ALLEZ STP", i),
    });
    
    const animationDuration = 2;
    const travelAnimationState$ = xs.combine(
        currentLandmark$.map(currentLandmark => currentLandmark.pixelCoordinates$).flatten(),
        xs.of({x: 0, y: 0}), //newLandmark$.map(newLandmark => newLandmark.pixelCoordinates$).flatten(),
        changeLocation$.mapTo(tween({
            from: 0,
            to: 1,
            ease: tween.linear.ease,
            duration: animationDuration * 1000, // milliseconds
        })).flatten(),
        // changeLocation$.mapTo(
        //     xs.periodic(1000/60).map(value => 
        //         value / 60)
        //     ).flatten()
        //     .map(value =>
        //         value / animationDuration
        //     ),
    ).debug("travelAnimationState");
    
    // travelAnimationState$.addListener({
    //     next: i => console.log("TEST", i),
    // });

    const vdom$ = view(value, currentLocation$, settings$, locations$, currentLinksValues$, progression$, path$, action$, travelAnimationState$);

    const sinks = {
        DOM: vdom$,
        changeLocation$: changeLocation$.compose(delay(animationDuration * 1000)),
    };

    return sinks;
}

export function Map(sources){ return isolate(_Map)(sources) };