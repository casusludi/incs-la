import xs from 'xstream';
import tween from 'xstream/extra/tween'
import delay from 'xstream/extra/delay'
import { run } from '@cycle/run';
import { svg } from '@cycle/dom';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

import {Landmark} from '../Landmark';
import {Path} from '../Path';

import * as _ from 'lodash';

function intent(DOM){

    return xs.merge(
        DOM.select('.js-show-map').events('click').fold((acc, x) => acc ? false : true, false).map(value => ({type: "showMap", value: value})),
        DOM.select('.js-hide-infos').events('click').map(value => ({type: "hideInfos"})),
        DOM.select('.js-travel-to').events('click').map(value => ({type: "travelTo"})),
    );
}

function model(DOM, progression$, path$, currentLocation$, settings$, locations$, currentLinksValues$){
    const locationsWithPixelCoordinates$ = xs.combine(currentLocation$, settings$, locations$, currentLinksValues$)
    .map(([currentLocation, settings, locations, currentLinksValues]) => {
        const landmark1 = settings.baseLandmarks[0].location;
        const landmark2 = settings.baseLandmarks[1].location;
        const coordinateLandmark1 = locations[landmark1].coordinates;
        const coordinateLandmark2 = locations[landmark2].coordinates;
        const pixelCoordinateLandmark1 = settings.baseLandmarks[0].pixelCoordinates;
        const pixelCoordinateLandmark2 = settings.baseLandmarks[1].pixelCoordinates;

        const linksIDs = currentLinksValues.map(currentLinkValue => currentLinkValue.id);

        return Object.keys(locations).map((key, value) => {
            const xRatio = (coordinateLandmark2.latitude - coordinateLandmark1.latitude) / (pixelCoordinateLandmark2.x - pixelCoordinateLandmark1.x);
            const x0 = (pixelCoordinateLandmark2.x * coordinateLandmark1.latitude - pixelCoordinateLandmark1.x * coordinateLandmark2.latitude) / (pixelCoordinateLandmark2.x - pixelCoordinateLandmark1.x);
            const curX = (locations[key].coordinates.latitude - x0) / xRatio;
            
            const yRatio = (coordinateLandmark2.longitude - coordinateLandmark1.longitude) / (pixelCoordinateLandmark2.y - pixelCoordinateLandmark1.y);
            const y0 = (pixelCoordinateLandmark2.y * coordinateLandmark1.longitude - pixelCoordinateLandmark1.y * coordinateLandmark2.longitude) / (pixelCoordinateLandmark2.y - pixelCoordinateLandmark1.y);
            const curY = (locations[key].coordinates.longitude - y0) / yRatio;

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
        locationsWithPixelCoordinates.map((locationWithPixelCoordinates,key) =>
            isolate(Landmark,key)({DOM, props$: xs.of(locationWithPixelCoordinates)})
        )
    );

    const pathSink = Path({locationsWithPixelCoordinates$, progression$, path$, currentLocation$});

    return {landmarks$, pathSink};
}

function view(value, currentLocation$, settings$, locations$, currentLinksValues$, progression$, path$, action$/*, travelAnimationState$*/, showInfos$){
    const landmarksVdom$ = value.landmarks$.map(landmarks => {
        const latitudeIdentifiedLandmarks = landmarks.map(landmark =>
            landmark.pixelCoordinates$.map(pixelCoordinates =>
                 ({landmark, latitude: pixelCoordinates.y})
            )
        );

        return xs.combine(...latitudeIdentifiedLandmarks).map(latitudeIdentifiedLandmarksArray => {
            const doms = _.chain(latitudeIdentifiedLandmarksArray)
                .sortBy('latitude')
                .map(o => o.landmark.DOM)
                .value();
            return xs.combine(...doms);
        }).flatten();
    }).flatten();

    const showMap$ = xs.merge(
        action$.filter(action => action.type === "showMap").map(showMap => showMap.value),
        currentLocation$.mapTo(false),
    );
    const pathVdom$ = value.pathSink.DOM;

    // const travelAnimationVdom$ = travelAnimationState$.map(([currentLocationPixelCoordinates, newLocationPixelCoordinates, animationValue]) =>
    //     svg.line({ attrs: {
    //         x1: currentLocationPixelCoordinates.x + (newLocationPixelCoordinates.x - currentLocationPixelCoordinates.x) * animationValue,
    //         y1: currentLocationPixelCoordinates.y + (newLocationPixelCoordinates.y - currentLocationPixelCoordinates.y) * animationValue,
    //         x2: currentLocationPixelCoordinates.x + (newLocationPixelCoordinates.x - currentLocationPixelCoordinates.x) * (animationValue - 0.1),
    //         y2: currentLocationPixelCoordinates.y + (newLocationPixelCoordinates.y - currentLocationPixelCoordinates.y) * (animationValue - 0.1),
    //         style: 'stroke: rgb(200,0,0); stroke-width: 4; stroke-dasharray: 10, 5;'}})
    // ).startWith("");

    const showInfosVdom$ = xs.combine(showInfos$, settings$).map(([showInfos, settings]) =>
        showInfos ?
            <div className="locationInfo scrollable-panel panel" style={{
                top: showInfos.pixelCoordinates.y+"px", 
                left: showInfos.pixelCoordinates.x+"px",
                width: "200px"
            }}>
                <img className="js-hide-infos"
                src={settings.images.closeMapIcon} style={{
                    width: "20px", 
                    background: "rgb(200, 200, 200)", 
                    padding: "3px",}} />
                <button className="js-travel-to button-3d" type="button">S'y rendre</button>
                <h3>{showInfos.location.name}</h3>
                <p>{showInfos.location.desc}</p>
            </div> :
            ""
    ).startWith("");
    
    const vdom$ = xs.combine(landmarksVdom$, pathVdom$, currentLocation$, settings$, locations$, currentLinksValues$, showMap$/*, travelAnimationVdom$*/, showInfosVdom$)
    .map(([landmarksVdom, pathVdom, currentLocation, settings, locations, currentLinksValues, showMap/*, travelAnimationVdom*/, showInfosVdom]) =>
        <div>
            <button className="js-show-map button-3d" type="button" >Afficher la carte</button>
            {showMap ?
                <div className="map">
                    <div className="mapContainer">
                        {
                            svg(".mapImage", { attrs: { viewBox:"0 0 792 574", width: "100%", height: "100%", 'background-color': "green"}}, [
                                svg.image({ attrs: { width: "100%", height: "100%", 'xlink:href': settings.images.map}}),
                                pathVdom,
                                // travelAnimationVdom,
                                ...landmarksVdom,
                                svg.image(".js-show-map", { attrs: { width: "20px", height: "20px", x: "10px", y: "10px", 'xlink:href': settings.images.closeMapIcon}}),
                            ])
                        }
                        {showInfosVdom}
                    </div>
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
    
    const landmarksShowInfos$ = value.landmarks$.map(landmarks =>
        xs.merge(...landmarks.map(landmark => landmark.showInfos$))
    ).flatten()
    
    const changeLocation$ = landmarksShowInfos$.map(showInfos =>
        action$.filter(action => action.type === "travelTo")
        .mapTo(showInfos.location)
    ).flatten();

    const showInfos$ = xs.merge(
        landmarksShowInfos$,
        xs.merge(
            action$.filter(action => action.type === "hideInfos"),
            currentLocation$,
        ).mapTo(null),
    );

    // changeLocation$.addListener({
    //     next: (value) => {
    //         console.log('The Stream gave me a value: ', value);
    //     },
    // });

    // const getLandmark = function(location$){
    //     return xs.combine(location$, value.landmarks$).map(([location, landmarks]) => {
    //         const identifiedLandmarks = landmarks.map(landmark => 
    //             landmark.id$.map(id =>
    //                 {return {id, landmark}}
    //             )
    //         );
            
    //         return xs.combine(...identifiedLandmarks).map(identifiedLandmarksCombined =>
    //             identifiedLandmarksCombined.filter(identifiedLandmark => 
    //                 identifiedLandmark.id === location.id
    //             )[0].landmark
    //         );
    //     }).flatten();
    // }

    // const currentLandmark$ = getLandmark(currentLocation$);

    // const newLandmark$ = getLandmark(changeLocation$);
    
    // const animationDuration = 2;
    // const travelAnimationState$ = xs.combine(
    //     currentLandmark$.map(currentLandmark => currentLandmark.pixelCoordinates$).flatten(),
    //     xs.of({x: 0, y: 0}), //newLandmark$.map(newLandmark => newLandmark.pixelCoordinates$).flatten(),
    //     changeLocation$.mapTo(tween({
    //         from: 0,
    //         to: 1,
    //         ease: tween.linear.ease,
    //         duration: animationDuration * 1000, // milliseconds
    //     })).flatten(),
    //     // changeLocation$.mapTo(
    //     //     xs.periodic(1000/60).map(value => 
    //     //         value / 60)
    //     //     ).flatten()
    //     //     .map(value =>
    //     //         value / animationDuration
    //     //     ),
    // ).debug("travelAnimationState");

    const vdom$ = view(value, currentLocation$, settings$, locations$, currentLinksValues$, progression$, path$, action$/*, travelAnimationState$*/, showInfos$);

    const sinks = {
        DOM: vdom$,
        changeLocation$: changeLocation$, // .compose(delay(animationDuration * 1000)),
    };

    return sinks;
}

export function Map(sources){ return isolate(_Map)(sources) };