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

	const pathPresets$ = xs.merge(
		xs.of({id: "selectedLocationsIndexes", val: [18, 12, 2, 23, 9, 4, 20, 16, 5]}),
		xs.of({id: {locationId: "nantes", type: "witnesses"}, val: [1, 0]}),
		xs.of({id: {locationId: "nantes", type: "data"}, val: 1}),
		xs.of({id: {locationId: "port-saint-pere", type: "witnesses"}, val: [1, 0]}),
		xs.of({id: {locationId: "port-saint-pere", type: "data"}, val: 0}),
		xs.of({id: {locationId: "guerande", type: "witnesses"}, val: [0, 1]}),
		xs.of({id: {locationId: "guerande", type: "data"}, val: 0}),
		xs.of({id: {locationId: "vallet", type: "witnesses"}, val: [0, 1]}),
		xs.of({id: {locationId: "vallet", type: "data"}, val: 0}),
		xs.of({id: {locationId: "haute-goulaine", type: "witnesses"}, val: [0, 1]}),
		xs.of({id: {locationId: "haute-goulaine", type: "data"}, val: 0}),
		xs.of({id: {locationId: "pornic", type: "witnesses"}, val: [0, 1]}),
		xs.of({id: {locationId: "pornic", type: "data"}, val: 0}),
		xs.of({id: {locationId: "prefailles", type: "witnesses"}, val: [1, 0]}),
		xs.of({id: {locationId: "prefailles", type: "data"}, val: 0}),
		xs.of({id: {locationId: "ancenis", type: "witnesses"}, val: [1, 0]}),
		xs.of({id: {locationId: "ancenis", type: "data"}, val: 0}),
		xs.of({id: {locationId: "coueron", type: "witnesses"}, val: [1, 0]}),
		xs.of({id: {locationId: "coueron", type: "data"}, val: 1}),
		xs.of({id: {locationId: "gorges", type: "witnesses"}, val: [0, 1]}),
		xs.of({id: {locationId: "gorges", type: "data"}, val: 0}),
	);

	const {datas$, randomRequests$} = ScenarioGenerator({jsonResponse$, selectedValue$: pathPresets$/* OR random$ */})

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