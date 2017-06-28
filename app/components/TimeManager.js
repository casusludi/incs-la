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
        witnessQuestionned$.map(witnessQuestionned => witnessQuestionned ? settings.cost.investigate : 0),
      )
    ).flatten()
    .fold((acc, x) => acc + x, 0);
    
    return xs.combine(elapsedTime$, settings$).map(([elapsedTime, settings]) => {
      const elapsedHours = parseInt(elapsedTime);
      const elapsedMinutes = (elapsedTime - elapsedHours) * 60;
      
      const remainingTime = settings.totalTime - elapsedTime;
      const remainingHours = parseInt(remainingTime);
      const remainingMinutes = (remainingTime - remainingHours) * 60;

      return {
        totalTime: settings.totalTime,
        elapsedTime: {
          raw: elapsedTime,
          hours: elapsedHours,
          minutes: elapsedMinutes,
          formatted: _.padStart(elapsedHours, 2, '0') + "h" + _.padStart(elapsedMinutes, 2, '0'),
        },
        remainingTime: {
          raw: remainingTime,
          hours: remainingHours,
          minutes: remainingMinutes,
          formatted: _.padStart(remainingHours, 2, '0') + "h" + _.padStart(remainingMinutes, 2, '0'),
        }
      }
    });
}

function view(value$){
    return value$.map(value =>
      <span>
        {value.remainingTime.formatted}
      </span>
    );
}

function _TimeManager(sources) {
    const value$ = model(sources);
    const vdom$ = view(value$);

    const sinks = {
        DOM: vdom$,
        elapsedTime$: value$,
    };

    return sinks;
}

export function TimeManager(sources){ return isolate(_TimeManager)(sources) };