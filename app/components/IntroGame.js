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

function model(action$, jsonResponse$){
	const index$ = action$.filter(action => action.type === "nextSlide").fold((acc, x) => acc + 1, 0);
	
	const value$ = xs.combine(index$, jsonResponse$).map(([index, jsonResponse]) => ({
		image: jsonResponse.settings.images.intro[index >= jsonResponse.settings.images.intro.length ? jsonResponse.settings.images.intro.length - 1 : index],
		ready: index >= jsonResponse.settings.images.intro.length - 1,
	}));

	return value$;
}

function view(value$, jsonResponse$){
    const vdom$ = xs.combine(value$, jsonResponse$).map(([value, jsonResponse]) =>
		<div classNames="content intro" style={{backgroundImage: "url("+ value.image +")"}} >
			{value.ready ?
			<div className="modal">
				<div className="panel">
					{jsonResponse.texts.intro}
				</div>
				<a classNames="startGame button-3d">{jsonResponse.texts.play}</a>
			</div> :
			""}
		</div>
	);

    return vdom$;
}

export function IntroGame(sources) {
	const {HTTP, DOM} = sources;

	// JSON management
	const jsonSinks = JSONReader({HTTP});
	const jsonRequest$ = jsonSinks.request;
	const jsonResponse$ = jsonSinks.JSON;

    const action$ = intent(DOM);
    const value$ = model(action$, jsonResponse$);
    const vdom$ = view(value$, jsonResponse$);

    const sinks = {
        DOM: vdom$,
		HTTP: jsonRequest$,
		router: action$.filter(action => action.type === "startGame").mapTo("/game"),
    };

    return sinks;
}