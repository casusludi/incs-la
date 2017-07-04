import xs from 'xstream';
import tween from 'xstream/extra/tween'
import delay from 'xstream/extra/delay'

import { run } from '@cycle/run';
import { svg } from '@cycle/dom';
import isolate from '@cycle/isolate';

import { html } from 'snabbdom-jsx';

import {Landmark} from '../Landmark';
import {LandmarkTooltip} from '../LandmarkTooltip';
import {Path} from '../Path';
import {makeLocationObject} from '../MainGame';

import * as _ from 'lodash';

function intent(DOM){
    return xs.merge(
        xs.merge(
            DOM.select('.js-show-map').events('click'),
            DOM.select('.map').events('click').filter(e => e.target.className === "map"),
            DOM.select('.svgMapTag').events('click').filter(e => e.target.className.baseVal === "svgMapTag")
        ).map(value => ({type: "showMap"})),
        DOM.select('.js-hide-infos').events('click').map(value => ({type: "hideInfos"})),
        DOM.select('.js-travel-to').events('click').map(value => ({type: "travelTo"})),
    );
}

function model(DOM, currentLocation$, currentLocationLinksIds$, progression$, datas$){
    const pixelCoordinates$ = datas$.map(datas => {
        const baseLandmarkId1 = datas.settings.baseLandmarks[0].location;
        const coordinateLandmark1 = datas.locations[baseLandmarkId1].coordinates;
        const pixelCoordinateLandmark1 = datas.settings.baseLandmarks[0].pixelCoordinates;

        const baseLandmarkId2 = datas.settings.baseLandmarks[1].location;
        const coordinateLandmark2 = datas.locations[baseLandmarkId2].coordinates;
        const pixelCoordinateLandmark2 = datas.settings.baseLandmarks[1].pixelCoordinates;

        return Object.keys(datas.locations).map((curLocationId, value) => {
            // Some boring arithmetic
            // Converts real latitude/longitude into pixel coordinates curX/curY
            const xRatio = (coordinateLandmark2.latitude - coordinateLandmark1.latitude) / (pixelCoordinateLandmark2.x - pixelCoordinateLandmark1.x);
            const x0 = (pixelCoordinateLandmark2.x * coordinateLandmark1.latitude - pixelCoordinateLandmark1.x * coordinateLandmark2.latitude) / (pixelCoordinateLandmark2.x - pixelCoordinateLandmark1.x);
            const curX = (datas.locations[curLocationId].coordinates.latitude - x0) / xRatio;
            
            const yRatio = (coordinateLandmark2.longitude - coordinateLandmark1.longitude) / (pixelCoordinateLandmark2.y - pixelCoordinateLandmark1.y);
            const y0 = (pixelCoordinateLandmark2.y * coordinateLandmark1.longitude - pixelCoordinateLandmark1.y * coordinateLandmark2.longitude) / (pixelCoordinateLandmark2.y - pixelCoordinateLandmark1.y);
            const curY = (datas.locations[curLocationId].coordinates.longitude - y0) / yRatio;

            return {
                location: makeLocationObject(curLocationId, datas),
                pixelCoordinates: {
                    x: curX,
                    y: curY,
                },
            };
        });
    });

    const landmarksProps$ = xs.combine(currentLocation$, currentLocationLinksIds$, pixelCoordinates$, datas$)
    .map(([currentLocation, currentLocationLinksIds, pixelCoordinates, datas]) => {
        return pixelCoordinates.map(pixelCoordinates => {
            const isCurrentLocation = pixelCoordinates.location.id === currentLocation.id;
            const isReachableLandmark = _.includes(currentLocationLinksIds, pixelCoordinates.location.id);

            return Object.assign({}, 
                pixelCoordinates,
                {
                    isCurrentLocation: isCurrentLocation,
                    isReachableLandmark: isReachableLandmark,
                }
            );
        });
    }).remember();
    
    const landmarks$ = landmarksProps$.map(landmarksProps =>
        landmarksProps.map((landmarkProps, key) =>
            isolate(Landmark, key)({DOM, datas$, props$: xs.of(landmarkProps)})
        )
    );

    const pathSink = Path({pixelCoordinates$, progression$, datas$, currentLocation$});

    return {landmarks$, pathSink};
}

