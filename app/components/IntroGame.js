import xs from 'xstream';
import { run } from '@cycle/run';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

import * as _ from 'lodash';

import {JSONReader} from './JSONReader';

function intent(DOM){
    const click$ = xs.merge(
		DOM.select('.startGame').events('click').mapTo({type: "startGame"}),
		DOM.select('.content').events('click').mapTo({type: "nextSlide"}),
	);

    return click$;
}

function model(action$, datas$){
	const index$ = action$.filter(action => action.type === "nextSlide").fold((acc, x) => acc + 1, 0);
	
	const value$ = xs.combine(index$, datas$).map(([index, datas]) => ({
		image: datas.settings.images.intro[index >= datas.settings.images.intro.length ? datas.settings.images.intro.length - 1 : index],
		ready: index >= datas.settings.images.intro.length - 1,
	}));

	return value$;
}

function view(value$, datas$){
    const vdom$ = xs.combine(value$, datas$).map(([value, datas]) =>
		<div classNames="content intro" style={{backgroundImage: "url("+ value.image +")"}} >
			{value.ready ?
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
	const {DOM} = sources;

	const datas$ = sources.scenarioGenerator;

    const action$ = intent(DOM);
    const value$ = model(action$, datas$);
    const vdom$ = view(value$, datas$);

    const sinks = {
        DOM: vdom$,
		router: action$.filter(action => action.type === "startGame").mapTo("/game"),
    };

    return sinks;
}