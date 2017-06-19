import xs from 'xstream';
import { run } from '@cycle/run';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

function model(sources){
    const settings$ = sources.settings;
    const changeLocation$ = sources.changeLocation;
    const witnessQuestionned$ = sources.witnessQuestionned;

    const elapsedTime$ = settings$.map(settings =>
      xs.merge(
        changeLocation$.mapTo(settings.cost.travel), 
        witnessQuestionned$.mapTo(settings.cost.investigate)
      )
    ).flatten()
    .fold((acc, x) => acc + x, 0);

    return elapsedTime$;
}

function view(value$){
    return value$.map(value =>
      <span>{value-value%1}h{value%1*60}</span>
    );
}

function _TimeManager(sources) {
    const value$ = model(sources);
    const vdom$ = view(value$);

    const sinks = {
        DOM: vdom$,
        elapsedTime: value$,
    };

    return sinks;
}

export function TimeManager(sources){ return isolate(_TimeManager)(sources) };