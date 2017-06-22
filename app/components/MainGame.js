import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import {makeRouterDriver} from 'cyclic-router'
import isolate from '@cycle/isolate';

import xs from 'xstream';
import fromDiagram from 'xstream/extra/fromDiagram'
import dropRepeats from 'xstream/extra/dropRepeats'
import delay from 'xstream/extra/delay'
import pairwise from 'xstream/extra/pairwise'

import * as _ from 'lodash';

import {html} from 'snabbdom-jsx';

import switchPath from 'switch-path';

import {Investigate} from './Investigate';
import {ChangeLocation} from './ChangeLocation';
import {Witness} from './Witness';
import {JSONReader} from './JSONReader';
import {TimeManager} from './TimeManager';
import {Map} from './Map';

function _MainGame(sources) {

  // console.log(sources.router);

  const {HTTP, DOM} = sources;

  // JSON management
  const jsonSinks = JSONReader({HTTP});
  const jsonRequest$ = jsonSinks.request;
  const jsonResponse$ = jsonSinks.JSON;

  const settings$ = jsonResponse$.map(jsonResponse => jsonResponse.settings);
  const texts$ = jsonResponse$.map(jsonResponse => jsonResponse.texts);
  const path$ = jsonResponse$.map(jsonResponse => jsonResponse.path);
  const locations$ = jsonResponse$.map( jsonResponse => jsonResponse.locations);

  // Locations management
  const changeLocationProxy$ = xs.create();

  const currentLocation$ = changeLocationProxy$.remember();

  const lastLocation$ = currentLocation$.compose(pairwise).map(item => item[0]).startWith("");

  const nextCorrectLocationProxy$ = xs.create();

  const pathInit$ = xs.combine(path$, locations$).map(([path, locations]) =>
    Object.assign({}, locations[path[0].location], {id: path[0].location})
  );

  const currentLocationLinks$ = xs.combine(nextCorrectLocationProxy$, currentLocation$, lastLocation$, locations$)
  .map(([nextCorrectLocation, currentLocation, lastLocation, locations, path]) => {
      const links = _.chain(currentLocation.links || [])
        .concat(lastLocation ? [lastLocation.id] : [])
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

  const currentLinksValues$ = currentLocationLinks$.map( 
      links => xs.combine(...links.map(link => link.linkValue$))
  )
  .flatten();

  // Progression management
  const progressionProxy$ = xs.create();

  // Map
  const mapProps$ = xs.combine(currentLocation$, settings$, locations$, currentLinksValues$, progressionProxy$, path$);
  const mapSinks = Map({DOM, props$: mapProps$});
  //////////

  const changeLocation$ = xs.merge(
    currentLocationLinks$.map( 
        links => xs.merge(...links.map(link => link.changeLocation$))
    ).startWith(pathInit$)
    .flatten(),
    mapSinks.changeLocation$,
  );

  changeLocationProxy$.imitate(changeLocation$);

  const nextCorrectLocation$ = xs.combine(path$, progressionProxy$).map(([path, progression]) =>
    ({id: path.length > progression + 1 ? path[progression + 1].location : null})
  ).remember();

  nextCorrectLocationProxy$.imitate(nextCorrectLocation$.compose(dropRepeats()));

  const correctNextChoosenCity$ = xs.combine(currentLocation$, nextCorrectLocation$)
  .filter(([currentLocation, nextCorrectLocation]) =>
    currentLocation.id === nextCorrectLocation.id
  );

  const progression$ = correctNextChoosenCity$.mapTo(1).fold((acc, x) => acc + x, 0);

  progressionProxy$.imitate(xs.merge(progression$, xs.of(0)));

  // Witness management
  const witnessesData$ = currentLocation$.map(currentLocation => currentLocation.places);

  const witnesses$ = xs.combine(witnessesData$, path$, currentLocation$, progression$)
  .map(([witnessesData, path, currentLocation, progression]) => 
    Object.keys(witnessesData).map((key, value) =>
      isolate(Witness,key)({
        DOM: sources.DOM, 
        props$: xs.of(Object.assign(
          {}, 
          witnessesData[key], 
          path[progression].location === currentLocation.id ? 
            {clue: path[progression].clues[key]} : 
            {},
        )),
      })
    )
  );

  const witnessQuestionned$ = witnesses$.map(witnesses =>
    xs.merge(...witnesses.map(witness => witness.questionned$))
  ).flatten();

  // Time management
  const timeManagerSinks = TimeManager({DOM, settings: settings$, changeLocation: changeLocation$, witnessQuestionned: witnessQuestionned$});

  // End game reached ?
  const lastLocationReached$ = xs.combine(path$, progression$)
  .filter(([path, progression]) =>
    progression === (path.length - 1)
  ).mapTo(true);

  // View
  const witnessesVTree$ = witnesses$.map(witnesses =>
    xs.combine(...witnesses.map(witness => witness.DOM))
  ).flatten();
  const linksVTree$ = currentLocationLinks$.map(links => xs.combine(...links.map(link => link.DOM))).flatten();
  const TimeManagerVTree$ = timeManagerSinks.DOM;
  const mapVTree$ = mapSinks.DOM;

  const DOMSink$ = xs.combine(linksVTree$, currentLocation$, witnessesVTree$, progression$, TimeManagerVTree$, mapVTree$, texts$, witnessQuestionned$.startWith(false)).map(
      ([linksVTree, currentLocation, witnessesVTree, progression, TimeManagerVTree, mapVTree, texts, witnessQuestionned]) =>
        <section className="city" style={{backgroundImage: "url("+currentLocation.image+")"}} >
          <section className="col-main">
            <header>
              <h1>{currentLocation.name}</h1>
            </header>
            <section className="place-list" >
              {witnessesVTree}
            </section>
            <aside className="aside">
              <div classNames="city-desc scrollable-panel panel">
                {currentLocation.desc}
              </div>
              <div classNames="panel scrollable-panel">
                {texts.gameDescription}
              </div>
              <div classNames="game-time panel red-panel">
                {TimeManagerVTree}
              </div>
            </aside>
          </section>
          <footer>
            <div className="travel-panel">
              {witnessQuestionned ?
                <div>
                  <div className="travel-labem">{texts.travelLabel}</div>
                  <nav>
                    {linksVTree}
                  </nav>
                </div> :
                <div>
                  {texts.travelDescription}
                </div>
              }
            </div>
          </footer>
          {mapVTree}
        </section>
      );

  const sinks = {
    DOM: DOMSink$,
    HTTP: jsonRequest$,
    router: lastLocationReached$.mapTo("/end"), // lastLocationReached$.mapTo({ pathname: "/end", state: { elapsedTime: timeManagerSinks.elapsedTime} })
  };
  return sinks;
}

export function MainGame(sources){ return isolate(_MainGame)(sources) };