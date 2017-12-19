import styles from './styles.css';

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

function intent(DOM) {
	return {
		hide$: DOM.select('.js-hide-infos').events('click').mapTo(true),
		travel$: DOM.select('.js-travel-to').events('click').mapTo(true)
	}
}

function model(props, action) {

	const travel$ = props.location$.map( location => 
		props.canTravel$.map(canTravel =>
			action.travel$
				.filter(a => canTravel && location)
				.map(a => location.details)
		).flatten()
	).flatten();

	const data$ = props.location$.map( location => xs.merge(
		action.hide$,
		travel$
	)
		.mapTo({ location, visible: false })
		.startWith({ visible: !!location, location })
	).flatten()


	const state$ = xs.combine(data$, props.canTravel$)
		.map(([data, canTravel]) => ({
			...data,
			canTravel
		})).remember()

	return {
		state$,
		travel$
	}

}

function view(state$) {
	return state$.map(state =>
		<div className={`landmark-panel-wrapper ${state.visible ? 'show' : 'hide'}`}>
			<div className="landmark-panel-overlay js-hide-infos"></div>
			<div className="landmark-panel js-landmark-panel panel" style={{
			}}>
				{state.visible ?
					<div className="landmark-panel-content">
						<div className="landmark-panel-header">
							<h3>{state.location.details.name}</h3>
							<i className="js-hide-infos svg-icon icon-close" />
						</div>
						<p className="scrollable-panel">{state.location.details.desc}</p>
						{state.location.isReachable ?
							<button className={`js-travel-to button ${state.canTravel ? "" : " button-disabled"}`} type="button">{state.canTravel ? `S'y rendre ` : `Vous devez enquêter !`}</button>
							: ""}
					</div>
					: ""}
			</div>
		</div>
	);
}

export function LandmarkTooltip(sources) {
	const { DOM, props = { canTravel$: xs.of(false), location$: xs.of({}) } } = sources;

	const action = intent(DOM);
	const { state$, travel$ } = model(props, action);
	const vdom$ = view(state$);

	const sinks = {
		DOM: vdom$,
		travel: travel$
	};

	return sinks;
}