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

  const locations$ = jsonResponse$.map( jsonResponse => jsonResponse.locations);
  const path$ = jsonResponse$.map(jsonResponse => jsonResponse.path);
  const settings$ = jsonResponse$.map(jsonResponse => jsonResponse.setting);

  const changeLocationProxy$ = xs.create();  

  const currentLocation$ = locations$.map(locations =>
      changeLocationProxy$.map(node => locations[node.id])
  ).flatten();

  const pathInit$ = path$.map(path => ({id:path[0].location}));

  /// ça pourrait fonctionner si les noms avaient partout la même convention d'écriture. chercher autre alternative ///
  // const progressionProxy$ = xs.create();
  // const correctLocation$ = jsonResponse$.map(jsonResponse =>
  //   currentLocation$.map(currentLocation =>
  //     progressionProxy$.filter(progression => {
  //       console.log(currentLocation);
  //       return currentLocation.name === jsonResponse.path[progression+1].location
  //     }
  //     )
  //   ).flatten()
  // ).flatten();
  // const progression$ = correctLocation$.mapTo(1).fold((acc, x) => acc + x, 0);
  // progressionProxy$.imitate(progression$);
  /////////////////////////////////////////////////

  const currentLocationLinks$ = currentLocation$.map( node => node.links.map(
    link => ChangeLocation({DOM, props$: xs.of({id:link})})
  ));

  const changeLocation$ = currentLocationLinks$.map( 
      links => xs.merge(...links.map(link => link.value$))
  )
  .startWith(pathInit$)
  .flatten();

  changeLocationProxy$.imitate(changeLocation$);

  const linksVtree$ = currentLocationLinks$.map( links => xs.combine(...links.map( link => link.DOM))).flatten();
  
  const witnessesData$ = currentLocation$.map(currentLocation => currentLocation.places);

  const witnesses$ = witnessesData$.map(witnessesData =>
    Object.keys(witnessesData).map((key, value) =>
      Witness({
        DOM: sources.DOM, 
        props$: xs.of(witnessesData[key]),
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
  const elapsedTime$ = settings$.map(settings =>
      xs.merge(
        changeLocation$.mapTo(settings.cost.travel), 
        witnessQuestionned$.mapTo(settings.cost.investigate)
      )
    ).flatten()
    .fold((acc, x) => acc + x, 0);
  
  const DOMSink$ = xs.combine(linksVtree$, changeLocation$, witnessesVTree$/*, progression$*/, elapsedTime$).map(
      ([linksVtree, changeLocation, witnessesVTree/*, progression*/, elapsedTime]) =>
        <div>
          {/*<h1>Progression : {progression}</h1>*/}
          <h2>Temps écoulé : {elapsedTime}</h2>
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