import xs from 'xstream';
import { run } from '@cycle/run';
import { html } from 'snabbdom-jsx';
import { formatLinks } from '../utils';
import _ from 'lodash';

function intent(DOM) {

    const click$ = DOM
        .select('.js-question-witness')
        .events('click');

    return click$;
}

function model(props$, action$) {
    return props$
        .map(props => action$
            .map(action =>
                Object.assign(
                    props,
                    { showResult: true, }
                )
            ).startWith(props)
        )
        .flatten()
        .remember();
}

function view(value$) {
    return value$
        .map(value =>
            <section className="place-item">
                {value.showResult
                    ?
                    <figure>
                        <img src={value.image} />
                        <figcaption>
                            <span hook={{insert: vnode => vnode.elm.innerHTML = value.clue ? formatLinks(value.clue.text) : _.sample(value.dialogs)}}>
                            </span>
                        </figcaption>
                    </figure>
                    :
                    <button classNames="js-question-witness button-3d" type="button" >
                        {value.name}
                    </button>
                }
            </section>
        );
}

export function Witness(sources) {
    const { props$, DOM } = sources;
    const action$ = intent(DOM).debug();
    const value$ = model(props$, action$);
    const vdom$ = view(value$);

    const sinks = {
        DOM: vdom$,
        questionned$: action$.mapTo(true).debug(),
    };

    return sinks;
}