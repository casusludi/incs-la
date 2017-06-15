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

  const proxyChangeLocation$ = xs.create(); 
  
  const locationLinks$ = jsonResponse$.map(jsonResponse =>
    proxyChangeLocation$.map(currentLocation => {
        return jsonResponse.locations[currentLocation].links
      } 
    )
  ).flatten().debug();

  const progression$ = locationLinks$.mapTo(1).fold((acc, x) => acc + x, 0);

  const add$ = locationLinks$.map(locationLinks =>
    locationLinks.map(link => 
      ({
        newLocation$: xs.of(link),
      })
    )
  );

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

  const DOMSink$ = xs.combine(currentLocation$, locationLinks$, progression$, locationsVTree$).map(
      ([currentLocation, locationLinks, progression, locationsVTree]) =>
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