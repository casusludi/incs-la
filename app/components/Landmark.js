import xs from 'xstream';

import { svg } from '@cycle/dom';

import { html } from 'snabbdom-jsx';

/*
Icône "repère" affiché sur la carte pour chaque lieu. Le joueur peut cliquer dessus pour afficher des informations complémentaires sur le lieu (voir composant LandmarkTooltip)
*/

function dist(aX, aY, bX, bY) {
    const x = bX - aX;
    const y = bY - aY;
    return Math.sqrt(x * x + y * y);
}

function intent(DOM) {
    const landmark = DOM.select('.js-show-info');
    const mousedown = landmark.events('mousedown');
    const mouseup = landmark.events('mouseup');

    return mousedown.map(mouseDownEvent =>
        mouseup.filter(mouseUpEvent =>
            dist(
                mouseDownEvent.clientX, mouseDownEvent.clientY,
                mouseUpEvent.clientX, mouseUpEvent.clientY
            ) < 10
        )
            .mapTo({ type: "showInfos" })
    ).flatten()
}

function model(props, action$) {
    // On emet les props lorsque le joueur clique sur le landmark (pour pouvoir ensuite afficher les infos du lieu)
    const value$ = props.location$.map(location =>
        action$.filter(action => action.type === "showInfos")
            .mapTo(location)
    ).flatten();

    const state$ = props.location$.map( location => ({location}));

    return {
        state$,
        value$
    }

}

function view(state$, datas$) {
    return xs.combine(datas$, state$).map(([datas, state]) => {
        return svg.g({ attrs: { transform: "translate(" + state.location.pixelCoordinates.x + " " + state.location.pixelCoordinates.y + ")" } }, [
            svg.image({
                attrs: {
                    'xlink:href':
                        // Trois types de landmarks différents en fonction de si : le lieu est accessible pour le joueur, le lieu est celui où se trouve le joueur, le reste des lieux (inaccesssibles)
                        state.location.isCurrentLocation ?
                            datas.settings.images.currentLocationLandmark :
                            (state.location.isReachable ?
                                datas.settings.images.reachableLandmark :
                                datas.settings.images.unreachableLandmark),
                    class: "js-show-info",
                    width: datas.settings.landmarksImageWidth + "px",
                    height: datas.settings.landmarksImageHeight + "px",
                    y: - datas.settings.landmarksImageHeight + "px",
                    x: - (datas.settings.landmarksImageWidth * 0.5) + "px",
                    style: `opacity: ${state.location.isCurrentLocation || state.location.isReachable ? 1 : 0.5};`
                }
            }),
        ])
    });
}

export function Landmark(sources) {
    const { props, datas$, DOM } = sources;
    const action$ = intent(DOM);
    const {state$,value$} = model(props, action$);
    const vdom$ = view(state$, datas$);

    const sinks = {
        DOM: vdom$,
        location: props.location$.remember(),
        focus: value$
    };

    return sinks;
}