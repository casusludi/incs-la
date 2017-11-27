import xs from 'xstream';
import tween from 'xstream/extra/tween';
import { html } from 'snabbdom-jsx';
import _ from 'lodash';
import { div } from '@cycle/dom';
import flattenConcurrently from 'xstream/extra/flattenConcurrently'

function capValue(val, min, max) {
    if (val < min) return min;
    if (val > max) return max;
    return val;
}

function modeToClasses(mode) {
    switch (mode) {
        case VERTICAL_STICK_MODE: return 'vertical';
        case HORIZONTAL_STICK_MODE: return 'horizontal';
    }
    return 'vertical horizontal';
}

function getTargetTouch(targetTouches, e) {
    const result = _.find(e.changedTouches, (o) => _.some(targetTouches, a => a.identifier == o.identifier));
    return result ? result : false;
}

function isSameTouchAction(targetTouches, e) {
    return _.some(e.changedTouches, (o) => _.some(targetTouches, a => a.identifier == o.identifier));
}

function intent(DOM) {
    const wrapper$ = DOM.select('.map-viewer').elements();
    const content = DOM.select('.map-viewer-content');
    const root = DOM.select('body');
    const touchStart$ = content.events('touchstart');
    const touchEnd$ = root.events('touchend');
    const touchCancel$ = root.events('touchcancel');
    const touchMove$ = root.events('touchmove');

    return  touchStart$
        .map(touchStartEvent => {
            
            const wrapperBounds = touchStartEvent.currentTarget.parentNode.getBoundingClientRect();
            const { top, left, width, height } = touchStartEvent.currentTarget.getBoundingClientRect();
            const targetTouches = touchStartEvent.targetTouches;
            const startTouch = getTargetTouch(targetTouches, touchStartEvent);
            const endAction$ = xs.merge(touchEnd$, touchCancel$)
                .map(e => getTargetTouch(targetTouches, e))
                .filter(touch => touch);
            const moveAction$ = touchMove$
                .map(e => getTargetTouch(targetTouches, e))
                .filter(touch => touch)
                .map(touch => {
                    return {
                        type: 'brut',
                        x: left+touch.clientX-startTouch.clientX - wrapperBounds.left,
                        y: top+touch.clientY-startTouch.clientY - wrapperBounds.top ,
                        deltaX: touch.clientX - startTouch.clientX,
                        delatY: touch.clientY - startTouch.clientY,
                        top, left, width, height
                    }
                })
                .endWhen(endAction$);

            return moveAction$;

           /* const repositionneAction$ = endAction$.take(1).map((touch) => {
                return {
                    type: 'smooth',
                    x: touch.clientX,
                    y: touch.clientY,
                    top, left, width, height
                }
            })

            return xs.merge(
                moveAction$,
                repositionneAction$
            );*/
        })
        .flatten()
   
}

function model(action$, props$) {
    return props$
        .map((props) => action$
            .map((data) => {
                const { x, y, top, left, height, width } = data;
                return { ...props, top:y, left:x  };
            })
            .startWith({ ...props })
        )
        .flatten()
        .remember();
}

function view(state$, content$) {
    return content$.map(content =>
        state$.map(({ top,left }) =>
            <div className="map-viewer">
                <div className="map-viewer-content" style={{top:`${top}px`,left:`${left}px`}}>
                    {content}
                </div>
            </div>
        )
    ).flatten();
}

export function MapViewer({ DOM, content$, props$ = xs.of({}) }) {
    const defaultProps$ = xs.of({ });
    const newProps$ = xs.combine(defaultProps$, props$).map(([a, b]) => ({ ...a, ...b }));
    const action$ = intent(DOM);
    const state$ = model(action$, newProps$);
    const vdom$ = view(state$, content$);

    const sinks = {
        DOM: vdom$,
        value: state$
    };

    return sinks;
}

