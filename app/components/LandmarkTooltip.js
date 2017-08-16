import xs from 'xstream';

import { html } from 'snabbdom-jsx';

import { getHtmlElementDimensions, getSvgElementDimensions } from '../utils';
import { mixMerge, mixCombine } from '../utils';

function intent(DOM){
    return xs.merge(
        xs.merge(
            DOM.select('.js-hide-infos').events('click'),
            DOM.select('.map').events('click').filter(e => e.target.className.baseVal === "mapImageTag")
        ).map(value => ({type: "hideInfos"})),
        DOM.select('.js-travel-to').events('click').map(value => ({type: "travelTo"})),
    );
}

function model(action$, DOM, landmarks$, showMap$, datas$){
    const landmarksTooltipInfos$ = landmarks$.compose(mixMerge('tooltipInfos$'));

    const changeLocation$ = landmarksTooltipInfos$.map(landmarksTooltipInfos =>
        action$.filter(action => action.type === "travelTo")
        .mapTo(landmarksTooltipInfos.location)
    ).flatten();

    const tooltipInfos$ = xs.merge(
        landmarksTooltipInfos$,
        xs.merge(
            action$.filter(action => action.type === "hideInfos"),
            changeLocation$,
            showMap$//.filter(showMap => showMap),
        ).mapTo(null),
    );

    const svgTagDimension$ = getHtmlElementDimensions(DOM, ".svgMapTag").startWith(null);
    const mapImageDimension$ = getSvgElementDimensions(DOM, ".mapImageTag").startWith(null);
    const toolTipContainerDimension$ = getHtmlElementDimensions(DOM, ".locationInfo", 1).startWith(null);

    const tooltipPosition$ = xs.combine(tooltipInfos$, datas$, svgTagDimension$, mapImageDimension$, toolTipContainerDimension$)
    .filter(([tooltipInfos, datas, svgTagDimension, mapImageDimension, toolTipContainerDimension]) => tooltipInfos)
    .map(([tooltipInfos, datas, svgTagDimension, mapImageDimension, toolTipContainerDimension]) => {
        var xPos, yPos;
        const ratio = mapImageDimension.width / datas.settings.mapImageDimension.width;
        const widthMargin = (svgTagDimension.width - mapImageDimension.width) / 2;
        const heightMargin = (svgTagDimension.height - mapImageDimension.height) / 2;
        
        xPos = tooltipInfos.pixelCoordinates.x * ratio + widthMargin;
        yPos = tooltipInfos.pixelCoordinates.y * ratio + heightMargin;

        if(toolTipContainerDimension){
            if(xPos + toolTipContainerDimension.width > mapImageDimension.width)
                xPos -= toolTipContainerDimension.width;
            if(yPos + toolTipContainerDimension.height > mapImageDimension.height)
                yPos -= toolTipContainerDimension.height;
        }

        return {x: xPos, y: yPos};
    });

    return {changeLocation$, tooltipInfos$, tooltipPosition$};
}

function view(DOM, windowResize$, tooltipInfos$, tooltipPosition$, datas$){
    const vdom$ = xs.combine(windowResize$, tooltipInfos$, datas$, tooltipPosition$)
    .map(([windowResize, tooltipInfos, datas, tooltipPosition]) =>
        tooltipInfos ?
            <div className="locationInfo scrollable-panel panel" style={{
                left: tooltipPosition.x+"px",
                top: tooltipPosition.y+"px",
                width: "200px",
                'max-height': 'none',
            }}>
                <div className="headerToolTip">  
                    <img className="js-hide-infos"
                    src={datas.settings.images.closeMapIcon} 
                    style={{
                        width: "20px", 
                        background: "rgb(200, 200, 200)", 
                        padding: "3px",
                    }} />
                    {tooltipInfos.isReachableLandmark ? <button className="js-travel-to button-3d" type="button">S'y rendre</button> : ""}
                </div>
                <h3>{tooltipInfos.location.name}</h3>
                <p>{tooltipInfos.location.desc}</p>
            </div> : ""
    ).startWith("");

    return vdom$;
}

export function LandmarkTooltip(sources) {
    const {DOM, windowResize$, landmarks$, datas$, showMap$} = sources;

    const action$ = intent(DOM);
    const {changeLocation$, tooltipInfos$, tooltipPosition$} = model(action$, DOM, landmarks$, showMap$, datas$);
    const vdom$ = view(DOM, windowResize$, tooltipInfos$, tooltipPosition$, datas$);

    const sinks = {
        DOM: vdom$,
        changeLocation$,
    };

    return sinks;
}