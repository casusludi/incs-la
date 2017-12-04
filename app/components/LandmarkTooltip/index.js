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

function intent(DOM,canTravel$){
	return xs.merge(
		xs.merge(
			DOM.select('.js-hide-infos').events('click'), // Clique sur la croix pour fermer le tooltip
			DOM.select('.map').events('click').filter(e => e.target.className.baseVal === "mapImageTag") // Clique en dehors du tooltip sur la carte (magouille avec la propagation d'évenements - voir composant Map)
		).map(value => ({type: "hideInfos"})),
		
		canTravel$.map( canTravel => canTravel?
			DOM.select('.js-travel-to').events('click').mapTo({ type: "travelTo" })
			:xs.empty()).flatten() // Clique sur le bouton de voyage
	);
}

function model(action$, DOM, landmarks$, datas$){
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
			changeLocation$										// Lorsque le joueur clique sur le bouton de déplacement (le tooltip se ferme pour laisser place à l'animation de voyage)
		).mapTo(null),
	);
	

	return {changeLocation$, tooltipInfos$};
}

function view(
		DOM, 
		tooltipInfos$, 
		datas$,
		canTravel$
	){

	const vdom$ = xs.combine(
		tooltipInfos$, 
		datas$,
		canTravel$
	)
	.map(([
		tooltipInfos, 
		datas,
		canTravel
	]) =>

		<div className={`landmark-panel-wrapper ${tooltipInfos?'show':'hide'}`}>
			<div className="landmark-panel-overlay js-hide-infos"></div>
			
			
			<div className="landmark-panel js-landmark-panel panel" style={{

			}}>
				{tooltipInfos?
				<div className="landmark-panel-content">
				<div className="landmark-panel-header">  
					<h3>{tooltipInfos.location.name}</h3>
					<i className="js-hide-infos svg-icon icon-close" />
				</div>
				
				<p className="scrollable-panel">{tooltipInfos.location.desc}</p>
				{tooltipInfos.isReachableLandmark ? 
						<button className={`js-travel-to button ${canTravel?"":" button-disabled"}`} type="button">{canTravel?`S'y rendre `:`Vous devez enquêter !`}</button> 
					: ""}
				</div>
				:""}
				</div> 
			
			</div>
	).startWith("");

	return vdom$;
}

export function LandmarkTooltip(sources) {
	const {DOM,  landmarks$, datas$, canTravel$} = sources;

	const action$ = intent(DOM,canTravel$);
	const {changeLocation$, tooltipInfos$} = model(action$, DOM, landmarks$, datas$);
	const vdom$ = view(DOM, tooltipInfos$, datas$,canTravel$);

	const sinks = {
		DOM: vdom$,
		changeLocation$,
	};

	return sinks;
}