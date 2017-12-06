import xs from 'xstream';
import { html } from 'snabbdom-jsx';

function intent(DOM){
    DOM.select('.js-fast-travel').events('click').mapTo(true);
}

function model(props$,action$){
    return props$.map( props => 
        action$.map( action => props.location)
    )
    .flatten()
    .remember()
}

function view(state$){
    return state$.map( state => 
        <button type="button" className="js-fast-travel">{state.location.name}</button>
    );
}

export default function MapFastTravelButton(sources){
    const {DOM,props$} = sources;
    const action$ = intent(DOM);
    const value$ = model(props$,action$);
    const vdom$ = view(props$);

    const sinks = {
        DOM:vdom$,
        value: value$
    }

    return sinks;
}