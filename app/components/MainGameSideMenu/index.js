import xs from 'xstream';

import intent from './intent';
import model from './model';
import view from './view';

export default function MainGameSideMenu(sources){

    const {DOM} = sources;
    const props$ = xs.of({open:false});

    const actions$ = intent(DOM);
    const state$ = model(props$,actions$);

    const vdom$ = view(state$);


    const sinks = {
        DOM: vdom$
    }

    return sinks;
}