import xs from 'xstream';

import { html } from 'snabbdom-jsx';

import * as _ from 'lodash';

function intent(DOM){
    const click$ = xs.merge(
		DOM.select('.js-end-cut-scene').events('click').mapTo({type: "endCutScene"}),
		DOM.select('.js-slide').events('click').mapTo({type: "nextSlide"}),
	);

    return click$;
}

function model(action$, props$, datas$){
	const slideIndex$ = action$.filter(action => action.type === "nextSlide").fold((acc, x) => acc + 1, 0);
	
	const state$ = xs.combine(slideIndex$, props$, datas$).map(([slideIndex, props, datas]) => ({
		// image: `${datas.settings.cutscenes[props.cutsceneName].path}/slide${slideIndex >= datas.settings.cutscenes[props.cutsceneName].length ? datas.settings.cutscenes[props.cutsceneName].length - 1 : slideIndex}.jpg`,
		image: `${datas.settings.cutscenes[props.cutsceneName].path}/${_.padStart(slideIndex >= datas.settings.cutscenes[props.cutsceneName].length ? datas.settings.cutscenes[props.cutsceneName].length - 1 : slideIndex, 3, '0')}.jpg`,
		ready: slideIndex >= datas.settings.cutscenes[props.cutsceneName].length - 1,
	}));

	return state$;
}

function view(state$, props$, datas$){
    const vdom$ = xs.combine(state$, props$, datas$).map(([state, props, datas]) =>
		<div classNames="content js-slide" style={{backgroundImage: "url("+ state.image +")"}} >
			{state.ready ?
			<div className="modal">
				<div className="panel">
					{datas.settings.cutscenes[props.cutsceneName].message}
				</div>
				<a classNames="js-end-cut-scene button-3d">{datas.settings.cutscenes[props.cutsceneName].button}</a>
			</div> :
			<div className="skip-button-container">
				<a classNames="js-end-cut-scene button-3d">Skip ►</a>
			</div>}
		</div>
	);

    return vdom$;
}

export function Cutscene(sources) {
	const {DOM, datas$} = sources;
	const props$ = xs.of(sources.props);

    const action$ = intent(DOM);
    const state$ = model(action$, props$, datas$);
    const vdom$ = view(state$, props$, datas$);

	const save$ = props$.map(props => ({ 
		key: 'save',
		value: JSON.stringify(props),
	}));

    const sinks = {
        DOM: vdom$,
		router: props$.map(props =>
			action$.filter(action => action.type === "endCutScene").map(a => {
				return ({ pathname: "/redirect", type: 'push', state:{ props: Object.assign(props, {round: props.round + 1}) }})
			})
		).flatten(),
		storage: save$,
    };

    return sinks;
}