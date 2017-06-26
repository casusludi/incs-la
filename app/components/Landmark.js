import xs from 'xstream';
import { run } from '@cycle/run';
import { div, svg, p } from '@cycle/dom';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

function intent(DOM){
    const action$ = xs.merge(
        DOM.select('.js-change-location').events('click').mapTo({type: "changeLocation"}),
        DOM.select('.js-show-info').events('click').mapTo({type: "showInfos"}),
    );

    return action$;
}

function model(props$, action$){
    return action$.filter(action => action.type === "changeLocation").map(action => props$.map(props => props.location)).flatten();
}

function view(props$, action$){
    const showInfos$ = action$.filter(action => action.type === "showInfos").fold((acc, x) => acc ? false : true, false);

    return xs.combine(props$, showInfos$).map(([props, showInfos]) => {
        return /*p([*/svg.g({ attrs: { transform: "translate(" + props.pixelCoordinates.x + " " + props.pixelCoordinates.y + ")" } }, [
            svg.image({ attrs: {
                'xlink:href': 
                    props.isCurrentLocation ? 
                        props.settings.images.currentLocationLandmark : 
                        (props.isReachableLandmark ? 
                            props.settings.images.reachableLandmark : 
                            props.settings.images.unreachableLandmark),
                class: "js-show-info"
            }}),
            (showInfos ? 
                svg.g({ attrs: { transform: "translate(0 -15)" } }, [
                    svg.text(props.location.name),
                    
                    props.isReachableLandmark ?
                        svg.text({ attrs: { x: "0",  y: "15", class: "js-change-location" }}, "Move to") :
                        "",
                ]) :
                ""
            ),
        ])//], props.location.name)
    });
}

function _Landmark(sources) {
    const {props$, DOM} = sources;
    const action$ = intent(DOM);
    const value$ = model(props$, action$);
    const vdom$ = view(props$, action$);

    const sinks = {
        DOM: vdom$,
        changeLocation$: value$,
        pixelCoordinates$: props$.map(props => props.pixelCoordinates),
        id$: props$.map(props => props.location.id)
    };

    return sinks;
}

export function Landmark(sources){ return isolate(_Landmark)(sources) };