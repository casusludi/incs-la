import xs from 'xstream';
import {run} from '@cycle/xstream-run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import Collection from '@cycle/collection';
import dropRepeats from 'xstream/extra/dropRepeats'
import fromDiagram from 'xstream/extra/fromDiagram'
import {html} from 'snabbdom-jsx';
import {Investigate} from './components/Investigate.js'; 
import {ChangeLocation} from './components/ChangeLocation.js'; 
import {JSONReader} from './components/JSONReader.js';

function main(sources) {

  const jsonSinks = JSONReader({HTTP: sources.HTTP});

  const request$ = jsonSinks.request;
  const json$ = jsonSinks.JSON;

  const click$ = sources.DOM.select('.link').events('click');

  const proxyCurCity$ = xs.create().debug("proxyCurCity");
  // const proxyCurCity$ = click$.map(click => click.target.innerHTML).startWith('nantes');
  // const curCity$ = click$.map(click => click.target.innerHTML).startWith('nantes');

  const links$ = json$.map(json =>
    proxyCurCity$.map(curCity =>
      json.cities[curCity].links
    )
  ).flatten()
  .debug("links");

  // const nextLocation$ = json$.map(json =>
  //   curCity$.map(curCity =>
  //     json.body.path[curCity].links
  //   )
  // ).flatten();

  // response$.addListener({
  //   next: json => {
  //     console.log("COUCOU");
  //   },
  // });

  const progression$ = links$.mapTo(1).fold((acc, x) => acc + x, 0);

  /*
  const investigateProps$ = xs.of({
    name: 'Marcel',
    image:'assets/images/personnages/data.png',
    dialog:'Pouet',
    clue: {
      text: 'lol'
    }
  });
  const investigate$ = Investigate({DOM: sources.DOM, props: investigateProps$});
  */

  const add$ = links$.map(links =>
    links.map(link => 
      ({
        newLocation$: xs.of({
          location: link,
        }),/* fromDiagram('----a----b--c--|', {
          values: {a: "location1", b: "location2", c: "location3"},
          timeUnit: 1000,
        }),*/
      })
    )
  ).debug("add");
  // const test$ = links$.map(links => links.map(link => ({props: link}))).debug();
  // test$.addListener({
  //   next: test => {
  //     console.log("COUCOU");
  //   },
  // });
  const locations$ = Collection(ChangeLocation, {DOM: sources.DOM}, add$/*, item => item.newLocation*/).debug('locations');
  //const locations$ = Collection(ChangeLocation, {DOM: sources.DOM}, xs.of([{props: 'link'},{props: 'link'},{props: 'link'},{props: 'link'}])).debug();
  
  // const locations$ = links$.map(link => ChangeLocation({DOM: sources.DOM, props: {location: link}})).flatten();
  const locationsVTree$ = Collection.pluck(locations$, item => item.DOM).debug("locationsVTree");

  const newLocationInfo$ = Collection.pluck(locations$, item => item.newLocation).debug("newLocationInfo");
  // nextLocationInfo$.addListener({
  //   next: test => {
  //     console.log("COUCOU");
  //   },
  // });
  // console.log(newLocationInfo$);

  const test$ = newLocationInfo$
    .map(newLocationInfo => 
      xs.merge(...newLocationInfo)
    ).flatten().debug("zboub");
  
  const curCity$ = newLocationInfo$
    .map(newLocationInfo => 
      xs.merge(...newLocationInfo)
    ).flatten()
    .map(item => item.location)
    .startWith('nantes')
    .debug("curCity");
  // console.log("curCity", curCity$);

  proxyCurCity$.imitate(curCity$.compose(dropRepeats()));
  // console.log(proxyCurCity$);

  const sinks = {
   /* DOM: investigate$.DOM.map(
      InvestigateDom =>
        <div>{InvestigateDom}</div>
    )*/
    DOM: xs.combine(/*investigate$.value, investigate$.DOM, */curCity$, links$, progression$, locationsVTree$).map(
      ([/*InvestigateValue, InvestigateDom, */curCity, links, progression, locationsVTree]) =>
        // div([
        //   InvestigateValue + ' ' + InvestigateDom,
        //   p([
        //     'Progression : ' + progression,
        //   ]),
        //   h1([
        //     curCity,
        //   ]),
        //   links.map(link =>
        //     p([
        //       a('.link', [
        //         link,
        //       ]),
        //     ])
        //   ),
        // ])onst sinks = {
        

        <div>
          {/*{InvestigateValue}{InvestigateDom}*/}
          <p>
            Progression : {progression}
          </p>
          <h1>{curCity}</h1>
          {/*{links.map(link =>
            <p>
              <a selector=".link" value={link} href="#">{link}</a>
            </p>)}*/}
          <div selector=".items">
            {locationsVTree}
          </div>
        </div>
    ),
    HTTP: request$,
  };
  return sinks;
}

const drivers = {
  DOM: makeDOMDriver('#app'),
  HTTP: makeHTTPDriver(),
};

run(main, drivers);