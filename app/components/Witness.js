import xs from 'xstream';
import { run } from '@cycle/run';
import { html } from 'snabbdom-jsx';
import { formatLinks } from '../utils';
import _ from 'lodash';

function intent(DOM) {

    const click$ = DOM
        .select('.js-question-witness')
        .events('click')
        .mapTo(true);

    return click$;
}

function model(props$, action$) {
    return props$
        .map(props => action$
            .map(action =>
                Object.assign(
                    props,
                    { showResult: action, }
                )
            ).startWith(props)
        )
        .flatten()
        .remember();
}

function view(value$) {
    return value$
        .map(value =>
            <section style="background: red;">
                {value.showResult
                    ?
                    <figure>
                        <img className="witness" src={value.image} />
                        <figcaption hook={{insert: vnode => vnode.elm.innerHTML = value.clue ? formatLinks(value.clue.text) : _.sample(value.dialogs)}}>
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

export function Witness(sources) {
    const { props$, DOM } = sources;
    const action$ = intent(DOM);
    const value$ = model(props$, action$);
    const vdom$ = view(value$);

    const sinks = {
        DOM: vdom$,
        questionned$: action$.mapTo(null),
    };

    return sinks;
}