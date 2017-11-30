import xs from 'xstream';

import intent from './intent';
import model from './model';
import view from './view';

export default function MainGameSideMenu(sources){

    const {DOM,props$=xs.of({location$:xs.empty()})} = sources;

    const actions$ = intent(DOM);
    const {state$, router$} = model(xs.merge(props$),actions$);

    const vdom$ = view(state$);


    const sinks = {
        DOM: vdom$,
        router: router$
    }

    return sinks;
}