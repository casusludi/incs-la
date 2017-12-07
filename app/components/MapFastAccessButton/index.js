import xs from 'xstream';
import { html } from 'snabbdom-jsx';

function intent(DOM){
   return DOM.select('.js-fast-travel').events('click').mapTo(true);
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
        <button type="button" className="js-fast-travel button">{state.location.isLastLocation?"Revenir à ":""}{state.location.details.name}</button>
    );
}

export default function MapFastAccessButton(sources){
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