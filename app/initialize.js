import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import {makeRouterDriver} from 'cyclic-router'
import {makeScenarioGeneratorDriver} from './drivers/scenarioGeneratorDriver';
import {makeWindowResizeDriver} from './drivers/windowResizeDriver';
import {makeRandomDriver} from './drivers/randomDriver';

import xs from 'xstream';

import switchPath from 'switch-path';

import {createBrowserHistory} from 'history';

import {IntroGame} from './components/IntroGame';
import {MainGame} from './components/MainGame';
import {EndGame} from './components/EndGame';
import {NotFound} from './components/NotFound';

import {JSONReader} from './components/JSONReader';
import {ScenarioGenerator} from './components/ScenarioGenerator';

function main(sources) {

	const HTTP = sources.HTTP;
	const random$ = sources.random;

	// JSON management
	const jsonSinks = JSONReader({HTTP});
	const jsonRequest$ = jsonSinks.request;
	const jsonResponse$ = jsonSinks.JSON;

	const {datas$, randomRequests$} = ScenarioGenerator({jsonResponse$, random$})

	const match$ = sources.router.define({
		'*': NotFound,
		'/': IntroGame,
		'/game': MainGame,
		'/end': EndGame,
	});
	
	const page$ = match$.map(({path, value, location, createHref}) =>
		value(Object.assign(
				{}, 
				sources,
				location.state,
				{datas$: datas$},
				{router: sources.router.path(path)}
		))
	);

	const sinks = {
		DOM: page$.map(c => c.DOM).flatten(),
		router: page$.map(c => c.router).flatten(),
		HTTP: jsonRequest$,
		scenarioGenerator: jsonResponse$,
		random: randomRequests$,
	};
	
	return sinks;
}

const drivers = {
	DOM: makeDOMDriver('#app'),
	HTTP: makeHTTPDriver(),
	router: makeRouterDriver(createBrowserHistory(), switchPath),
	scenarioGenerator: makeScenarioGeneratorDriver(),
	windowResize: makeWindowResizeDriver(),
	random: makeRandomDriver(),
};  

run(main, drivers);