import xs from 'xstream';

import { html } from 'snabbdom-jsx';

function intent(DOM){
    const click$ = xs.merge(
		DOM.select('.startGame').events('click').mapTo({type: "startGame"}),
		DOM.select('.content').events('click').mapTo({type: "nextSlide"}),
	);

    return click$;
}

function model(action$, datas$){
	const slideIndex$ = action$.filter(action => action.type === "nextSlide").fold((acc, x) => acc + 1, 0);
	
	const state$ = xs.combine(slideIndex$, datas$).map(([slideIndex, datas]) => ({
		image: datas.settings.images.intro[slideIndex >= datas.settings.images.intro.length ? datas.settings.images.intro.length - 1 : slideIndex],
		ready: slideIndex >= datas.settings.images.intro.length - 1,
	}));

	return state$;
}

function view(state$, datas$){
    const vdom$ = xs.combine(state$, datas$).map(([state, datas]) =>
		<div classNames="content intro" style={{backgroundImage: "url("+ state.image +")"}} >
			{state.ready ?
			<div className="modal">
				<div className="panel">
					{datas.texts.intro}
				</div>
				<a classNames="startGame button-3d">{datas.texts.play}</a>
			</div> :
			""}
		</div>
	);

    return vdom$;
}

export function IntroGame(sources) {
	const {DOM, datas$} = sources;

    const action$ = intent(DOM);
    const state$ = model(action$, datas$);
    const vdom$ = view(state$, datas$);

    const sinks = {
        DOM: vdom$,
		router: action$.filter(action => action.type === "startGame").mapTo(
			{ pathname: "/game", type: 'push', state: { round: 0 }}
		),
    };

    return sinks;
}