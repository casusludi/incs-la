import xs from 'xstream';

import {html} from 'snabbdom-jsx';

export function MainMenu(sources) {

	const {DOM} = sources;
	const props = Object.assign({
		round: null
	}, sources.props);

	const action$ = xs.merge(
		DOM.select('.js-new-game').events('click').mapTo({type: "newGame"}),
		DOM.select('.js-resume-game').events('click').mapTo({type: "loadGame"}),
	);

	const routerSink$ = action$.map(action => {
		switch(action.type) {
			case "newGame":
				return { pathname: "/cutscene", type: 'push', state: { props: {
					cutsceneName: "intro",
					redirect: "/game",
				}}};
			case "loadGame":
				return { pathname: "/game", type: 'push', state: { props }};
		};
	});

	const DOMSink$ = xs.of(
		<div className="menu-principal">
			<h1>Menu Principal</h1>
			<button className="js-new-game button-3d">NEW GAME</button>
			{props.round !== null ? <button className="js-resume-game button-3d">RESUME GAME<br/>Round {props.round + 1}</button> : ""}
		</div>
	);

    const sinks = {
		DOM: DOMSink$,
		router: routerSink$,
	};

	return sinks;
}