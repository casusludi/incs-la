import xs from 'xstream';
import { run } from '@cycle/run';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';
import * as _ from 'lodash';

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
    
    return elapsedTime$.map(elapsedTime => {
      const hours = parseInt(elapsedTime % 24);//elapsedTime - elapsedTime % 1;
      const minutes = (elapsedTime % 24 - hours) * 60;
      return {
        raw: elapsedTime,
        hours: hours,
        minutes: minutes,
      }
    });
}

function view(value$){
    return value$.map(value =>
      <span>
        {_.padStart(value.hours, 2, '0')}h{_.padStart(value.minutes, 2, '0')}
      </span>
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