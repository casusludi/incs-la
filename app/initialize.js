import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import Collection from '@cycle/collection';
import onionify from 'cycle-onionify';

import xs from 'xstream';
import fromDiagram from 'xstream/extra/fromDiagram'
import dropRepeats from 'xstream/extra/dropRepeats'
import delay from 'xstream/extra/delay'
import pairwise from 'xstream/extra/pairwise'

import * as _ from 'lodash';

import {html} from 'snabbdom-jsx';

import {Investigate} from './components/Investigate.js';
import {ChangeLocation} from './components/ChangeLocation.js';
import {Witness} from './components/Witness.js';
import {JSONReader} from './components/JSONReader.js';
import {TimeManager} from './components/TimeManager.js';

function main(sources) {

  const {HTTP,DOM} = sources;

  const jsonSinks = JSONReader({HTTP: sources.HTTP});
  const jsonRequest$ = jsonSinks.request;
  const jsonResponse$ = jsonSinks.JSON;

  const locations$ = jsonResponse$.map( jsonResponse => jsonResponse.locations);
  const path$ = jsonResponse$.map(jsonResponse => jsonResponse.path);
  const settings$ = jsonResponse$.map(jsonResponse => jsonResponse.setting);

  const changeLocationProxy$ = xs.create();

  const currentLocation$ = xs.combine(locations$, changeLocationProxy$).map(([locations, changeLocation]) =>
    Object.assign({}, locations[changeLocation.id], changeLocation)
  );

  const lastLocation$ = currentLocation$.compose(pairwise).map(item => item[0]).startWith("");

  const nextCorrectLocationProxy$ = xs.create();

  const pathInit$ = path$.map(path => ({id: path[0].location}));

  const currentLocationLinks$ = xs.combine(nextCorrectLocationProxy$, currentLocation$, lastLocation$, locations$).map(([nextCorrectLocation, currentLocation, lastLocation, locations, path]) => {
      const links = _.chain(currentLocation.links || [])
        .concat(lastLocation ? [lastLocation.id] : [])
        .concat(nextCorrectLocation ? [nextCorrectLocation.id] : [])
        .uniq()
        .filter((o) => o !== currentLocation.id)
        .shuffle()
        .value();

      return links.map(link =>
        ChangeLocation({
          DOM, 
          props$: xs.of(
            Object.assign({}, locations[link], {id: link})
          )
        })
      );
    }
  );

  const changeLocation$ = currentLocationLinks$.map( 
      links => xs.merge(...links.map(link => link.value$))
  )
  .startWith(pathInit$)
  .flatten();

  changeLocationProxy$.imitate(changeLocation$);

  const linksVtree$ = currentLocationLinks$.map(links => xs.combine(...links.map(link => link.DOM))).flatten();

  // Progression management
  const progressionProxy$ = xs.create();

  const nextCorrectLocation$ = xs.combine(path$, progressionProxy$).map(([path, progression]) =>
    ({id: path.length > progression + 1 ? path[progression + 1].location : null})
  ).remember();

  nextCorrectLocationProxy$.imitate(nextCorrectLocation$.compose(dropRepeats()));

  const progression$ = xs.combine(currentLocation$, nextCorrectLocation$).filter(([currentLocation, nextCorrectLocation]) => {
    // console.log("currentLocation", currentLocation.id);
    // console.log("nextCorrectLocation", nextCorrectLocation.id);
    return currentLocation.id === nextCorrectLocation.id
  }).mapTo(1)
  .fold((acc, x) => acc + x, 0);

  progressionProxy$.imitate(xs.merge(progression$, xs.of(0)));

  // Witness management
  const witnessesData$ = currentLocation$.map(currentLocation => currentLocation.places);

  const witnesses$ = xs.combine(witnessesData$, path$, currentLocation$, progression$).map(([witnessesData, path, currentLocation, progression]) =>
    Object.keys(witnessesData).map((key, value) =>
      Witness({
        DOM: sources.DOM, 
        props$: xs.of(Object.assign({}, witnessesData[key], path[progression].location === currentLocation.id ? {clue: path[progression].clues[key]} : {})),
      })
    )
  );

  const witnessQuestionned$ = witnesses$.map(witnesses =>
    xs.merge(...witnesses.map(witness => witness.questionned$))
  ).flatten();

  const witnessesVTree$ = witnesses$.map(witnesses =>
    xs.combine(...witnesses.map(witness => witness.DOM))
  ).flatten();

  // Time management
  const TimeManagerSink = TimeManager({DOM, settings: settings$, changeLocation: changeLocation$, witnessQuestionned: witnessQuestionned$});
  const TimeManagerVTree$ = TimeManagerSink.DOM;

  const DOMSink$ = xs.combine(linksVtree$, changeLocation$, witnessesVTree$, progression$, TimeManagerVTree$).map(
      ([linksVtree, changeLocation, witnessesVTree, progression, TimeManagerVTree]) =>
        <div>
          <h1>Progression : {progression}</h1>
          <h2>Elapsed time : {TimeManagerVTree}</h2>
          <div>
            {witnessesVTree}
          </div>
          <footer>
            <div class="travel-panel">
              <p>
                {changeLocation.name ? 'Current : ' + changeLocation.name : ''}
              </p>
              <h1></h1>
              <div selector=".items">
                {linksVtree}
              </div>
            </div>
          </footer>
        </div>
    );

  const sinks = {
    DOM: DOMSink$,
    HTTP: jsonRequest$,
  };
  return sinks;
}

const drivers = {
  DOM: makeDOMDriver('#app'),
  HTTP: makeHTTPDriver(),
};

const wrappedMain = onionify(main);

run(wrappedMain, drivers);