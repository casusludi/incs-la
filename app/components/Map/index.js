import xs from 'xstream';
import tween from 'xstream/extra/tween'
import delay from 'xstream/extra/delay'
import concat from 'xstream/extra/concat'
import dropRepeats from 'xstream/extra/dropRepeats'

import { svg } from '@cycle/dom';
import isolate from '@cycle/isolate';

import { html } from 'snabbdom-jsx';

import {Landmark} from '../Landmark';
import {LandmarkTooltip} from '../LandmarkTooltip';
import {Path} from '../Path';

import {makeLocationObject} from '../../utils';
import { mixMerge, mixCombine } from '../../utils';

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

function model(DOM, action$, currentLocation$, currentLocationLinksIds$, progression$, path$, windowResize$, datas$){
    const pixelCoordinates$ = datas$.map(datas => {
        const baseLandmarkIds = datas.settings.baseLandmarks.map(baseLandmark => baseLandmark.location);
        const coordinateLandmark = baseLandmarkIds.map(baseLandmarkId => datas.locations[baseLandmarkId].coordinates);
        const pixelCoordinateLandmark = datas.settings.baseLandmarks.map(baseLandmark => baseLandmark.pixelCoordinates);

        return Object.keys(datas.locations).map((curLocationId, value) => {
            // Some boring arithmetic
            // Converts real latitude/longitude into pixel coordinates curX/curY
            const xRatio = (coordinateLandmark[1].latitude - coordinateLandmark[0].latitude) / (pixelCoordinateLandmark[1].x - pixelCoordinateLandmark[0].x);
            const x0 = (pixelCoordinateLandmark[1].x * coordinateLandmark[0].latitude - pixelCoordinateLandmark[0].x * coordinateLandmark[1].latitude) / (pixelCoordinateLandmark[1].x - pixelCoordinateLandmark[0].x);
            const curX = (datas.locations[curLocationId].coordinates.latitude - x0) / xRatio;
            
            const yRatio = (coordinateLandmark[1].longitude - coordinateLandmark[0].longitude) / (pixelCoordinateLandmark[1].y - pixelCoordinateLandmark[0].y);
            const y0 = (pixelCoordinateLandmark[1].y * coordinateLandmark[0].longitude - pixelCoordinateLandmark[0].y * coordinateLandmark[1].longitude) / (pixelCoordinateLandmark[1].y - pixelCoordinateLandmark[0].y);
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

    const landmarksProps$ = xs.combine(currentLocation$, currentLocationLinksIds$, pixelCoordinates$)
    .map(([currentLocation, currentLocationLinksIds, pixelCoordinates]) => {
        return pixelCoordinates.map(currentPixelCoordinates => {
            const isCurrentLocation = currentPixelCoordinates.location.id === currentLocation.id;
            const isReachableLandmark = _.includes(currentLocationLinksIds, currentPixelCoordinates.location.id);

            return Object.assign({}, 
                currentPixelCoordinates,
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

    const latitudeSortedLandmarks$ = landmarks$.map(landmarks => {
        const latitudeIdentifiedLandmarks = landmarks.map(landmark =>
            landmark.pixelCoordinates$.map(pixelCoordinates =>
                 ({landmark, latitude: pixelCoordinates.y})
            )
        );

        return xs.combine(...latitudeIdentifiedLandmarks).map(latitudeIdentifiedLandmarksArray => 
            _.sortBy(latitudeIdentifiedLandmarksArray, 'latitude').map(latitudeIdentifiedLandmark => latitudeIdentifiedLandmark.landmark)
        );
    }).flatten().remember();

    const pathSink = Path({pixelCoordinates$, progression$, path$, currentLocation$});

    const changeLocationDelayedProxy$ = xs.create();

    const showMap$ = xs.merge(
        action$.filter(action => action.type === "showMap").mapTo(true),
        changeLocationDelayedProxy$.mapTo(false),
    ).fold((acc, x) => x & !acc, false);
    
    const landmarkTooltipSink = LandmarkTooltip({DOM, windowResize$, landmarks$, datas$, showMap$});

    const changeLocation$ = landmarkTooltipSink.changeLocation$;

    const animationDuration = 1.5;
    const changeLocationDelayed$ = changeLocation$.compose(delay(animationDuration * 1000));

    changeLocationDelayedProxy$.imitate(changeLocationDelayed$);
    
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

    const currentLocationLandmark$ = getLandmarkById(currentLocation$);
    const newLocationLandmark$ = getLandmarkById(changeLocation$);
    
    const travelAnimationDatas$ = xs.combine(
        currentLocationLandmark$.map(currentLocationLandmark => currentLocationLandmark.pixelCoordinates$).flatten(),
        newLocationLandmark$.map(newLocationLandmark => newLocationLandmark.pixelCoordinates$).flatten(),
        changeLocation$.mapTo(
            concat(
                tween({
                    from: 0,
                    to: 1,
                    ease: tween.power3.easeInOut,
                    duration: animationDuration * 1000, // milliseconds
                }),
                xs.of(0),
            )
        ).flatten(),
    );
        
    const travelAnimationState$ = travelAnimationDatas$.map(([currentLocationPixelCoordinates, newLocationPixelCoordinates, animationState]) => {
        const x1 = currentLocationPixelCoordinates.x;
        const y1 = currentLocationPixelCoordinates.y;
        const x2 = currentLocationPixelCoordinates.x + (newLocationPixelCoordinates.x - currentLocationPixelCoordinates.x) * animationState;
        const y2 = currentLocationPixelCoordinates.y + (newLocationPixelCoordinates.y - currentLocationPixelCoordinates.y) * animationState;
        return {x1, y1, x2, y2};
    });

    return {showMap$, landmarks$: latitudeSortedLandmarks$, landmarkTooltipSink, travelAnimationState$, pathSink, changeLocationDelayed$};
}

function view(showMap$, landmarks$, landmarkTooltipSink, travelAnimationState$, pathSink, datas$){
    const landmarksVdom$ = landmarks$.compose(mixCombine('DOM'));
    const tooltipInfosVdom$ = landmarkTooltipSink.DOM;
    const pathVdom$ = pathSink.DOM;
    const travelAnimationVdom$ = travelAnimationState$.map(({x1, y1, x2, y2}) => {
        return svg.line({ attrs: {
            x1, y1, x2, y2, 
            style: 'stroke: rgb(200,0,0); stroke-width: 4; stroke-dasharray: 10, 10; stroke-linecap: round;'
        }})
    }).startWith("");
    
    const vdom$ = xs.combine(landmarksVdom$, pathVdom$, datas$, showMap$, travelAnimationVdom$, tooltipInfosVdom$)
    .map(([landmarksVdom, pathVdom, datas, showMap, travelAnimationVdom, tooltipInfosVdom]) =>
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
    const {DOM, windowResize$, currentLocation$, currentLocationLinksIds$, progression$, path$, datas$} = sources;
    
    const action$ = intent(DOM);
    const {showMap$, landmarks$, landmarkTooltipSink, travelAnimationState$, pathSink, changeLocationDelayed$} = model(DOM, action$, currentLocation$, currentLocationLinksIds$, progression$, path$, windowResize$, datas$);
    const vdom$ = view(showMap$, landmarks$, landmarkTooltipSink, travelAnimationState$, pathSink, datas$);

    const sinks = {
        DOM: vdom$,
        changeLocation$: changeLocationDelayed$,
    };

    return sinks;
}