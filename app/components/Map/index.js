import xs from 'xstream';
import tween from 'xstream/extra/tween'
import delay from 'xstream/extra/delay'
import dropRepeats from 'xstream/extra/dropRepeats'
import concat from 'xstream/extra/concat'

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
        locationsWithPixelCoordinates.map((locationWithPixelCoordinates, key) =>
            isolate(Landmark, key)({DOM, props$: xs.of(locationWithPixelCoordinates)})
        )
    );

    const pathSink = Path({locationsWithPixelCoordinates$, progression$, path$, currentLocation$});

    return {landmarks$, pathSink};
}

function view(DOM, value, currentLocation$, settings$, locations$, currentLinksValues$, progression$, path$, action$, travelAnimationState$, showInfos$){
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

    const travelAnimationVdom$ = travelAnimationState$.map(([currentLocationPixelCoordinates, newLocationPixelCoordinates, animationValue]) =>
        svg.line({ attrs: {
            x1: currentLocationPixelCoordinates.x,
            y1: currentLocationPixelCoordinates.y,
            x2: currentLocationPixelCoordinates.x + (newLocationPixelCoordinates.x - currentLocationPixelCoordinates.x) * animationValue,
            y2: currentLocationPixelCoordinates.y + (newLocationPixelCoordinates.y - currentLocationPixelCoordinates.y) * animationValue,
            style: 'stroke: rgb(200,0,0); stroke-width: 4; stroke-dasharray: 10, 10; stroke-linecap: round;'}})
    ).startWith("");

    const svgTag$ = DOM.select(".svgMapTag").elements();
    const svgTagDimension$ = svgTag$
    .filter(svgTag => svgTag.length > 0)
    .map(svgTag => ({
            width: svgTag[0].clientWidth, 
            height: svgTag[0].clientHeight,
        })
    ).compose(dropRepeats((x, y) => x.width === y.width && x.height === y.height))
    .startWith(null);

    const mapImageTag$ = DOM.select(".mapImageTag").elements();
    const mapImageDimension$ = mapImageTag$
    .filter(mapImageTag => mapImageTag.length > 0)
    .map(mapImageTag => ({
            width: mapImageTag[0].getBoundingClientRect().width, 
            height: mapImageTag[0].getBoundingClientRect().height,
        })
    ).compose(dropRepeats((x, y) => x.width === y.width && x.height === y.height))
    .startWith(null);

    const toolTipContainerTag$ = DOM.select(".locationInfo").elements();
    const toolTipContainerDimension$ = toolTipContainerTag$.filter(toolTipContainerTag =>
    toolTipContainerTag.length > 0).map(toolTipContainerTag => ({
            width: toolTipContainerTag[0].clientWidth,
            height: toolTipContainerTag[0].clientHeight
        })
    ).compose(dropRepeats((x, y) => x.width === y.width && x.height === y.height))
    .startWith(null);

    const showInfosVdom$ = xs.combine(showInfos$, settings$, svgTagDimension$, mapImageDimension$, toolTipContainerDimension$)
    .map(([showInfos, settings, svgTagDimension, mapImageDimension, toolTipContainerDimension]) => {
        if(showInfos) {
            var xPos, yPos;
            
            const margin = 4;
            const ratio = mapImageDimension.width / settings.mapImageDimension.width;
            const widthMargin = (svgTagDimension.width - mapImageDimension.width) / 2;
            const heightMargin = (svgTagDimension.height - mapImageDimension.height) / 2;
            
            xPos = showInfos.pixelCoordinates.x * ratio + widthMargin;
            yPos = showInfos.pixelCoordinates.y * ratio + heightMargin;

            if(toolTipContainerDimension){
                if(xPos + toolTipContainerDimension.width > mapImageDimension.width)
                    xPos -= toolTipContainerDimension.width + margin;
                if(yPos + toolTipContainerDimension.height > mapImageDimension.height)
                    yPos -= toolTipContainerDimension.height + margin;
            }

            return (
                <div className="locationInfo scrollable-panel panel" style={{
                    left: xPos+"px",
                    top: yPos+"px",
                    width: "200px"
                }}>
                    <div className="headerToolTip">  
                        <img className="js-hide-infos"
                        src={settings.images.closeMapIcon} style={{
                            width: "20px", 
                            background: "rgb(200, 200, 200)", 
                            padding: "3px",}} />
                        {showInfos.isReachableLandmark ? <button className="js-travel-to button-3d" type="button">S'y rendre</button> : ""}
                    </div>
                    <h3>{showInfos.location.name}</h3>
                    <p>{showInfos.location.desc}</p>
                </div>
            );
        }
        else
            return "";
    }).startWith("");
    
    const vdom$ = xs.combine(landmarksVdom$, pathVdom$, currentLocation$, settings$, locations$, currentLinksValues$, showMap$, travelAnimationVdom$, showInfosVdom$)
    .map(([landmarksVdom, pathVdom, currentLocation, settings, locations, currentLinksValues, showMap, travelAnimationVdom, showInfosVdom]) =>
        <div>
            <button className="js-show-map button-3d" type="button" >Afficher la carte</button>
            {showMap ?
                <div className="map">
                    <div className="mapContainer">
                        {
                            svg(".svgMapTag", { attrs: { viewBox:"0 0 792 574", width: "100%", height: "100%", 'background-color': "green"}}, [
                                svg.image(".mapImageTag", { attrs: { width: "100%", height: "100%", 'xlink:href': settings.images.map}}),
                                pathVdom,
                                travelAnimationVdom,
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

export function Map(sources) {
    const {DOM, progression$, path$, currentLocation$, settings$, locations$, currentLinksValues$} = sources;
    const action$ = intent(DOM);
    const value = model(DOM, progression$, path$, currentLocation$, settings$, locations$, currentLinksValues$);
    
    const landmarksShowInfos$ = value.landmarks$.map(landmarks =>
        xs.merge(...landmarks.map(landmark => landmark.showInfos$))
    ).flatten()
    
    const changeLocation$ = landmarksShowInfos$.map(showInfos =>
        action$.filter(action => action.type === "travelTo")
        .mapTo(showInfos.location)
    ).flatten().debug("changeLocation");

    const showInfos$ = xs.merge(
        landmarksShowInfos$,
        xs.merge(
            action$.filter(action => action.type === "hideInfos"),
            changeLocation$,
        ).mapTo(null),
    );
    
    const getLandmark = function(location$){
        return xs.combine(location$, value.landmarks$).map(([location, landmarks]) => {
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
        }).flatten()//.debug("etape1");
    }

    const currentLandmark$ = getLandmark(currentLocation$)//.debug("currentLandmark");

    const newLandmark$ = getLandmark(changeLocation$)//.debug("newLandmark");
    
    const animationDuration = 2;
    const travelAnimationState$ = xs.combine(
        currentLandmark$.map(currentLandmark => currentLandmark.pixelCoordinates$).flatten(),//.debug("currentLandmark"),
        newLandmark$.map(newLandmark => newLandmark.pixelCoordinates$).flatten(),//.debug("newLandmark"),
        concat(
            changeLocation$.mapTo(tween({
                from: 0,
                to: 1,
                ease: tween.power2.easeInOut,
                duration: animationDuration * 1000, // milliseconds
            })).flatten(),
            xs.of(0),
        )//.debug("pouet")
    )//.debug("travelAnimationState");

    const vdom$ = view(DOM, value, currentLocation$, settings$, locations$, currentLinksValues$, progression$, path$, action$, travelAnimationState$, showInfos$);

    const sinks = {
        DOM: vdom$,
        changeLocation$: changeLocation$.compose(delay(animationDuration * 1000)),
    };

    return sinks;
}