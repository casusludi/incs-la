import xs from 'xstream';
import tween from 'xstream/extra/tween'
import delay from 'xstream/extra/delay'
import concat from 'xstream/extra/concat'
import dropRepeats from 'xstream/extra/dropRepeats'

import { svg } from '@cycle/dom';
import isolate from '@cycle/isolate';

import { html } from 'snabbdom-jsx';

import {Landmark} from '../Landmark';
import {LandmarkTooltip} from '../LandmarkTooltip';
import {Path} from '../Path';

import {makeLocationObject} from '../../utils';
import { mixMerge, mixCombine } from '../../utils';

import * as _ from 'lodash';

/*
Composant permettant l'affichage d'une carte autorisant le joueur à voyager vers certaines destinations de façon visuelle.
*/

function intent(DOM){
    // Petite magouille pour éviter que les évenements ne "bouillone" (bubble, se propage à leur parent quoi enfin je t'apprends rien). C'est pour s'assurer que l'évenement à bien été déclenché par un clique sur l'évenement lui-même et pas sur un de ses fils qui est ensuite remonté. Parce-que dans ce cas on a certain clique qui ouvre et ferme la carte en même temps et inversement car 2 évenements se déclenchent en même temps dus à la propagation. Je suis pas bien sûr d'être clair. Or il me semble qu'en JS classique il suffit de faire un stopPropagation() mais ici soit on ne peut pas (je sais pas trop) soit c'est juste un effet de bord qui ne devrait pas être utilisé ici. Donc c'est la seule "technique" que j'ai trouvée pour ça (et j'en suis pas fier).
    return xs.merge(
        xs.merge(
            DOM.select('.js-show-map').events('click'),
            DOM.select('.map').events('click').filter(e => e.target.className === "map"),
            DOM.select('.svgMapTag').events('click').filter(e => e.target.className.baseVal === "svgMapTag")
        ).map(value => ({type: "showMap"})),
        DOM.select('.js-hide-infos').events('click').map(value => ({type: "hideInfos"})),
        DOM.select('.js-travel-to').events('click').map(value => ({type: "travelTo"})),
    );
}

