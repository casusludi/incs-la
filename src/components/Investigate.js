import xs from 'xstream';
import { run } from '@cycle/xstream-run';
import { html } from 'snabbdom-jsx';

export function Investigate(sources) {
    const domSource = sources.DOM;
    const props$ = sources.props;

    const newValue$ = domSource
        .select('.js-investigate')
        .events('click').debug()
        .map(ev =>{ console.log(ev); return  ev.currentTarget.value});

    const state$ = props$
        .map(props => newValue$
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

    const vdom$ = state$
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

    const sinks = {
        DOM: vdom$,
        value: state$.map(state => state.value)
    };
    return sinks;
}
