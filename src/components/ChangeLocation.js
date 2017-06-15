import xs from 'xstream';
import { run } from '@cycle/xstream-run';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

function intent(sources){

    const click$ = sources.DOM
        .select('.js-change-location')
        .events('click')
        .mapTo(true)
        .debug("click");

    const changeLocation$ = xs.merge(
        click$.mapTo(true),
        sources.newLocation$.mapTo(false),
    ).startWith(false).debug("test");

    return click$;
}

function model(newLocation$){
    
    // return props$
    //     .map(props => newLocation$
    //         /*.map(newLocation => ({
    //             location: newLocation,
    //         }))*/
    //         .startWith(props)
    //     )
    //     .flatten()
    //     .remember();
    return newLocation$;//.remember();
}

function view(state$){
    return state$
        .map(state =>
            <button selector=".js-change-location" type="button" >{state.location}</button>
        );
}

function _ChangeLocation(sources) {
    // console.log(sources);
    const action$ = intent(sources);
    const state$ = model(sources.newLocation$);
    const vdom$ = view(state$);

    const sinks = {
        DOM: vdom$,
        newLocation: xs.of(state$.map(state =>
            action$.map(action =>
                state
            )
        ).flatten())
        .debug("newLocation"),
        // {
        //     location$: state$.map(state => state.location),
        //     moveTo$: action$,
        // },
    };

    return sinks;
}

export function ChangeLocation(sources){ return isolate(_ChangeLocation)(sources) };