// Beaucoup d'entrées et de sorties dans ce modèle là. Je vais essayer d'expliquer ça au mieux.
function model(DOM, action$, currentLocation$, currentLocationLinksIds$, progression$, path$, windowResize$, datas$){
    // Emet un array d'objet contenant les coordonnées associées à chaque lieu en pixel. Le calcul est effectué à partir des coordonnées latitude-longitude de chaque lieu fournies dans le .json ainsi que des coordonnées en pixels de 2 lieux "témoins".
    const pixelCoordinates$ = datas$.map(datas => {
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
                location: makeLocationObject(curLocationId, datas),
                pixelCoordinates: {
                    x: curX,
                    y: curY,
                },
            };
        });
    });

    // Pour chaque lieu on va créer un repère sur la carte (ou "landmark"). Les props de chaque landmark sont : ses coordonnées pixels, si ce landmark représente le lieu où le joueur se trouve ('isCurrentLocation') ou un lieu accessible par le joueur ('isReachableLandmark'). Ces 2 derniers booléens permettent de déterminer l'assets à afficher pour le landmark (un landmark gris, vert ou rouge). De plus on va trier les landmarks selon leur latitude (y) ce qui permettra un affichage sur la carte de haut en bas. Ainsi les landmarks bas se retrouveront par dessus les landmarks hauts.
    const landmarksProps$ = xs.combine(currentLocation$, currentLocationLinksIds$, pixelCoordinates$)
    .map(([currentLocation, currentLocationLinksIds, pixelCoordinates]) =>
        _.sortBy(pixelCoordinates, 'pixelCoordinates.y').map(currentPixelCoordinates => {
            const isCurrentLocation = currentPixelCoordinates.location.id === currentLocation.id;
            const isReachableLandmark = _.includes(currentLocationLinksIds, currentPixelCoordinates.location.id);

            return Object.assign({}, 
                currentPixelCoordinates,
                {
                    isCurrentLocation: isCurrentLocation,
                    isReachableLandmark: isReachableLandmark,
                }
            );
        })
    ).remember();
    
    // On créer ensuite ces landmark en fournissant à chacun ses props
    const landmarks$ = landmarksProps$.map(landmarksProps =>
        landmarksProps.map((landmarkProps, key) =>
            isolate(Landmark, key)({DOM, datas$, props$: xs.of(landmarkProps)})
        )
    );

    // On utilise ensuite la technique bien stylée de Pierre pour trier les landmarks en fonction de leur latitude qui est émise par chacun des composants Landmark par le sink pixelCoordinates$.
    ////// Maintenant obsolète car le tri se fait plus haut //////
    /*
    const latitudeSortedLandmarks$ = landmarks$.map(landmarks => {
        const latitudeIdentifiedLandmarks = landmarks.map(landmark =>
            landmark.pixelCoordinates$.map(pixelCoordinates =>
                 ({landmark, latitude: pixelCoordinates.y})
            )
        );

        return xs.combine(...latitudeIdentifiedLandmarks).map(latitudeIdentifiedLandmarksArray => 
            _.sortBy(latitudeIdentifiedLandmarksArray, 'latitude').map(latitudeIdentifiedLandmark => latitudeIdentifiedLandmark.landmark)
        );
    }).flatten().remember();
    */

    // On créer ici le composant Path qui servira à afficher le chemin parcouru par le joueur
    ///// A VOIR SI CETTE FONCTIONNALITÉ EST INTÉRESSANTE OU NON /////
    const pathSink = Path({pixelCoordinates$, progression$, path$, currentLocation$});

    // On va avoir besoin ici d'un proxy pour le flux qui emet lors d'un changement de lieu
    // Ce flux a été différé le temps que l'animation se déroule (d'où le delayed)
    const changeLocationDelayedProxy$ = xs.create();

    // Ce flux emet un booléen qui détermine si la carte doit être affichée ou non
    const showMap$ = xs.merge(
        action$.filter(action => action.type === "showMap").mapTo("showMap"),
        changeLocationDelayedProxy$.mapTo("changeLocation"),
    ).fold((acc, x) => {
        switch(x) {
            case "showMap": // Dans le cas d'un clique sur le bouton d'affichage de la carte, sur la croix de fermeture de la carte ou encore sur les côtés de la carte
                return !acc; // On change l'état de la carte (si elle était affichée on la cache et inversement)
            case "changeLocation": // Dans le cas où le joueur change de lieu
                return false; // On ferme simplement la carte
        }
    }, false);

    // Fais exactement la même que au dessus mais est moins explicite
    /*
    const showMapOBSOLETE$ = xs.merge(
        action$.filter(action => action.type === "showMap").mapTo(true),
        changeLocationDelayedProxy$.mapTo(false),
    ).fold((acc, x) => x & !acc, false);
    */
    
    // On créer l'élément affichant les informations d'un lieu lors du clique sur le landmark selectionné (tooltip)
    const landmarkTooltipSink = LandmarkTooltip({DOM, windowResize$, landmarks$, datas$, showMap$});

    // Le flux émettant à chaque changement de lieu (le joueur change de lieu en cliquant sur le bouton de déplacement sur le tooltip, on récupère donc le sink correspondant du composant tooltip)
    const changeLocation$ = landmarkTooltipSink.changeLocation$;

    // On diffère ce flux pour laisser le temps à l'animation de s'afficher
    const changeLocationDelayed$ = datas$.map(datas => changeLocation$.compose(delay(datas.settings.travelAnimationDuration * 1000))).flatten();

    // On boucle le proxy avec le flux qu'il doit imiter
    changeLocationDelayedProxy$.imitate(changeLocationDelayed$);
    
    // Technique de Pierre un peu compliqué pour identifier les composants contenus dans l'array emit par un flux par une de leurs sinks (comme pour latitudeSortedLandmarks). Chaque landmark emet l'id du lieu qu'il représente et on veut pouvoir récupérer un landmark en fournissant l'id correspondant. Etant utilisé 2 fois juste après, cette fonction factorise le code et permet une plus grande clartée.
    const getLandmarkById = function(location$){
        return xs.combine(location$, landmarks$).map(([location, landmarks]) => {
            const identifiedLandmarks = landmarks.map(landmark => 
                landmark.id$.map(id =>
                    {return {id, landmark}}
                )
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
            currentLocationLandmark$.map(currentLocationLandmark => currentLocationLandmark.pixelCoordinates$).flatten(),
            newLocationLandmark$.map(newLocationLandmark => newLocationLandmark.pixelCoordinates$).flatten(),
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
        return {x1, y1, x2, y2};
    });

    // On retourne pas mal de choses mais c'est utile pour après t'inquiète. Après je reconnais que c'est pas super élégant.
    return {showMap$, landmarks$, landmarkTooltipSink, travelAnimationState$, pathSink, changeLocationDelayed$};
}

function view(showMap$, landmarks$, landmarkTooltipSink, travelAnimationState$, pathSink, datas$){
    // On récupère les VDom des différents composants
    const landmarksVdom$ = landmarks$.compose(mixCombine('DOM'));
    const tooltipInfosVdom$ = landmarkTooltipSink.DOM;
    const pathVdom$ = pathSink.DOM;
    // L'animation pourrait être dans son propre composant
    const travelAnimationVdom$ = travelAnimationState$.map(({x1, y1, x2, y2}) => {
        return svg.line({ attrs: {
            x1, y1, x2, y2, 
            style: 'stroke: rgb(200,0,0); stroke-width: 4; stroke-dasharray: 10, 10; stroke-linecap: round;'
        }})
    }).startWith("");
    
    const vdom$ = xs.combine(landmarksVdom$, pathVdom$, datas$, showMap$, travelAnimationVdom$, tooltipInfosVdom$)
    .map(([landmarksVdom, pathVdom, datas, showMap, travelAnimationVdom, tooltipInfosVdom]) =>
        <div className="travel-panel-content">
            <button className="js-show-map button" type="button" >Choisir une destination</button>
            <div className={"map-wrapper"+(showMap?" expanded":"")}>
            {showMap ?
                // Imbrication un peu complexe de div.
                <div className="map">
                    <div className="mapContainer">
                        {
                            svg(".svgMapTag", { 
                                attrs: { 
                                    viewBox:"0 0 "+datas.settings.mapImageDimension.width+" "+datas.settings.mapImageDimension.height, 
                                    width: "100%", 
                                    height: "100%", 
                                    'background-color': "green"
                                }
                            }, [
                                svg.image(".mapImageTag", { attrs: { width: "100%", height: "100%", 'xlink:href': datas.settings.images.map}}),
                                // Le path n'est pas affiché à voir si vous conservez cette fonctionnalité. Elle n'est pas sauvegardée dans le stockage local, quand la page est rechargée il n'apparait donc pas.
                                // pathVdom,
                                travelAnimationVdom,
                                ...landmarksVdom,
                                svg.image(".js-show-map", { attrs: { width: "20px", height: "20px", x: "10px", y: "10px", 'xlink:href': datas.settings.images.closeMapIcon}}),
                            ])
                        }
                        {tooltipInfosVdom}
                    </div>
                </div>
                : ""
            }
            </div>
        </div>
    );

    return vdom$;
}

export function Map(sources) {
    const {DOM, windowResize$, currentLocation$, currentLocationLinksIds$, progression$, path$, datas$} = sources;
    
    const action$ = intent(DOM);
    const {showMap$, landmarks$, landmarkTooltipSink, travelAnimationState$, pathSink, changeLocationDelayed$} = model(DOM, action$, currentLocation$, currentLocationLinksIds$, progression$, path$, windowResize$, datas$);
    const vdom$ = view(showMap$, landmarks$, landmarkTooltipSink, travelAnimationState$, pathSink, datas$);

    const sinks = {
        DOM: vdom$,
        changeLocation$: changeLocationDelayed$, // On renvoi le changement de lieu seulement à la fin de l'animation (delayed)
    };

    return sinks;
}