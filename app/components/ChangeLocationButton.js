import { html } from 'snabbdom-jsx';

function intent(DOM){
	const click$ = DOM
		.select('.js-change-location')
		.events('click')
		.mapTo(true);

	return click$;
}

function model(props$, action$){
	return props$.map(props => action$.mapTo(props)).flatten();
}

function view(props$){
	return props$
		.map(props =>
			<button selector=".js-change-location" type="button" >{props.name}</button>
		);
}

export function ChangeLocationButton(sources) {
	const {props$, DOM} = sources;
	const action$ = intent(DOM);
	const state$ = model(props$, action$);
	const vdom$ = view(props$);

	const sinks = {
		DOM: vdom$,
		changeLocation$: state$,
		linkValue$: props$,
	};

	return sinks;
}