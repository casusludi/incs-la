import xs from 'xstream';

import { html } from 'snabbdom-jsx';

import { getHtmlElementDimensions, getSvgElementDimensions } from '../utils';
import { mixMerge, mixCombine } from '../utils';

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

	// On récupère les dimensions de différentes balises :
	// balise svg
	const svgTagDimension$ = getHtmlElementDimensions(DOM, ".svgMapTag").startWith(null);
	// balise image (carte) qui se redimensionne en largeur et hauteur dans la balise svg pour prendre soit toute la largeur ou toute la hauteur. Elle se retrouve donc avec des marges latérales ou en haut et en bas en fonction de la taille de la fenêtre du navigateur.
	const mapImageDimension$ = getSvgElementDimensions(DOM, ".mapImageTag").startWith(null).debug('lol');
	// div contenant le tooltip
	const toolTipContainerDimension$ = getHtmlElementDimensions(DOM, ".locationInfo", 1).startWith(null);

	// On calcul ensuite la position du tooltip. Il se place naturellement en bas à droite du landmark correspondant. Son coin haut-gauche étant l'emplacement du landmark. Cependant lorsque l'espace à droite du landmark est trop restreint pour que le tooltip puisse tenir il est placé à gauche. Idem pour le bas et le haut.
	const tooltipPosition$ = xs.combine(tooltipInfos$, datas$, svgTagDimension$, mapImageDimension$, toolTipContainerDimension$)
	.filter(([tooltipInfos, datas, svgTagDimension, mapImageDimension, toolTipContainerDimension]) => tooltipInfos)
	.map(([tooltipInfos, datas, svgTagDimension, mapImageDimension, toolTipContainerDimension]) => {
		var xPos, yPos;
		const ratio = mapImageDimension.width / datas.settings.mapImageDimension.width; // Calcul du ratio entre la taille réelle de l'image de la carte et sa taille lors de l'affichage
		const widthMargin = (svgTagDimension.width - mapImageDimension.width) / 2;
		const heightMargin = (svgTagDimension.height - mapImageDimension.height) / 2;
		
		xPos = tooltipInfos.pixelCoordinates.x * ratio + widthMargin;
		yPos = tooltipInfos.pixelCoordinates.y * ratio + heightMargin;

		if(toolTipContainerDimension){
			if(xPos + toolTipContainerDimension.width > mapImageDimension.width)
				xPos -= toolTipContainerDimension.width;
			if(yPos + toolTipContainerDimension.height > mapImageDimension.height)
				yPos -= toolTipContainerDimension.height;
		}

		return {x: xPos, y: yPos};
	});

	return {changeLocation$, tooltipInfos$, tooltipPosition$};
}

function view(DOM, windowResize$, tooltipInfos$, tooltipPosition$, datas$){
	// On utilise windowResize$ du driver windowResize pour recalcule le VDom lorsque la fenêtre du navigateur est redimensionnée
	const vdom$ = xs.combine(windowResize$, tooltipInfos$, datas$, tooltipPosition$)
	.map(([windowResize, tooltipInfos, datas, tooltipPosition]) =>
		tooltipInfos ?
			<div className="locationInfo scrollable-panel panel" style={{
				left: tooltipPosition.x+"px",
				top: tooltipPosition.y+"px",
				width: "200px",
				'max-height': 'none',
			}}>
				<div className="headerToolTip">  
					<img className="js-hide-infos"
					src={datas.settings.images.closeMapIcon} 
					style={{
						width: "20px", 
						background: "rgb(200, 200, 200)", 
						padding: "3px",
					}} />
					{tooltipInfos.isReachableLandmark ? <button className="js-travel-to button-3d" type="button">S'y rendre</button> : ""}
				</div>
				<h3>{tooltipInfos.location.name}</h3>
				<p>{tooltipInfos.location.desc}</p>
			</div> : ""
	).startWith("");

	return vdom$;
}

export function LandmarkTooltip(sources) {
	const {DOM, windowResize$, landmarks$, datas$, showMap$} = sources;

	const action$ = intent(DOM);
	const {changeLocation$, tooltipInfos$, tooltipPosition$} = model(action$, DOM, landmarks$, showMap$, datas$);
	const vdom$ = view(DOM, windowResize$, tooltipInfos$, tooltipPosition$, datas$);

	const sinks = {
		DOM: vdom$,
		changeLocation$,
	};

	return sinks;
}