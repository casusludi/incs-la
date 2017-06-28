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
  const {HTTP, DOM} = sources;

  // JSON management
  const jsonSinks = JSONReader({HTTP});
  const jsonRequest$ = jsonSinks.request;
  const jsonResponse$ = jsonSinks.JSON;

  const settings$ = jsonResponse$.map(jsonResponse => jsonResponse.settings);
  const texts$ = jsonResponse$.map(jsonResponse => jsonResponse.texts);
  const path$ = jsonResponse$.map(jsonResponse => jsonResponse.path);
  const locations$ = jsonResponse$.map( jsonResponse => jsonResponse.locations);

  const pathInit$ = xs.combine(path$, locations$).map(([path, locations]) =>
    Object.assign({}, locations[path[0].location], {id: path[0].location})
  );

  // Locations management
  const changeLocationProxy$ = xs.create();

  const currentLocation$ = xs.merge(
    changeLocationProxy$,
    pathInit$,
  ).remember();

  const lastLocation$ = currentLocation$.compose(pairwise).map(item => item[0]).startWith("");

  const nextCorrectLocationProxy$ = xs.create();

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

  const nextCorrectLocation$ = xs.combine(path$, progressionProxy$).map(([path, progression]) =>
    ({id: path.length > progression + 1 ? path[progression + 1].location : null})
  ).remember();

  nextCorrectLocationProxy$.imitate(nextCorrectLocation$.compose(dropRepeats()));

  const correctNextChoosenCity$ = xs.combine(currentLocation$, nextCorrectLocation$)
  .filter(([currentLocation, nextCorrectLocation]) =>
    currentLocation.id === nextCorrectLocation.id
  );

  const progression$ = correctNextChoosenCity$.mapTo(1).fold((acc, x) => acc + x, 0);
  
  // Map
  const mapSinks = Map({DOM, progression$, path$, currentLocation$, settings$, locations$, currentLinksValues$});

  const changeLocation$ = xs.merge(
    currentLocationLinks$.map( 
        links => xs.merge(...links.map(link => link.changeLocation$))
    ).flatten(),
    mapSinks.changeLocation$,
  );

  changeLocationProxy$.imitate(changeLocation$);

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

  const showDestinationLinks$ = xs.merge(
    witnessQuestionned$.mapTo(true),
    changeLocation$.mapTo(false),
  ).startWith(false);

  // Time management
  const timeManagerSinks = TimeManager({DOM, settings: settings$, changeLocation: changeLocation$, witnessQuestionned: witnessQuestionned$});
  const elapsedTime$ = timeManagerSinks.elapsedTime$;

  // End game reached ?
  const lastLocationReached$ = xs.combine(path$, progression$)
  .filter(([path, progression]) =>
    progression === (path.length - 1)
  ).mapTo(true);

  const noTimeRemaining$ = timeManagerSinks.elapsedTime$.filter(elapsedTime =>
    elapsedTime.remainingTime.raw <= 0
  ).mapTo(true);

  const endGame$ = xs.merge(lastLocationReached$, noTimeRemaining$);

  // View
  const witnessesVTree$ = witnesses$.map(witnesses =>
    xs.combine(...witnesses.map(witness => witness.DOM))
  ).flatten();
  const linksVTree$ = currentLocationLinks$.map(links => xs.combine(...links.map(link => link.DOM))).flatten();
  const TimeManagerVTree$ = timeManagerSinks.DOM;
  const mapVTree$ = mapSinks.DOM;


  const DOMSink$ = xs.combine(linksVTree$, currentLocation$, witnessesVTree$, progression$, TimeManagerVTree$, mapVTree$, texts$, showDestinationLinks$).map(
      ([linksVTree, currentLocation, witnessesVTree, progression, TimeManagerVTree, mapVTree, texts, showDestinationLinks]) =>
        <section className="main">
	        <section className="main-content" >
            <section className="city" style={{backgroundImage: "url("+currentLocation.image+")"}} >
              <section className="city-content">
                <section className="col-main">
                  <header className="header">
                    <h1>{currentLocation.name}</h1>
                    {mapVTree}
                  </header>
                  <section className="place-list" >
                    {witnessesVTree}
                  </section>
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
                  {showDestinationLinks ?
                    <div className="travel-panel-content">
                      <div className="travel-label">{texts.travelLabel}</div>
                      <nav>
                        {linksVTree}
                      </nav>
                    </div> :
                    <div className="travel-panel-content">
                      {texts.travelDescription}
                    </div>
                  }
                </div>
              </footer>
            </section>
          </section>
        </section>
      );

  const sinks = {
    DOM: DOMSink$,
    HTTP: jsonRequest$,
    router: xs.combine(elapsedTime$, endGame$).map(([elapsedTime, endGame]) =>
      ({ pathname: "/end", type: 'push', state: { elapsedTime }})
    ),
  };
  return sinks;
}

export function MainGame(sources){ return isolate(_MainGame)(sources) };