import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import {makeRouterDriver} from 'cyclic-router'
import {MakeScenarioGeneratorDriver} from './drivers/ScenarioGeneratorDriver';

import xs from 'xstream';

import switchPath from 'switch-path';

import {createBrowserHistory} from 'history';

import {IntroGame} from './components/IntroGame';
import {MainGame} from './components/MainGame';
import {EndGame} from './components/EndGame';
import {NotFound} from './components/NotFound';

function main(sources) {

  const {HTTP, DOM} = sources;

	// JSON management
	// const jsonSinks = JSONReader({HTTP});
	// const jsonRequest$ = jsonSinks.request;
	// const jsonResponse$ = jsonSinks.JSON;

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
        {router: sources.router.path(path)}
    ))
  );

  const sinks = {
    DOM: page$.map(c => c.DOM).flatten(),
    router: page$.map(c => c.router).flatten(),
    HTTP: page$.filter(c => c.HTTP).map(c => c.HTTP).flatten(),
    scenarioGenerator: page$.filter(c => c.scenarioGenerator).map(c => c.scenarioGenerator).flatten(),
  };
  
  return sinks;
}

const drivers = {
  DOM: makeDOMDriver('#app'),
  HTTP: makeHTTPDriver(),
  router: makeRouterDriver(createBrowserHistory(), switchPath),
  scenarioGenerator: MakeScenarioGeneratorDriver(),
};  

run(main, drivers);