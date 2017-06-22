import xs from 'xstream';
import { run } from '@cycle/run';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

import * as _ from 'lodash';

import {JSONReader} from './JSONReader';

function intent(DOM){
    const click$ = DOM
        .select('.button-3d')
        .events('click');

    return click$;
}

function view(value$){
    const vdom$ = value$.map(value => (
		<div classNames="content intro" style={{backgroundImage: "url("+value.settings.images.intro+")"}} >
			<div className="modal">
				<div className="panel">
					{value.texts.intro}
				</div>
				<a className="button-3d">{value.texts.play}</a>
			</div>
		</div>
	));

    return vdom$;
}

function _IntroGame(sources) {
	const {HTTP, DOM} = sources;

	// JSON management
	const jsonSinks = JSONReader({HTTP});
	const jsonRequest$ = jsonSinks.request;
	const jsonResponse$ = jsonSinks.JSON;

    const action$ = intent(DOM);
    const vdom$ = view(jsonResponse$);

    const sinks = {
        DOM: vdom$,
		HTTP: jsonRequest$,
		router: action$.mapTo("/game"),
    };

    return sinks;
}

export function IntroGame(sources){ return isolate(_IntroGame)(sources) };