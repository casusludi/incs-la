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
	return xs.merge(
		DOM.select('.js-hide-infos').events('click').map(value => ({ type: "hideInfos" })),
		DOM.select('.js-travel-to').events('click').mapTo({ type: "travelTo" })
	);
}

function model(props, action$) {

	const model$ = props.location$.map(location => {

		const travel$ = props.canTravel$.map(canTravel =>
			action$.filter(a => a.type == "travelTo")
				.filter(a => canTravel && location)
				.map(a => location.details)
		).flatten();

		const data$ =
			xs.merge(
				action$.filter(a => a.type == "hideInfos"),
				travel$
			)
				.mapTo({ location, visible: false })
				.startWith({ visible: !!location, location })

		const state$ = xs.combine(data$, props.canTravel$)
			.map(([data, canTravel]) => ({
				...data,
				canTravel
			}))

		return {
			state$,
			travel$
		}

	})
	.remember()

	return {
		state$: model$.map(state => state.state$).flatten().remember(),
		travel$: model$.map(state => state.travel$).flatten()
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

	const action$ = intent(DOM);
	const { state$, travel$ } = model(props, action$);
	const vdom$ = view(state$);

	const sinks = {
		DOM: vdom$,
		travel: travel$
	};

	return sinks;
}