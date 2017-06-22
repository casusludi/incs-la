import xs from 'xstream';
import { run } from '@cycle/run';
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

    return xs.combine(props$, showInfos$).map(([props, showInfos]) =>
        <div>
            <img 
                // class-js-change-location={props.isReachableLandmark}
                className="js-show-info"
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
            {showInfos ?
                <div
                    style={ ({
                        position: 'absolute',  
                        left: props.pixelCoordinates.x + "px",
                        top: props.pixelCoordinates.y + 30 + "px",
                        backgroundColor: "white",
                    }) }
                >
                    {props.location.name}

                    {props.isReachableLandmark ?
                        <button selector=".js-change-location" type="button" >Move to</button> :
                        ""
                    }
                </div> :
                ""
            }
        </div>
    );
}

function _Landmark(sources) {
    const {props$, DOM} = sources;
    const action$ = intent(DOM);
    const value$ = model(props$, action$);
    const vdom$ = view(props$, action$);

    const sinks = {
        DOM: vdom$,
        changeLocation$: value$,
    };

    return sinks;
}

export function Landmark(sources){ return isolate(_Landmark)(sources) };