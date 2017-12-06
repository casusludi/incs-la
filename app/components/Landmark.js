import xs from 'xstream';

import { svg } from '@cycle/dom';

import { html } from 'snabbdom-jsx';

/*
Icône "repère" affiché sur la carte pour chaque lieu. Le joueur peut cliquer dessus pour afficher des informations complémentaires sur le lieu (voir composant LandmarkTooltip)
*/

function dist(aX,aY,bX,bY){
    const x = bX-aX;
    const y = bY-aY;
    return Math.sqrt(x*x+y*y);
}

function intent(DOM){
    const landmark = DOM.select('.js-show-info');
    const mousedown = landmark.events('mousedown');
    const mouseup= landmark.events('mouseup');

    return mousedown.map(mouseDownEvent => 
        mouseup.filter(mouseUpEvent => 
            dist(
                mouseDownEvent.clientX,mouseDownEvent.clientY,
                mouseUpEvent.clientX,mouseUpEvent.clientY
            ) < 10
        )
        .mapTo({type: "showInfos"})
    ).flatten()
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
                        (props.isReachable ? 
                            datas.settings.images.reachableLandmark : 
                            datas.settings.images.unreachableLandmark),
                class: "js-show-info",
                width: datas.settings.landmarksImageWidth + "px",
                height: datas.settings.landmarksImageHeight + "px",
                y: - datas.settings.landmarksImageHeight + "px",
                x: - (datas.settings.landmarksImageWidth * 0.5) + "px",
                style: `opacity: ${props.isCurrentLocation || props.isReachable?1:0.5};`
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
        locations$: remProps$.map(props => props.pixelCoordinates), // Les coordonnées du landmark (utiles pour l'animation du voyage du joueur dans le composant Map)
        props$:remProps$, // Les coordonnées du landmark (utiles pour l'animation du voyage du joueur dans le composant Map)
        id$: remProps$.map(props => props.details.id), // L'id du lieu qu'il représente (pour pouvoir récupérer un landmark correspondant à un id spécifique pour l'animation du voyage du joueur dans le composant Map)
    };

    return sinks;
}