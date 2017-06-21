import xs from 'xstream';
import { run } from '@cycle/run';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

function intent(DOM){

    const click$ = DOM
        .select('.js-question-witness')
        .events('click')
        .mapTo(true);

    return click$;
}

function model(props$, action$){
    return props$
        .map(props => action$
            .map(action => 
              Object.assign(
                props,
                {showResult: action,}
              )
            ).startWith(props)
        )
        .flatten()
        .remember();
}

function view(value$){
    const RE = /\[([^\]]*)\]\(([^)]*)\)/g;

    return value$
        .map(value =>
            <section style="background: red;">
                {value.showResult 
                    ?
                    <figure> 
                        <img className="witness" src={value.image} />
                        <figcaption>
                            {value.clue ? value.clue.text.replace(RE, '<a href="$2" target="_blank">$1</a>') : value.dialogs[0]}
                            {/*{value.clue ? value.clue.text : value.dialogs[0]}*/}
                        </figcaption>
                    </figure>
                    : 
                    <button selector=".js-question-witness" type="button" >
                        {value.name}
                    </button>
                }
            </section>
        );
}

function _Witness(sources) {
    const {props$, DOM} = sources;
    const action$ = intent(DOM);
    const value$ = model(props$, action$);
    const vdom$ = view(value$);

    const sinks = {
        DOM: vdom$,
        questionned$: action$.mapTo(null),
    };

    return sinks;
}

export function Witness(sources){ return isolate(_Witness)(sources) };