import xs from 'xstream';
import { run } from '@cycle/xstream-run';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

function intent(sources){

    const click$ = sources.DOM
        .select('.js-change-location')
        .events('click');

    return click$;
}

function model(newLocation$){
    return newLocation$;
}

function view(state$){
    return state$
        .map(state =>
            <button selector=".js-change-location" type="button" >{state}</button>
        );
}

function _ChangeLocation(sources) {
    const action$ = intent(sources);
    const state$ = model(sources.newLocation$);
    const vdom$ = view(state$);

    const sinks = {
        DOM: vdom$,
        newLocation$: state$.map(state =>
            action$.map(action =>
                state
            )
        ).flatten(),
        destroy$: sources.destroy$,
    };

    return sinks;
}

export function ChangeLocation(sources){ return isolate(_ChangeLocation)(sources) };