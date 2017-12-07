import xs from 'xstream';
import tween from 'xstream/extra/tween'
import delay from 'xstream/extra/delay'
import concat from 'xstream/extra/concat'
import dropRepeats from 'xstream/extra/dropRepeats'
import isolate from '@cycle/isolate';
import { Landmark } from '../Landmark';
import { LandmarkTooltip } from '../LandmarkTooltip';
import  MapFastTravelButton  from '../MapFastTravelButton';
import { Path } from '../Path';
import { makeLocationObject, mixMerge, mixCombine } from '../../utils';
import _ from 'lodash';
import { view } from './view';
import { fail } from 'assert';

/*
Composant permettant l'affichage d'une carte autorisant le joueur à voyager vers certaines destinations de façon visuelle.
*/

function intent(DOM) {
    return DOM.select('.js-show-map').events('click').map(value => ({ type: "showMap" }))
}

// Beaucoup d'entrées et de sorties dans ce modèle là. Je vais essayer d'expliquer ça au mieux.
function model(
        DOM, 
        action$, 
        currentLocation$, 
        currentLocationLinksIds$, 
        progression$, 
        path$, 
        windowResize$, 
        datas$, 
        canTravel$
    ) {
    // Emet un array d'objet contenant les coordonnées associées à chaque lieu en pixel. Le calcul est effectué à partir des coordonnées latitude-longitude de chaque lieu fournies dans le .json ainsi que des coordonnées en pixels de 2 lieux "témoins".
    const locations$ = datas$.map(datas => {
        // Ids des 2 lieux témoins
        const baseLandmarkIds = datas.settings.baseLandmarks.map(baseLandmark => baseLandmark.location);
        // Coordonnées latitude-longitude des 2 lieux témoins
        const coordinateLandmark = baseLandmarkIds.map(baseLandmarkId => datas.locations[baseLandmarkId].coordinates);
        // Coordonnées en pixel des 2 lieux témoins
        const pixelCoordinateLandmark = datas.settings.baseLandmarks.map(baseLandmark => baseLandmark.pixelCoordinates);

        // Pour chaque lieu un calcul (pas si compliqué) permet, en se basant sur les lieux témoins, de déterminer les coordonnées en pixels.
        return Object.keys(datas.locations).map((curLocationId, value) => {
            // Some boring arithmetic
            // Converts real latitude/longitude into pixel coordinates curX/curY
            const xRatio = (coordinateLandmark[1].latitude - coordinateLandmark[0].latitude) / (pixelCoordinateLandmark[1].x - pixelCoordinateLandmark[0].x);
            const x0 = (pixelCoordinateLandmark[1].x * coordinateLandmark[0].latitude - pixelCoordinateLandmark[0].x * coordinateLandmark[1].latitude) / (pixelCoordinateLandmark[1].x - pixelCoordinateLandmark[0].x);
            const curX = (datas.locations[curLocationId].coordinates.latitude - x0) / xRatio;

            const yRatio = (coordinateLandmark[1].longitude - coordinateLandmark[0].longitude) / (pixelCoordinateLandmark[1].y - pixelCoordinateLandmark[0].y);
            const y0 = (pixelCoordinateLandmark[1].y * coordinateLandmark[0].longitude - pixelCoordinateLandmark[0].y * coordinateLandmark[1].longitude) / (pixelCoordinateLandmark[1].y - pixelCoordinateLandmark[0].y);
            const curY = (datas.locations[curLocationId].coordinates.longitude - y0) / yRatio;

            // On map chaque objet avec un objet contenant ses infos contenues dans le .json ainsi que ses coordonnées pixels.
            return {
                details: makeLocationObject(curLocationId, datas),
                pixelCoordinates: {
                    x: curX,
                    y: curY,
                },
            };
        });
    });

    // Pour chaque lieu on va créer un repère sur la carte (ou "landmark"). Les props de chaque landmark sont : ses coordonnées pixels, si ce landmark représente le lieu où le joueur se trouve ('isCurrentLocation') ou un lieu accessible par le joueur ('isReachable'). Ces 2 derniers booléens permettent de déterminer l'assets à afficher pour le landmark (un landmark gris, vert ou rouge). De plus on va trier les landmarks selon leur latitude (y) ce qui permettra un affichage sur la carte de haut en bas. Ainsi les landmarks bas se retrouveront par dessus les landmarks hauts.
    const landmarksProps$ = xs.combine(currentLocation$, currentLocationLinksIds$, locations$)
        .map(([currentLocation, currentLocationLinksIds, locations]) =>
            _.chain(locations)
                .map(curr => ({
                    ...curr,
                    isCurrentLocation: curr.details.id === currentLocation.id,
                    isReachable: _.includes(currentLocationLinksIds, curr.details.id)
                }))
                .sortBy(['isCurrentLocation', 'isReachable', 'pixelCoordinates.y'])
                .value()
        ).remember();

    // On créer ensuite ces landmark en fournissant à chacun ses props
    const landmarks$ = landmarksProps$.map(landmarksProps =>
        landmarksProps.map((landmarkProps, key) =>
            isolate(Landmark, key)({ DOM, datas$, props$: xs.of(landmarkProps) })
        )
    );

    const fastTravelButtons$ = landmarksProps$
    .map( landmarksProps =>
        landmarksProps.filter( o => o.isReachable).map((landmarkProps, key) =>
            isolate(MapFastTravelButton,key)({DOM,props$:xs.of({location:landmarkProps.details})})
        )
    ).startWith([]);

    // On créer ici le composant Path qui servira à afficher le chemin parcouru par le joueur
    ///// A VOIR SI CETTE FONCTIONNALITÉ EST INTÉRESSANTE OU NON /////
    const pathSink = Path({ locations$, progression$, path$, currentLocation$ });


    const landmarksTooltipInfos$ = landmarks$.compose(mixMerge('tooltipInfos$'));

    // On créer l'élément affichant les informations d'un lieu lors du clique sur le landmark selectionné (tooltip)
    const landmarkTooltipSink = LandmarkTooltip({ 
        DOM, 
        props:{
            canTravel$,
            location$:landmarksTooltipInfos$.startWith(null)
        }
    });

    // Le flux émettant à chaque changement de lieu (le joueur change de lieu en cliquant sur le bouton de déplacement sur le tooltip, on récupère donc le sink correspondant du composant tooltip)
    const changeLocation$ = landmarkTooltipSink.travel;

    // On diffère ce flux pour laisser le temps à l'animation de s'afficher
    const changeLocationDelayed$ = datas$.map(datas => 
        changeLocation$
        .compose(delay(datas.settings.travelAnimationDuration * 1000)))
        .flatten();

     // Ce flux emet un booléen qui détermine si la carte doit être affichée ou non
     const showMap$ = xs.merge(
        action$.filter(action => action.type === "showMap").mapTo("showMap"),
        changeLocationDelayed$.mapTo("changeLocation")
    ).fold((acc, x) => {
        switch (x) {
            case "showMap": // Dans le cas d'un clique sur le bouton d'affichage de la carte, sur la croix de fermeture de la carte ou encore sur les côtés de la carte
                return !acc; // On change l'état de la carte (si elle était affichée on la cache et inversement)
            case "changeLocation": // Dans le cas où le joueur change de lieu
                return false; // On ferme simplement la carte
        }
    }, false);


    // Technique de Pierre un peu compliqué pour identifier les composants contenus dans l'array emit par un flux par une de leurs sinks (comme pour latitudeSortedLandmarks). Chaque landmark emet l'id du lieu qu'il représente et on veut pouvoir récupérer un landmark en fournissant l'id correspondant. Etant utilisé 2 fois juste après, cette fonction factorise le code et permet une plus grande clartée.
    const getLandmarkById = function (location$) {
        return xs.combine(location$, landmarks$).map(([location, landmarks]) => {
            const identifiedLandmarks = landmarks.map(landmark =>
                landmark.id$.map(id => ({ id, landmark }))
            );

            return xs.combine(...identifiedLandmarks).map(identifiedLandmarksCombined =>
                identifiedLandmarksCombined.filter(identifiedLandmark =>
                    identifiedLandmark.id === location.id
                )[0].landmark
            );
        }).flatten();
    }

    // On récupère les landmarks correspondant au lieu actuel et au lieu de destination grâce à la fonction ci-dessus
    const currentLocationLandmark$ = getLandmarkById(currentLocation$);
    const newLocationLandmark$ = getLandmarkById(changeLocation$);

    // Données relatives à l'animation du voyage du joueur. On y trouve : les coordonnées du lieu de départ, les coordonnées du lieu de destination, l'avancement de l'animation (un chiffre compris entre 0 et 1). Pour avoir une animation fluide on utilise tween de xstream qui permet d'obtenir plusieurs types d'interpolations entre les nombres de notre choix (ici 0 et 1).
    const travelAnimationDatas$ = datas$.map(datas =>
        xs.combine(
            currentLocationLandmark$.map(currentLocationLandmark => currentLocationLandmark.locations$).flatten(),
            newLocationLandmark$.map(newLocationLandmark => newLocationLandmark.locations$).flatten(),
            changeLocation$.mapTo(
                concat(
                    tween({
                        from: 0,
                        to: 1,
                        ease: tween.power3.easeInOut,
                        duration: datas.settings.travelAnimationDuration * 1000, // milliseconds
                    }),
                    xs.of(0), // Permet de remettre l'animation à 0 dès qu'elle se termine pour éviter les glitchs au début de l'animation suivante
                )
            ).flatten(),
        )
    ).flatten();

    // Ce flux calcul les coordonnées de l'extremité "mouvante" de l'animation à l'aide des données précédentes
    const travelAnimationState$ = travelAnimationDatas$.map(([currentLocationPixelCoordinates, newLocationPixelCoordinates, animationState]) => {
        const x1 = currentLocationPixelCoordinates.x;
        const y1 = currentLocationPixelCoordinates.y;
        const x2 = currentLocationPixelCoordinates.x + (newLocationPixelCoordinates.x - currentLocationPixelCoordinates.x) * animationState;
        const y2 = currentLocationPixelCoordinates.y + (newLocationPixelCoordinates.y - currentLocationPixelCoordinates.y) * animationState;
        return { x1, y1, x2, y2 };
    });

    // le buzz s'active la premiere fois que le voyage est possible
    // et se desactive quand on joue avec l'ouverture de la carte
    // Et celà jusqu'a la prochaine ville.
    const buzz$ = canTravel$
        .map(canTravel =>
            showMap$.mapTo(false).drop(1).startWith(true)
        )
        .flatten()
        .drop(1)
        .startWith(false)
        .remember();


    const center$ = xs.merge(
        // centrage de la carte sur la ville courant
        landmarks$.compose(mixMerge('props$'))
            .filter(p => p.isCurrentLocation)
            .map(o => ({
                x: o.pixelCoordinates.x,
                y: o.pixelCoordinates.y,
                smooth: false
            })),
        // centrage sur le trajectoire
        travelAnimationState$.map(({ x1, y1, x2, y2 }) => ({
            x: x2,
            y: y2,
            smooth: true
        }))
    );

    

    // On retourne pas mal de choses mais c'est utile pour après t'inquiète. Après je reconnais que c'est pas super élégant.
    return {
        showMap$,
        center$,
        landmarks$,
        landmarkTooltipSink,
        fastTravelButtons$,
        travelAnimationState$,
        pathSink,
        changeLocationDelayed$,
        buzz$
    };
}

export function Map(sources) {
    const { DOM,
        canTravel$,
        windowResize$,
        currentLocation$,
        currentLocationLinksIds$,
        progression$,
        path$,
        datas$
    } = sources;

    const action$ = intent(DOM);
    const { showMap$,
        center$,
        landmarks$,
        landmarkTooltipSink,
        travelAnimationState$,
        pathSink,
        changeLocationDelayed$,
        fastTravelButtons$,
        buzz$
    } = model(
        DOM, 
        action$, 
        currentLocation$, 
        currentLocationLinksIds$, 
        progression$, 
        path$, 
        windowResize$, 
        datas$, 
        canTravel$
    );

    const vdom$ = view({
        DOM,
        center$,
        windowResize$,
        showMap$,
        landmarks$,
        landmarkTooltipSink,
        travelAnimationState$,
        fastTravelButtons$,
        pathSink,
        datas$,
        canTravel$,
        buzz$
    });

    const sinks = {
        DOM: vdom$,
        changeLocation$: changeLocationDelayed$, // On renvoi le changement de lieu seulement à la fin de l'animation (delayed)
    };

    return sinks;
}