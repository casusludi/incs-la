import xs from 'xstream';
import { run } from '@cycle/run';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

function intent(DOM){

    const click$ = DOM
        .select('.js-change-location')
        .events('click')
        .mapTo(true);

    return click$;
}

function model(props$, action$){
    return action$.map(action => props$).flatten();
}

function view(props$){
    return props$
        .map(props =>
            <button selector=".js-change-location" type="button" >{props.name}</button>
        );
}

function _ChangeLocation(sources) {
    const {props$, DOM} = sources;
    const action$ = intent(DOM);
    const value$ = model(props$, action$);
    const vdom$ = view(props$);

    const sinks = {
        DOM: vdom$,
        changeLocation$: value$,
        linkValue$: props$,
    };

    return sinks;
}

export function ChangeLocation(sources){ return isolate(_ChangeLocation)(sources) };