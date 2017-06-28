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

function view(value$, elapsedTime){
    const success = elapsedTime.remainingTime.raw > 0;

    const vdom$ = value$.map(value => (
        <div classNames="content end" style={{ backgroundImage: "url("+ (success ? value.settings.images.endWin : value.settings.images.endLoose) +")" }} >
            <div className="modal">
                {success ? 
                    <div classNames="panel final-panel">
                        {value.texts.win}
                        {/*elapsedTime.remainingTime.formatted*/}
                    </div> :
                    <div classNames="panel final-panel">
                        {value.texts.loose}
                    </div>
                }
                <a className="button-3d">Rejouer</a>
            </div>
        </div>
	));

    return vdom$;
}

function _EndGame(sources) {
	const {HTTP, DOM, elapsedTime} = sources;

	// JSON management
	const jsonSinks = JSONReader({HTTP});
	const jsonRequest$ = jsonSinks.request;
	const jsonResponse$ = jsonSinks.JSON;

    const action$ = intent(DOM);
    const vdom$ = view(jsonResponse$, elapsedTime);

    const sinks = {
        DOM: vdom$,
		HTTP: jsonRequest$,
		router: action$.mapTo("/"),
    };

    return sinks;
}

export function EndGame(sources){ return isolate(_EndGame)(sources) };
