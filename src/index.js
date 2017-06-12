import xs from 'xstream';
import {run} from '@cycle/xstream-run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import {html} from 'snabbdom-jsx';
import {Investigate} from './components/Investigate.js'; 

function main(sources) {
  // Test lecture fichier de data JSON
  let request$ = xs.of({
    url: 'http://localhost:1984/assets/data.json', // GET method by default
    category: 'data',
  });

  let response$ = sources.HTTP
    .select('data')
    .flatten();

  // response$.map(response => console.log(response.body));

  // response$.addListener({
  //   next: reponse => {
  //     console.log(reponse.body.cities['nantes'].links);
  //   },
  // });

  let click$ = sources.DOM.select('.link').events('click');
  
  let curCity = $click.map(click => click.target.innerHTML).startWith('nantes');

  let links$ = response$.map(response =>
    curCity$.map(curCity =>
      response.body.cities[curCity].links
    )
  ).flatten();

  let nextLocation$ = response$.map(response =>
    curCity$.map(curCity =>
      response.body.path[curCity].links
    )
  ).flatten();

  response$.addListener({
    next: reponse => {
      console.log("COUCOU");
    },
  });

  const investigateProps$ = xs.of({
    name: 'Marcel',
    image:'assets/images/personnages/data.png',
    dialog:'Pouet',
    clue: {
      text: 'lol'
    }
  });
  const investigate$ = Investigate({DOM:sources.DOM, props:investigateProps$});

  const sinks = {
   /* DOM: investigate$.DOM.map(
      InvestigateDom =>
        <div>{InvestigateDom}</div>
    )*/
    DOM: xs.combine(investigate$.value, investigate$.DOM, curCity$, links$).map(
      ([InvestigateValue, InvestigateDom, curCity, links]) =>
        <div>
          {InvestigateValue}{InvestigateDom}
          <h1>{curCity}</h1>
          {links.map(link => <p><a selector=".link" classNames={link} href="#">{link}</a></p>)}
        </div>
    ),
    HTTP: request$,
  };
  return sinks;
}

const drivers = {
  DOM: makeDOMDriver('#app'),
  HTTP:makeHTTPDriver(),
};

run(main, drivers);