import {run} from '@cycle/run';

import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import {makeRouterDriver} from 'cyclic-router'
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

function main(sources) {

	const HTTP = sources.HTTP;

	// JSON management
	const dataJsonSinks = JSONReader({HTTP, jsonPath$: xs.of("/data.json")});
	const dataJsonRequest$ = dataJsonSinks.request;
	const dataJsonResponse$ = dataJsonSinks.JSON;
	
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
				{datas$: dataJsonResponse$},
				{router: sources.router.path(path)}
		))
	);

	const sinks = {
		DOM: page$.map(c => c.DOM).flatten(),
		router: page$.map(c => c.router).flatten(),
		HTTP: xs.merge(
			dataJsonRequest$,
			page$.filter(c => c.HTTP).map(c => c.HTTP).flatten(),
		),
		random: page$.filter(c => c.random).map(c => c.random).flatten(),
	};
	
	return sinks;
}

const drivers = {
	DOM: makeDOMDriver('#app'),
	HTTP: makeHTTPDriver(),
	router: makeRouterDriver(createBrowserHistory(), switchPath),
	windowResize: makeWindowResizeDriver(),
	random: makeRandomDriver(),
};  

run(main, drivers);