import xs from 'xstream';
import { svg } from '@cycle/dom';
import { mixMerge, mixCombine } from '../../utils';
import { html } from 'snabbdom-jsx';
import {MapViewer} from '../MapViewer';
import isolate from '@cycle/isolate';

export function view(DOM,windowResize$,showMap$, landmarks$, landmarkTooltipSink, travelAnimationState$, pathSink, datas$) {
    // On récupère les VDom des différents composants
    const landmarksVdom$ = landmarks$.compose(mixCombine('DOM'));
    const tooltipInfosVdom$ = landmarkTooltipSink.DOM;
    const pathVdom$ = pathSink.DOM;
    // L'animation pourrait être dans son propre composant
    const travelAnimationVdom$ = travelAnimationState$.map(({ x1, y1, x2, y2 }) => {
        return svg.line({
            attrs: {
                x1, y1, x2, y2,
                style: 'stroke: rgb(200,0,0); stroke-width: 4; stroke-dasharray: 10, 10; stroke-linecap: round;'
            }
        })
    }).startWith("");

    const mapViewer = MapViewer({
        DOM,
        windowResize$,
        content$: xs.combine(landmarksVdom$, pathVdom$, datas$, travelAnimationVdom$, tooltipInfosVdom$)
        .map(([landmarksVdom, pathVdom, datas, travelAnimationVdom, tooltipInfosVdom]) =>

                <div className="travel-map">
                        {
                            svg(".svgMapTag", {
                                attrs: {
                                    viewBox: "0 0 " + datas.settings.mapImageDimension.width + " " + datas.settings.mapImageDimension.height,
                                    width: datas.settings.mapImageDimension.width+"px",
                                    height: datas.settings.mapImageDimension.height+"px",
                                    'background-color': "green"
                                }
                            }, [
                                    svg.image(".mapImageTag", { attrs: { width: "100%", height: "100%", 'xlink:href': datas.settings.images.map } }),
                                    // Le path n'est pas affiché à voir si vous conservez cette fonctionnalité. Elle n'est pas sauvegardée dans le stockage local, quand la page est rechargée il n'apparait donc pas.
                                    // pathVdom,
                                    travelAnimationVdom,
                                    ...landmarksVdom
                                ])
                        }
                        
                </div>
        )
    });

    const vdom$ = xs.combine(
        mapViewer.DOM, 
        showMap$,
        tooltipInfosVdom$
    )
        .map(([
            mapViewerDOM, 
            showMap,
            tooltipInfosVdom
        ]) =>
            <div className={"travel-panel" + (showMap ? " expanded" : "")}>
                <button className="travel-panel-button-open glue-button glue-button-right js-show-map" type="button" ><i className="svg-icon icon-map" /></button>
                <div className="travel-panel-content">
                <button className="travel-panel-button-close glue-button glue-button-left js-show-map" type="button" ><i className="svg-icon icon-close" /></button>
                {mapViewerDOM}
                {tooltipInfosVdom}
                </div>
            </div>
        );

    return vdom$;
}