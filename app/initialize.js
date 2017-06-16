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

  const changeLocationProxy$ = xs.create();  
  
  const currentLocation$ = jsonResponse$.map(jsonResponse =>
      changeLocationProxy$.map( node => jsonResponse.locations[node.id])
  ).flatten().debug();

  //const progression$ = add$.mapTo(1).fold((acc, x) => acc + x, 0);
  const links$ = currentLocation$.map( node => node.links.map(
    link => ChangeLocation({DOM,props$:xs.of({id:link})})
  )).debug();

  const linksVtree$ = links$.map( links => xs.combine(...links.map( link => link.DOM))).flatten();
  const changeLocation$ = xs.merge(
      xs.of({id:"nantes"}).compose(delay(1)),
      links$.map( 
      links => xs.merge(...links.map( link => link.value$))
  ).flatten())

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