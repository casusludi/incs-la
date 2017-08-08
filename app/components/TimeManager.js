import xs from 'xstream';

import { html } from 'snabbdom-jsx';

import * as _ from 'lodash';

function model(sources){
    const {DOM, props$, datas$, changeLocation$, questionnedWitness$} = sources;

    const elapsedTime$ = props$.map(props =>
      datas$.map(datas =>
        xs.merge(
          changeLocation$.mapTo(datas.settings.cost.travel), 
          questionnedWitness$.mapTo(datas.settings.cost.investigate),
        )
      ).flatten()
      .fold((acc, x) => acc + x, props.elapsedTime)
    ).flatten();
    
    return xs.combine(elapsedTime$, datas$).map(([elapsedTime, datas]) => {
      const elapsedHours = parseInt(elapsedTime);
      const elapsedMinutes = (elapsedTime - elapsedHours) * 60;
      
      const remainingTime = datas.settings.totalTime - elapsedTime;
      const remainingHours = parseInt(remainingTime);
      const remainingMinutes = (remainingTime - remainingHours) * 60;

      return {
        totalTime: datas.settings.totalTime,
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

export function TimeManager(sources) {
    const value$ = model(sources).remember();
    const vdom$ = view(value$);

    const sinks = {
        DOM: vdom$,
        timeDatas$: value$,
    };

    return sinks;
}