function view(DOM, landmarks$, pathSink, currentLocation$, changeLocationDelayed$, progression$, datas$, action$, travelAnimationState$, landmarkTooltipSink){
    const landmarksVdom$ = landmarks$.map(landmarks => {
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
        action$.filter(action => action.type === "showMap"),
        changeLocationDelayed$,
    ).fold((acc, x) => acc ? false : true, false);

    const pathVdom$ = pathSink.DOM;

    const travelAnimationVdom$ = travelAnimationState$.map(([currentLocationPixelCoordinates, newLocationPixelCoordinates, animationState]) => {
        const x1 = currentLocationPixelCoordinates.x;
        const y1 = currentLocationPixelCoordinates.y;
        const x2 = currentLocationPixelCoordinates.x + (newLocationPixelCoordinates.x - currentLocationPixelCoordinates.x) * animationState;
        const y2 = currentLocationPixelCoordinates.y + (newLocationPixelCoordinates.y - currentLocationPixelCoordinates.y) * animationState;
        
        return svg.line({ attrs: {
            x1, y1, x2, y2, 
            style: 'stroke: rgb(200,0,0); stroke-width: 4; stroke-dasharray: 10, 10; stroke-linecap: round;'
        }})
    }).startWith("");

    const tooltipInfosVdom$ = landmarkTooltipSink.DOM;
    
    const vdom$ = xs.combine(landmarksVdom$, pathVdom$, currentLocation$, datas$, showMap$, travelAnimationVdom$, tooltipInfosVdom$)
    .map(([landmarksVdom, pathVdom, currentLocation, datas, showMap, travelAnimationVdom, tooltipInfosVdom]) =>
        <div>
            <button className="js-show-map button-3d" type="button" >Afficher la carte</button>
            {showMap ?
                <div className="map">
                    <div className="mapContainer">
                        {
                            svg(".svgMapTag", { attrs: { viewBox:"0 0 792 574", width: "100%", height: "100%", 'background-color': "green"}}, [
                                svg.image(".mapImageTag", { attrs: { width: "100%", height: "100%", 'xlink:href': datas.settings.images.map}}),
                                pathVdom,
                                travelAnimationVdom,
                                ...landmarksVdom,
                                svg.image(".js-show-map", { attrs: { width: "20px", height: "20px", x: "10px", y: "10px", 'xlink:href': datas.settings.images.closeMapIcon}}),
                            ])
                        }
                        {tooltipInfosVdom}
                    </div>
                </div>
                : ""
            }
        </div>
    );

    return vdom$;
}

export function Map(sources) {
    const {DOM, windowResize$, currentLocation$, currentLocationLinksIds$, progression$, datas$} = sources;
    const animationDuration = 3;

    const action$ = intent(DOM);
    const {landmarks$, pathSink} = model(DOM, currentLocation$, currentLocationLinksIds$, progression$, datas$);
    
    const landmarkTooltipSink = LandmarkTooltip({DOM, windowResize$, landmarks$, datas$});

    const changeLocation$ = landmarkTooltipSink.changeLocation$;
    
    const changeLocationDelayed$ = changeLocation$.compose(delay(animationDuration * 1000));
    
    const getLandmarkById = function(location$){
        return xs.combine(location$, landmarks$).map(([location, landmarks]) => {
            const identifiedLandmarks = landmarks.map(landmark => 
                landmark.id$.map(id =>
                    {return {id, landmark}}
                )
            );
            
            return xs.combine(...identifiedLandmarks).map(identifiedLandmarksCombined =>
                identifiedLandmarksCombined.filter(identifiedLandmark => 
                    identifiedLandmark.id === location.id
                )[0].landmark
            );
        }).flatten();
    }

    const currentLandmark$ = getLandmarkById(currentLocation$);
    const newLandmark$ = getLandmarkById(changeLocation$);
    
    const travelAnimationState$ = xs.combine(
        currentLandmark$.map(currentLandmark => currentLandmark.pixelCoordinates$).flatten(),
        newLandmark$.map(newLandmark => newLandmark.pixelCoordinates$).flatten(),
        changeLocation$.mapTo(tween({
            from: 0,
            to: 1,
            ease: tween.power3.easeInOut,
            duration: animationDuration * 1000, // milliseconds
        })).flatten(),
    );

    const vdom$ = view(DOM, landmarks$, pathSink, currentLocation$, changeLocationDelayed$, progression$, datas$, action$, travelAnimationState$, landmarkTooltipSink);

    const sinks = {
        DOM: vdom$,
        changeLocation$: changeLocationDelayed$,
    };

    return sinks;
}