import xs from 'xstream';
import {run} from '@cycle/xstream-run';
import {makeDOMDriver} from '@cycle/dom';
import {html} from 'snabbdom-jsx';
import {Investigate} from './components/Investigate.js'; 

function main(sources) {

  const investigateProps$ = xs.of({
    name: 'Marcel',
    image:'assets/images/personnages/data.png',
    dialog:'Pouet',
    clue: {
      text: 'lol'
    }
  });
  const investigate$ = Investigate({DOM:sources.DOM,props:investigateProps$});
  const sinks = {
    DOM: investigate$.DOM.map(
      function(InvestigateDom){
          return <div>{InvestigateDom}</div>;
      }
    )
  };
  return sinks;
}

const drivers = {
  DOM: makeDOMDriver('#app')
};

run(main, drivers);