import xs from 'xstream';
import { run } from '@cycle/run';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

function intent(DOM){

    const click$ = DOM
        .select('.js-change-location')
        .events('click')
        .mapTo(true);

    return click$;
}

function model(props$, action$){
    return action$.map(action => props$.map(props => props.location)).flatten();
}

function view(props$){
    return props$.map(props =>
        <img 
            class-js-change-location={props.isReachableLandmark}
            src={props.isCurrentLocation ? 
                    props.settings.images.currentLocationLandmark : 
                    (props.isReachableLandmark ? 
                        props.settings.images.reachableLandmark : 
                        props.settings.images.unreachableLandmark)}
            style={ ({
                position: 'absolute',  
                left: props.pixelCoordinates.x + "px",
                top: props.pixelCoordinates.y + "px",
            }) }
        />
    );
}

function _Landmark(sources) {
    const {props$, DOM} = sources;
    const action$ = intent(DOM);
    const value$ = model(props$, action$);
    const vdom$ = view(props$);

    const sinks = {
        DOM: vdom$,
        changeLocation$: value$,
    };

    return sinks;
}

export function Landmark(sources){ return isolate(_Landmark)(sources) };