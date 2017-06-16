import xs from 'xstream';
import {run} from '@cycle/run';
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

  const {HTTP,DOM} = sources;

  const jsonSinks = JSONReader({HTTP: sources.HTTP});
  const jsonRequest$ = jsonSinks.request;
  const jsonResponse$ = jsonSinks.JSON;

  const locations$ = jsonResponse$.map( jsonResponse => jsonResponse.locations);
  const path$ = jsonResponse$.map(jsonResponse => jsonResponse.path);

  const changeLocationProxy$ = xs.create();  

  const currentLocation$ = locations$.map(locations =>
      changeLocationProxy$.map( node => locations[node.id])
  ).flatten();

  const pathInit$ = path$.map( path => ({id:path[0].location}));

  //const progression$ = add$.mapTo(1).fold((acc, x) => acc + x, 0);
  const links$ = currentLocation$.map( node => node.links.map(
    link => ChangeLocation({DOM,props$:xs.of({id:link})})
  ));

  const linksVtree$ = links$.map( links => xs.combine(...links.map( link => link.DOM))).flatten();
  const changeLocation$ = links$.map( 
      links => xs.merge(...links.map( link => link.value$))
  )
  .startWith(pathInit$)
  .flatten()

  changeLocationProxy$.imitate(changeLocation$);

  const DOMSink$ = xs.combine(linksVtree$,changeLocation$).map(
      ([linksVtree,changeLocation]) =>
        <div>
          <p>
            Current : {changeLocation?changeLocation.id:''}
          </p>
          <h1></h1>
          <div selector=".items">
            {linksVtree}
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