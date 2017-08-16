import {run} from '@cycle/run';

import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import storageDriver from '@cycle/storage';
import {makeRouterDriver} from 'cyclic-router'
import {makeWindowResizeDriver} from './drivers/windowResizeDriver';
import {randomDriver} from './drivers/randomDriver';

import xs from 'xstream';

import switchPath from 'switch-path';

import {createBrowserHistory} from 'history';

import {MainMenu} from './components/MainMenu';
import {Cutscene} from './components/Cutscene';
import {Redirect} from './components/Redirect';
import {MainGame} from './components/MainGame';
import {EndGame} from './components/EndGame';
// import {NotFound} from './components/NotFound';

import {JSONReader} from './components/JSONReader';

function main(sources) {

	const HTTP = sources.HTTP;

	// Lit le .json de données pour l'envoyer aux différent(e)s composants/pages
	const dataJsonSinks = JSONReader({HTTP, jsonPath$: xs.of("/data.json")});
	const dataJsonRequest$ = dataJsonSinks.request;
	const dataJsonResponse$ = dataJsonSinks.JSON;
	
	// Définie les routes associées à chaque composant
	const match$ = sources.router.define({
		// '*': NotFound,
		'/': MainMenu,
		'/cutscene': Cutscene,
		'/redirect': Redirect,
		'/game': MainGame,
		'/end': EndGame,
	});
	

	// Définie les sources à envoyer à chaque page
	const page$ = match$.map(({path, value, location, createHref}) =>
		value(Object.assign(
				{}, 
				sources,
				location.state, // Permet de transmettre des données entre pages
				{datas$: dataJsonResponse$}, // .json de données fixes
				{router: sources.router.path(path)}
		))
	);

	// Factorise l'expression permettant de récupérer les sinks des pages
	const getPageSink = (stream$, sinkName) => stream$.filter(s => s[sinkName]).map(s => s[sinkName]).flatten();

	const sinks = {
		DOM: getPageSink(page$, 'DOM'),
		router: getPageSink(page$, 'router'),
		random: getPageSink(page$, 'random'),
		storage: getPageSink(page$, 'storage'),
		HTTP: xs.merge(
			dataJsonRequest$,
			getPageSink(page$, 'HTTP'),
		),
	};
	
	return sinks;
}

const drivers = {
	DOM: makeDOMDriver('#app'),
	HTTP: makeHTTPDriver(),
	router: makeRouterDriver(createBrowserHistory(), switchPath),
	windowResize: makeWindowResizeDriver(),
	random: randomDriver,
	storage: storageDriver,
};  

run(main, drivers);