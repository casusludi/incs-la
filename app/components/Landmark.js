import xs from 'xstream';

import { svg } from '@cycle/dom';

import { html } from 'snabbdom-jsx';

function intent(DOM){
    const action$ = xs.merge(
        DOM.select('.js-show-info').events('click').mapTo({type: "showInfos"}),
    );

    return action$;
}

function model(props$, action$){
    return props$.map(props => 
        action$.filter(action => action.type === "showInfos")
        .map(action => props)
    ).flatten();
}

function view(props$, datas$){
    return xs.combine(datas$, props$).map(([datas, props]) => {
        return svg.g({ attrs: { transform: "translate(" + props.pixelCoordinates.x + " " + props.pixelCoordinates.y + ")" } }, [
            svg.image({ attrs: {
                'xlink:href': 
                    props.isCurrentLocation ? 
                        datas.settings.images.currentLocationLandmark : 
                        (props.isReachableLandmark ? 
                            datas.settings.images.reachableLandmark : 
                            datas.settings.images.unreachableLandmark),
                class: "js-show-info",
                height: datas.settings.landmarksImageHeight + "px",
                y: - datas.settings.landmarksImageHeight + "px",
            }}),
        ])
    });
}

export function Landmark(sources) {
    const {props$, datas$, DOM} = sources;
    const remProps$ = props$.remember()
    const action$ = intent(DOM);
    const state$ = model(remProps$, action$);
    const vdom$ = view(remProps$, datas$);

    const sinks = {
        DOM: vdom$,
        tooltipInfos$: state$,
        pixelCoordinates$: remProps$.map(props => props.pixelCoordinates),
        id$: remProps$.map(props => props.location.id),
    };

    return sinks;
}