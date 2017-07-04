import xs from 'xstream';
import { run } from '@cycle/run';
import { div, svg, p } from '@cycle/dom';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

function intent(DOM){
    const action$ = xs.merge(
        DOM.select('.js-show-info').events('click').mapTo({type: "showInfos"}),
    );

    return action$;
}

function model(props$, action$){
    return props$.map(props => 
        action$.filter(action => 
            action.type === "showInfos"
        ).map(action => 
            props
        )
    ).flatten();
}

function view(props$, datas$){
    return props$.map(props => {
        return svg.g({ attrs: { transform: "translate(" + props.pixelCoordinates.x + " " + props.pixelCoordinates.y + ")" } }, [
            svg.image({ attrs: {
                'xlink:href': 
                    props.isCurrentLocation ? 
                        props.settings.images.currentLocationLandmark : 
                        (props.isReachableLandmark ? 
                            props.settings.images.reachableLandmark : 
                            props.settings.images.unreachableLandmark),
                class: "js-show-info",
                height: props.isCurrentLocation ? 
                    props.settings.landmarksImageHeight + "px" :
                    props.settings.landmarksImageHeight + "px",
                y: - props.settings.landmarksImageHeight + "px",
            }}),
        ])
    });
}

export function Landmark(sources) {
    const {props$, datas$, DOM} = sources;
    const p$ = props$.remember()
    const action$ = intent(DOM);
    const value$ = model(p$, action$);
    const vdom$ = view(p$, datas$);

    const sinks = {
        DOM: vdom$,
        tooltipInfos$: value$,
        pixelCoordinates$: p$.map(props => props.pixelCoordinates),
        id$: props$.map(props => props.location.id),
    };

    return sinks;
}