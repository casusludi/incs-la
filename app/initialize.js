import xs from 'xstream';
import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import Collection from '@cycle/collection';
import fromDiagram from 'xstream/extra/fromDiagram'
import dropRepeats from 'xstream/extra/dropRepeats'
import delay from 'xstream/extra/delay'
import {html} from 'snabbdom-jsx';
import {Investigate} from './components/Investigate.js';
import {ChangeLocation} from './components/ChangeLocation.js';
import {Witness} from './components/Witness.js';
import {JSONReader} from './components/JSONReader.js';

function main(sources) {

  const {HTTP,DOM} = sources;

  const jsonSinks = JSONReader({HTTP: sources.HTTP});
  const jsonRequest$ = jsonSinks.request;
  const jsonResponse$ = jsonSinks.JSON;

  const changeLocationProxy$ = xs.create(); 
  //const changeLocationProxy$ = xs.of({id:"nantes"});
  
  const currentLocation$ = jsonResponse$.map(jsonResponse =>
      changeLocationProxy$.map(node => jsonResponse.locations[node.id])
  ).flatten().debug("currentLocation");

  //const progression$ = add$.mapTo(1).fold((acc, x) => acc + x, 0);
  const links$ = currentLocation$.map( node => node.links.map(
    link => ChangeLocation({DOM, props$: xs.of({id:link})})
  ));

  const changeLocation$ = links$.map( 
      links => xs.merge(...links.map( link => link.value$))
  ).flatten()
  .startWith({id:"nantes"});

  const test$ = xs.merge(xs.of({id:"nantes"}, changeLocation$)).remember();

  //changeLocationProxy$.imitate(test$);
  changeLocationProxy$.imitate(changeLocation$.compose(dropRepeats()));

  const linksVtree$ = links$.map( links => xs.combine(...links.map( link => link.DOM))).flatten();
  
  const witnessesData$ = currentLocation$.map(currentLocation => currentLocation.places).debug("witnessesData");

  const witnesses$ = witnessesData$.map(witnessesData =>
    Object.keys(witnessesData).map((key, value) =>
      Witness({
        DOM: sources.DOM, 
        props$: xs.of(witnessesData[key]),
      })
    )
  ).debug("witnesses");

  const witnessesVTree$ = witnesses$.map(witnesses =>
    xs.combine(...witnesses.map(witness => witness.DOM))
  ).flatten();
  
  const DOMSink$ = xs.combine(linksVtree$, changeLocation$, witnessesVTree$).map(
      ([linksVtree, changeLocation, witnessesVTree]) =>
        <div>
          <div>
            {witnessesVTree}
          </div>
          <footer>
            <div class="travel-panel">
              <p>
                Current : {changeLocation?changeLocation.id:''}
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

run(main, drivers);