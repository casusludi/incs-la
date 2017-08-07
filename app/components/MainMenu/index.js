import xs from 'xstream';

import {html} from 'snabbdom-jsx';

export function MainMenu(sources) {

	const {DOM} = sources;
	const save = sources.save ? sources.save : {};

	const action$ = xs.merge(
		DOM.select('.js-new-game').events('click').mapTo({type: "newGame"}),
		DOM.select('.js-resume-game').events('click').mapTo({type: "loadGame"}),
	);

	const routerSink$ = action$.map(action => {
		switch(action.type) {
			case "newGame":
				return { pathname: "/cutscene", type: 'push', state: { props: {
					cutsceneName: "intro",
					redirect: { pathname: "/game", type: 'push', state: { round: 0 }}
				}}};
				// return "/intro";
			case "loadGame":
				return { pathname: "/game", type: 'push', state: { save }};
		};
	});

	const DOMSink$ = xs.of(
		<div className="menu-principal">
			<h1>Menu Principal</h1>
			<button className="js-new-game button-3d">NEW GAME</button>
			{save.round + 1 ? <button className="js-resume-game button-3d">RESUME GAME<br/>Round {save.round + 1}</button> : ""}
		</div>
	);


    const sinks = {
		DOM: DOMSink$,
		router: routerSink$,
	};

	return sinks;
}