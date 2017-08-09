import xs from 'xstream';
import delay from 'xstream/extra/delay';

import {html} from 'snabbdom-jsx';

export function MainMenu(sources) {

	const {DOM} = sources;
	const props$ = sources.storage.local.getItem('save').take(1).map(save => 
		Object.assign({
			round: null
		}, JSON.parse(save))
	);

	const action$ = xs.merge(
		DOM.select('.js-new-game').events('click').mapTo({type: "newGame"}),
		DOM.select('.js-resume-game').events('click').mapTo({type: "loadGame"}),
	);

	const routerSink$ = action$.map(action => "/redirect").compose(delay(1));

	const resetSave$ = action$.filter(action => action.type === "newGame").mapTo({key: 'save', value: null});

	const DOMSink$ = props$.map(props =>
		<div className="menu-principal">
			<h1>Menu Principal</h1>
			<button className="js-new-game button-3d">NEW GAME</button>
			{props.round !== null ? <button className="js-resume-game button-3d">RESUME GAME<br/>Round {props.round + 1}</button> : ""}
		</div>
	);

    const sinks = {
		DOM: DOMSink$,
		router: routerSink$,
		storage: resetSave$,
	};

	return sinks;
}