import xs from 'xstream';
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

function view(value$){
    const vdom$ = <p>COUCOU</p>;

    return vdom$;
}

export function LandmarkTooltip(sources) {
    const {DOM, landmarks$} = sources;

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
    // const vdom$ = view(value$);

    const sinks = {
        // DOM: vdom$,
        changeLocation$,
        showInfos$,
    };

    return sinks;
}