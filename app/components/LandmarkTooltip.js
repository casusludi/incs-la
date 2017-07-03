import xs from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats'
import { run } from '@cycle/run';
import { html } from 'snabbdom-jsx';

function intent(DOM){
    return xs.merge(
        DOM.select('.js-hide-infos').events('click').map(value => ({type: "hideInfos"})),
        DOM.select('.js-travel-to').events('click').map(value => ({type: "travelTo"})),
    );
}

function model(locationsWithPixelCoordinates$, progression$, datas$, currentLocation$){
    return xs.of(null);
}

function view(DOM, showInfos$, datas$){
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

    const vdom$ = xs.combine(showInfos$, datas$, svgTagDimension$, mapImageDimension$, toolTipContainerDimension$)
    .map(([showInfos, datas, svgTagDimension, mapImageDimension, toolTipContainerDimension]) => {
        if(showInfos) {
            var xPos, yPos;
            
            const margin = 4;
            const ratio = mapImageDimension.width / datas.settings.mapImageDimension.width;
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
    const {DOM, landmarks$, datas$} = sources;

    const action$ = intent(DOM);

    const landmarksShowInfos$ = landmarks$.map(landmarks =>
        xs.merge(...landmarks.map(landmark => landmark.showInfos$))
    ).flatten();
    
    const changeLocation$ = landmarksShowInfos$.map(showInfos =>
        action$.filter(action => action.type === "travelTo")
        .mapTo(showInfos.location)
    ).flatten();

    const showInfos$ = xs.merge(
        landmarksShowInfos$,
        xs.merge(
            action$.filter(action => action.type === "hideInfos"),
            changeLocation$,
        ).mapTo(null),
    );

    // const value$ = model(locationsWithPixelCoordinates$, progression$, datas$, currentLocation$);
    const vdom$ = view(DOM, showInfos$, datas$);

    const sinks = {
        DOM: vdom$,
        changeLocation$,
        showInfos$,
    };

    return sinks;
}