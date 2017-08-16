import xs from 'xstream';

import { html } from 'snabbdom-jsx';

import * as _ from 'lodash';

/*
Composant dont le but est de gérer le temps ingame, d'en faire le décompte en fonction des actions effectuées par le joueur.
*/

function model(sources){
    const {DOM, props$, datas$, changeLocation$, questionnedWitness$} = sources;

    // Représente le temps écoulé compté de façon croissante. Une heure étant égale à 1. (ex: 2h30 = 2.5)
    const elapsedTime$ = props$.map(props =>
      datas$.map(datas =>
        xs.merge(
          changeLocation$.mapTo(datas.settings.cost.travel), 
          questionnedWitness$.mapTo(datas.settings.cost.investigate),
        )
      ).flatten()
      .fold((acc, x) => acc + x, props.elapsedTime) // Ce compteur débute avec la valeur du temps déjà écoulé dans la sauvegarde (si elle est fournie)
    ).flatten();
    
    return xs.combine(elapsedTime$, datas$).map(([elapsedTime, datas]) => {
      const elapsedHours = parseInt(elapsedTime);
      const elapsedMinutes = (elapsedTime - elapsedHours) * 60;
      
      const remainingTime = datas.settings.totalTime - elapsedTime;
      const remainingHours = parseInt(remainingTime);
      const remainingMinutes = (remainingTime - remainingHours) * 60;

      /*
      Met en forme le temps de différente façon : temps écoulé (croissant) ou temps restant (décroissant)
      De façon brute, uniquement les heures, les minutes ou formaté pour l'affichage
      Exemple :
        raw: 2.5
        hours: 2
        minutes: 30
        formatted: 02h30
      Dans les faits peu de ces données sont réellement utilisées. (mais on sait jamais)
      */
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