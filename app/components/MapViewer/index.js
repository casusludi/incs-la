import xs from 'xstream';
import tween from 'xstream/extra/tween';
import { html } from 'snabbdom-jsx';
import _ from 'lodash';

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
    const stick = DOM.select('.stick-base');
    const root = DOM.select('body');
    const touchStart$ = stick.events('touchstart');
    const touchEnd$ = root.events('touchend');
    const touchCancel$ = root.events('touchcancel');
    const touchMove$ = root.events('touchmove');

    return touchStart$
        .map(touchStartEvent => {
            const { top, left, width, height } = touchStartEvent.currentTarget.getBoundingClientRect();
            const targetTouches = touchStartEvent.targetTouches;
            const endAction$ = xs.merge(touchEnd$, touchCancel$)
                .map(e => getTargetTouch(targetTouches, e))
                .filter(touch => touch);
            const moveAction$ = touchMove$
                .map(e => getTargetTouch(targetTouches, e))
                .filter(touch => touch)
                .map(touch => {
                    return {
                        type: 'brut',
                        x: touch.clientX,
                        y: touch.clientY,
                        top, left, width, height
                    }
                })
                .endWhen(endAction$);

            const repositionneAction$ = endAction$.take(1).map((touch) => {
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
            );
        })
        .flatten();
}

function model(action$, props$) {
    return props$
        .map((props) => action$
            .map((data) => {
                const { x, y, top, left, height, width } = data;
                const fromX = capValue(x, left, left + width);
                const fromY = capValue(y, top, top + height);
                return { ...props };
            }).flatten()
            .startWith({ ...props, rateX: 0, rateY: 0 })
        )
        .flatten()
        .remember();
}

function view(state$, content$) {
    return content$.map(content =>
        state$.map(({ rateX, rateY, mode, padding }) =>
            <div className="map-viewer">
                {content}
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

