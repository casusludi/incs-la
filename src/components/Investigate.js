import xs from 'xstream';
import { run } from '@cycle/xstream-run';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

function intent(DOM){
    return DOM
        .select('.js-investigate')
        .events('click')
        .mapTo(true);
}

function model(action$,props$){
    return props$
        .map(props => action$
            .map(val => ({
                name: props.name,
                image: props.image,
                dialog: props.dialog,
                clue: props.clue,
                showResult:val
            }))
            .startWith(props)
        )
        .flatten()
        .remember();
}

function view(state$){
    return state$
        .map(state =>
            <section selector=".place-item">
            { state.showResult ?
                <figure>
                    <img src={state.image} />
                    <figcaption>
                        { state.clue ? 
                            <span>
                                {state.clue.text}
                            </span>
                        :
                            <span>
                                {state.dialog}
                            </span>
                        }
                    </figcaption>
                </figure>
            :
                <button selector=".js-investigate" type="button" >{state.name}</button>
            }
            </section>
        );
}

function _Investigate(sources) {

    const action$ = intent(sources.DOM);
    const state$ = model(action$,sources.props);
    const vdom$ = view(state$);

    const sinks = {
        DOM: vdom$,
        value: state$.map(state => !!state.showResult)
    };

    return sinks;
}

export function Investigate(sources){ return isolate(_Investigate)(sources) };