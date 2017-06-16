import xs from 'xstream';
import {run} from '@cycle/xstream-run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import Collection from '@cycle/collection';
import dropRepeats from 'xstream/extra/dropRepeats'
import delay from 'xstream/extra/delay'
import {html} from 'snabbdom-jsx';
import {Investigate} from './components/Investigate.js'; 
import {ChangeLocation} from './components/ChangeLocation.js'; 
import {JSONReader} from './components/JSONReader.js';

function main(sources) {

  const jsonSinks = JSONReader({HTTP: sources.HTTP});
  const jsonRequest$ = jsonSinks.request;
  const jsonResponse$ = jsonSinks.JSON;

  /////////////////////////////
  // OLD (use of Collection) //
  /////////////////////////////
  /* 
  const proxyChangeLocation$ = xs.create(); 
  
  // const locationLinks$ = proxyChangeLocation$.map(currentLocation =>
  //     jsonResponse$.map(jsonResponse =>
  //         jsonResponse.locations[currentLocation].links.map(link => ({
  //             newLocation$: xs.of(link),
  //         }))
  //     )
  // ).flatten();
  
  const add$ = jsonResponse$.map(jsonResponse =>
      proxyChangeLocation$.map(currentLocation =>
          jsonResponse.locations[currentLocation].links.map(link => ({
              newLocation$: xs.of(link),
          }))
      )
  ).flatten();

  const progression$ = add$.mapTo(1).fold((acc, x) => acc + x, 0);

  const locations$ = Collection(
    ChangeLocation,
    {DOM: sources.DOM, destroy$: proxyChangeLocation$.mapTo(null)},
    add$.compose(delay(1)),
    item => item.destroy$
  );

  const locationsVTree$ = Collection.pluck(locations$, item => item.DOM);
  const newLocationInfo$ = Collection.merge(locations$, item => item.newLocation$);

  const changeLocation$ = xs.merge(
    xs.of('la-baule'),
    newLocationInfo$,
  );

  const currentLocation$ = changeLocation$.remember();

  // proxyChangeLocation$.imitate(newLocationInfo$.compose(dropRepeats));

  // const currentLocation$ = newLocationInfo$
  //   .startWith('la-baule');
    
  proxyChangeLocation$.imitate(currentLocation$.compose(dropRepeats()));

  const DOMSink$ = xs.combine(currentLocation$, progression$, locationsVTree$).map(
      ([currentLocation, progression, locationsVTree]) =>
        <div>
          <p>
            Progression : {progression}
          </p>
          <h1>{currentLocation}</h1>
          <div selector=".items">
            {locationsVTree}
          </div>
        </div>
    );
  */

  ///// SANS COLLECTION /////
  const action$ = sources.DOM
    .select('.js-change-location')
    .events('click');

  const clickedLocation$ = action$.map(action => action.target.value).startWith("None");
    
  const progression$ = action$.mapTo(1).fold((acc, x) => acc + x, 0);

  const currentLocation$ = action$.map(action =>
    clickedLocation$
  ).startWith("nantes");

  const currentLocationLinks$ = currentLocation$.map(currentLocation =>
      jsonResponse$.map(jsonResponse =>
          jsonResponse.locations[currentLocation].links
      )
  ).flatten();

  const DOMSink$ = xs.combine(currentLocation$, currentLocationLinks$, progression$, clickedLocation$/*, locationsVTree$*/).map(
    ([currentLocation, currentLocationLinks, progression, clickedLocation/*, locationsVTree*/]) =>
      <div>
        <p>Progression : {progression}</p>
        <p>Clicked location : {clickedLocation}</p>
        <h1>{currentLocation}</h1>
        <p>
          {currentLocationLinks.map(currentLocationLink => 
              <button selector=".js-change-location" type="button" value={currentLocationLink} >{currentLocationLink}</button>
          )}
        </p>
      </div>
  );
  ///////////////////////////

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

run(main, drivers);