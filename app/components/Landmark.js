import xs from 'xstream';

import { svg } from '@cycle/dom';

import { html } from 'snabbdom-jsx';

/*
Icône "repère" affiché sur la carte pour chaque lieu. Le joueur peut cliquer dessus pour afficher des informations complémentaires sur le lieu (voir composant LandmarkTooltip)
*/

function intent(DOM){
    const action$ = xs.merge(
        DOM.select('.js-show-info').events('click').mapTo({type: "showInfos"}),
    );

    return action$;
}

function model(props$, action$){
    // On emet les props lorsque le joueur clique sur le landmark (pour pouvoir ensuite afficher les infos du lieu)
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
                    // Trois types de landmarks différents en fonction de si : le lieu est accessible pour le joueur, le lieu est celui où se trouve le joueur, le reste des lieux (inaccesssibles)
                    props.isCurrentLocation ? 
                        datas.settings.images.currentLocationLandmark : 
                        (props.isReachableLandmark ? 
                            datas.settings.images.reachableLandmark : 
                            datas.settings.images.unreachableLandmark),
                class: "js-show-info",
                width: datas.settings.landmarksImageWidth + "px",
                height: datas.settings.landmarksImageHeight + "px",
                y: - datas.settings.landmarksImageHeight + "px",
                x: - (datas.settings.landmarksImageWidth * 0.5) + "px",
                style: `opacity: ${props.isCurrentLocation || props.isReachableLandmark?1:0.5};`
            }}),
        ])
    });
}

export function Landmark(sources) {
    const {props$, datas$, DOM} = sources;
    const remProps$ = props$.remember() // Les props doivent être mémorisées pour que ça fonctionne ici apparement
    const action$ = intent(DOM);
    const state$ = model(remProps$, action$);
    const vdom$ = view(remProps$, datas$);

    const sinks = {
        DOM: vdom$,
        tooltipInfos$: state$, // Les données utiles pour l'affichage du tooltip (les props du landmark contenant les données sur le lieu qu'il représente)
        pixelCoordinates$: remProps$.map(props => props.pixelCoordinates), // Les coordonnées du landmark (utiles pour l'animation du voyage du joueur dans le composant Map)
        id$: remProps$.map(props => props.location.id), // L'id du lieu qu'il représente (pour pouvoir récupérer un landmark correspondant à un id spécifique pour l'animation du voyage du joueur dans le composant Map)
    };

    return sinks;
}