import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import {makeRouterDriver} from 'cyclic-router'

import xs from 'xstream';

import switchPath from 'switch-path';

import {createBrowserHistory} from 'history';

import {MainGame} from './components/MainGame';
import {EndGame} from './components/EndGame';
import {NotFound} from './components/NotFound';

function main(sources) {

  const {HTTP, DOM} = sources;

  const match$ = sources.router.define({
    '/game': MainGame,
    '/end': EndGame,
    // '*': NotFound,
  });
  
  const page$ = match$.map(({path, value}) =>
    value(Object.assign(
      {}, 
      sources,
      {router: sources.router.path(path)}
    ))
  );

  const sinks = {
    DOM: page$.map(c => c.DOM).flatten(),
    router: page$.map(c => c.router).flatten().startWith('/game'),
    HTTP: page$.map(c => c.HTTP).flatten(),
  };
  
  return sinks;
}

const drivers = {
  DOM: makeDOMDriver('#app'),
  HTTP: makeHTTPDriver(),
  router: makeRouterDriver(createBrowserHistory(), switchPath),
};  

run(main, drivers);