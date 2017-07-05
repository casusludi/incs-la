import xs from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats'
import pairwise from 'xstream/extra/pairwise'
import debounce from 'xstream/extra/debounce'
import sampleCombine from 'xstream/extra/sampleCombine'

import { run } from '@cycle/run';

import { html } from 'snabbdom-jsx';

function intent(DOM){
    return xs.merge(
        xs.merge(
            DOM.select('.js-hide-infos').events('click'),
            DOM.select('.map').events('click').filter(e => e.target.className.baseVal === "mapImageTag")
        ).map(value => ({type: "hideInfos"})),
        DOM.select('.js-travel-to').events('click').map(value => ({type: "travelTo"})),
    );
}

function model(locationsWithPixelCoordinates$, progression$, datas$, currentLocation$){
    return xs.of(null);
}

function view(DOM, windowResize$, showInfos$, datas$){
    const svgTag$ = DOM.select(".svgMapTag").elements();
    const svgTagDimension$ = svgTag$
    .filter(svgTag => svgTag.length > 0)
    .map(svgTag => ({
            width: svgTag[0].clientWidth, 
            height: svgTag[0].clientHeight,
        })
    ).compose(dropRepeats((a, b) => a.width === b.width && a.height === b.height))
    .startWith(null);

    const mapImageTag$ = DOM.select(".mapImageTag").elements();
    const mapImageDimension$ = mapImageTag$
    .filter(mapImageTag => mapImageTag.length > 0)
    .map(mapImageTag => ({
            width: mapImageTag[0].getBoundingClientRect().width, 
            height: mapImageTag[0].getBoundingClientRect().height,
        })
    ).compose(dropRepeats((a, b) => a.width === b.width && a.height === b.height))
    .startWith(null);

    const toolTipContainerTag$ = DOM.select(".locationInfo").elements();
    const toolTipContainerDimension$ = toolTipContainerTag$.filter(toolTipContainerTag =>
    toolTipContainerTag.length > 0).map(toolTipContainerTag => ({
            width: toolTipContainerTag[0].clientWidth,
            height: toolTipContainerTag[0].clientHeight
        })
    ).compose(dropRepeats((a, b) => a.width === b.width && a.height <= b.height + 1 && a.height >= b.height - 1))
    .startWith(null);

    const vdom$ = xs.combine(windowResize$, showInfos$, datas$, svgTagDimension$, mapImageDimension$, toolTipContainerDimension$)
    .map(([windowResize, showInfos, datas, svgTagDimension, mapImageDimension, toolTipContainerDimension]) => {
        if(showInfos) {
            var xPos, yPos;
            
            const ratio = mapImageDimension.width / datas.settings.mapImageDimension.width;
            const widthMargin = (svgTagDimension.width - mapImageDimension.width) / 2;
            const heightMargin = (svgTagDimension.height - mapImageDimension.height) / 2;
            
            xPos = showInfos.pixelCoordinates.x * ratio + widthMargin;
            yPos = showInfos.pixelCoordinates.y * ratio + heightMargin;

            if(toolTipContainerDimension){
                if(xPos + toolTipContainerDimension.width > mapImageDimension.width)
                    xPos -= toolTipContainerDimension.width;
                if(yPos + toolTipContainerDimension.height > mapImageDimension.height)
                    yPos -= toolTipContainerDimension.height;
            }

            return (
                <div className="locationInfo scrollable-panel panel" style={{
                    left: xPos+"px",
                    top: yPos+"px",
                    width: "200px",
                    'max-height': 'none',
                }}>
                    <div className="headerToolTip">  
                        <img className="js-hide-infos"
                        src={datas.settings.images.closeMapIcon} style={{
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

    return vdom$;
}

export function LandmarkTooltip(sources) {
    const {DOM, windowResize$, landmarks$, datas$} = sources;

    const action$ = intent(DOM);

    const landmarksTooltipInfos$ = landmarks$.map(landmarks =>
        xs.merge(...landmarks.map(landmark => landmark.tooltipInfos$))
    ).flatten();
    
    const changeLocation$ = landmarksTooltipInfos$.map(landmarksTooltipInfos =>
        action$.filter(action => action.type === "travelTo")
        .mapTo(landmarksTooltipInfos.location)
    ).flatten();

    const tooltipInfos$ = xs.merge(
        landmarksTooltipInfos$,
        xs.merge(
            action$.filter(action => action.type === "hideInfos"),
            changeLocation$,
        ).mapTo(null),
    );

    // const value$ = model(locationsWithPixelCoordinates$, progression$, datas$, currentLocation$);
    const vdom$ = view(DOM, windowResize$, tooltipInfos$, datas$);

    const sinks = {
        DOM: vdom$,
        changeLocation$,
    };

    return sinks;
}