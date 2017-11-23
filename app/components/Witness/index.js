import {view} from './view';

/*
Composant qui représente un témoin dans un lieu.
*/

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

export function Witness(sources) {
    const { props$, DOM } = sources;
    const action$ = intent(DOM);
    const value$ = model(props$, action$);
    const vdom$ = view(value$);

    const sinks = {
        DOM: vdom$,
        questionned$: props$.map(props =>
            action$.mapTo(props)
        ).flatten(),
    };

    return sinks;
}