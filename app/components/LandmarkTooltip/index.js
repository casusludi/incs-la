import xs from 'xstream';

import { html } from 'snabbdom-jsx';

import { 
	getHtmlElementDimensions, 
	getSvgElementDimensions, 
	mixMerge, 
	mixCombine 
} from '../../utils';


/*
Ce composant représente la fenêtre qui s'affiche à côté d'un landmark quand celui-ci est sélectionné par le joueur. Il affiche des informations telles que le nom du lieu ainsi que sa description. Dans le cas d'un lieu accessible par le joueur il présente de plus un bouton permettant de s'y rendre.
*/

function intent(DOM){
	return xs.merge(
		xs.merge(
			DOM.select('.js-hide-infos').events('click'), // Clique sur la croix pour fermer le tooltip
			DOM.select('.map').events('click').filter(e => e.target.className.baseVal === "mapImageTag") // Clique en dehors du tooltip sur la carte (magouille avec la propagation d'évenements - voir composant Map)
		).map(value => ({type: "hideInfos"})),
		DOM.select('.js-travel-to').events('click').map(value => ({type: "travelTo"})), // Clique sur le bouton de voyage
	);
}

function model(action$, DOM, landmarks$, showMap$, datas$){
	// Flux emettant les données d'un lieu chaque fois que son landmark correspondant est sélectionné
	const landmarksTooltipInfos$ = landmarks$.compose(mixMerge('tooltipInfos$'));

	// Flux de changement de lieu. Il emet les données correspondant au lieu de destination lorsque le joueur effectue un déplacement (clique sur le bouton de déplacement).
	const changeLocation$ = landmarksTooltipInfos$.map(landmarksTooltipInfos =>
		action$.filter(action => action.type === "travelTo")
		.mapTo(landmarksTooltipInfos.location)
	).flatten();

	// Flux emettant les données effectives affichées par le tooltip. lorsque le tooltip est fermé emet 'null'.
	const tooltipInfos$ = xs.merge(
		landmarksTooltipInfos$, // Données du lieu sélectionné émisent
		xs.merge( // Différentes raisons pour lesquelles le tooltip est amené à être fermé :
			action$.filter(action => action.type === "hideInfos"),	// Clique sur la croix de fermeture du tooltip
			changeLocation$,										// Lorsque le joueur clique sur le bouton de déplacement (le tooltip se ferme pour laisser place à l'animation de voyage)
			showMap$.filter(showMap => showMap === false),			// Lorsque la carte est fermée
		).mapTo(null),
	);
	

	return {changeLocation$, tooltipInfos$};
}

function view(
		DOM, 
		windowResize$, 
		tooltipInfos$, 
		datas$
	){
	// On utilise windowResize$ du driver windowResize pour recalcule le VDom lorsque la fenêtre du navigateur est redimensionnée
	const vdom$ = xs.combine(
		windowResize$, 
		tooltipInfos$, 
		datas$
	)
	.map(([
		windowResize, 
		tooltipInfos, 
		datas
	]) =>

		<div className={`landmark-panel-wrapper ${tooltipInfos?'show':'hide'}`}>
			<div className="landmark-panel-overlay js-hide-infos"></div>
			
			
			<div className="landmark-panel js-landmark-panel panel" style={{

			}}>
				{tooltipInfos?
				<div className="landmark-panel-content">
				<div className="landmark-panel-header">  
					<h3>{tooltipInfos.location.name}</h3>
					<img className="js-hide-infos close-button"
					src={datas.settings.images.closeMapIcon} 
					style={{
						width: "20px", 
						padding: "3px",
					}} />
				</div>
				
				<p className="scrollable-panel">{tooltipInfos.location.desc}</p>
				{tooltipInfos.isReachableLandmark ? <button className="js-travel-to button" type="button">S'y rendre</button> : ""}
				</div>
				:""}
				</div> 
			
			</div>
	).startWith("");

	return vdom$;
}

export function LandmarkTooltip(sources) {
	const {DOM, windowResize$, landmarks$, datas$, showMap$} = sources;

	const action$ = intent(DOM);
	const {changeLocation$, tooltipInfos$} = model(action$, DOM, landmarks$, showMap$, datas$);
	const vdom$ = view(DOM, windowResize$, tooltipInfos$, datas$);

	const sinks = {
		DOM: vdom$,
		changeLocation$,
	};

	return sinks;
}