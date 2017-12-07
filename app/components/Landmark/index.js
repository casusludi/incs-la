import xs from 'xstream';
import delay from 'xstream/extra/delay';

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

    const location$ = props.location$;
    const buzz$ = props.buzz$.debug('buzz').map( buzz => 
        xs.merge(
            xs.of(true),
            xs.of(false).compose(delay(2500)).endWhen(props.buzz$.debug('end'))
        ).debug('curr')
    ).flatten()
    .startWith(false);

    const state$ = xs.combine(location$,buzz$)
        .map(([location,buzz]) => ({location,buzz}))

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
                    class: `js-show-info landmark ${state.buzz?'buzz':''}`,
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
    const defaultProps = {location$:xs.of(),buzz$:xs.of()};
    const currProps = {...defaultProps,...props};

    const action$ = intent(DOM);
    const {state$,value$} = model(currProps, action$);
    const vdom$ = view(state$, datas$);

    const sinks = {
        DOM: vdom$,
        location: props.location$.remember(),
        focus: value$
    };

    return sinks;
}