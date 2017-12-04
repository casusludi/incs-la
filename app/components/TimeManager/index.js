import xs from 'xstream';

import { html } from 'snabbdom-jsx';
import { svg } from '@cycle/dom';

import * as _ from 'lodash';
import tween from 'xstream/extra/tween'

/*
Composant dont le but est de gérer le temps ingame, d'en faire le décompte en fonction des actions effectuées par le joueur.
*/

function model(sources) {
  const { DOM, props$, datas$, changeLocation$, questionnedWitness$ } = sources;

  // Représente le temps écoulé compté de façon croissante. Une heure étant égale à 1. (ex: 2h30 = 2.5)
  const elapsedTime$ = props$.map(props =>
    datas$.map(datas =>
      xs.merge(
        changeLocation$.mapTo(datas.settings.cost.travel),
        questionnedWitness$.mapTo(datas.settings.cost.investigate),
      )
    ).flatten()
      .fold((acc, x) => ({curr:acc.curr + x,last:acc.curr}), {curr:props.elapsedTime,last:props.elapsedTime}) // Ce compteur débute avec la valeur du temps déjà écoulé dans la sauvegarde (si elle est fournie)
  ).flatten();

  return xs.combine(elapsedTime$, datas$).map(([elapsedTime, datas]) => {
    console.log(elapsedTime);
    const elapsedHours = parseInt(elapsedTime.curr);
    const elapsedMinutes = (elapsedTime.curr - elapsedHours) * 60;

    const remainingTime = datas.settings.totalTime - elapsedTime.curr;
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

    return tween({
      from: 0,
      to: 1,
      ease: tween.exponential.easeIn,
      duration: 300,
    }).map( t => ({
      totalTime: datas.settings.totalTime,
      buzz: t < 1,
      elapsedTime: {
        raw: elapsedTime.last+t*(elapsedTime.curr-elapsedTime.last), 
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
    }))
  }).flatten().remember();
}

function view(state$) {

  return state$.map(state =>
    <div className={`time-viewer ${state.buzz?'buzz':''}`}>
      {
        svg({
          attrs: {
            className: "time-viewer-graphics",
            viewBox: "0 0 100 100",
            width: "100%",
            height: "100%"
          }
        },
        [
          svg.circle({
            attrs: {
              cx: 50,
              cy: 50,
              r: 48,
              fill: "#F7941D",
              stroke: "none"
            }
          }),
          svg.path({
            attrs: {
              d: describeArc(50, 50, 50, 0, 360 * state.elapsedTime.raw / state.totalTime),
              id: "arc",
              fill: "#fdc61b"
            }
          }),
          svg.circle({
            attrs: {
              cx: 50,
              cy: 50,
              r: 48,
              fill: "none",
              stroke: "white",
              "stroke-width": "4"
            }
          })
        ])
      }
      <div className="time-viewer-label">{state.remainingTime.formatted}</div>
    </div>
  );
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {

  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  const d = [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    "L", x, y,
    "Z"
  ].join(" ");

  return d;
}

export function TimeManager(sources) {
  const state$ = model(sources);
  const vdom$ = view(state$);

  const sinks = {
    DOM: vdom$,
    timeDatas$: state$,
  };

  return sinks;
}