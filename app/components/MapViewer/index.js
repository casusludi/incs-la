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
    if(e instanceof MouseEvent){
        return e;
    }
    const result = _.find(e.changedTouches, (o) => _.some(targetTouches, a => a.identifier == o.identifier));
    return result ? result : false;
}

function intent(DOM,windowResize$) {

    
    const resize$ = windowResize$;

    const content = DOM.select('.map-viewer-content');
    const content$ = DOM.select('.map-viewer-content').elements();
    const root = DOM.select('body');
    const actionStart$ = xs.merge(
                            content.events('mousedown'),
                            content.events('touchstart')
                        );
    const actionEnd$ = xs.merge(
                            root.events('mouseup'),
                            root.events('touchend'),
                            root.events('touchcancel')
                    )

    const actionMove$ = xs.merge(
                        root.events('mousemove'),
                        root.events('touchmove')
                    );

    const fingerAction$ = actionStart$
        .map(actionStartEvent => {
            
            const wrapperBounds = actionStartEvent.currentTarget.parentNode.getBoundingClientRect();
            const contentBounds = actionStartEvent.currentTarget.getBoundingClientRect();
            const targetTouches = actionStartEvent.targetTouches;
            const startAction = getTargetTouch(targetTouches, actionStartEvent);
            const endAction$ = actionEnd$
                .map(e => getTargetTouch(targetTouches, e))
                .filter(action => action);
            const moveAction$ = actionMove$
                .map(e => getTargetTouch(targetTouches, e))
                .filter(action => action)
                .map(currentAction => {
                    return {
                        contentBounds,
                        wrapperBounds,
                        currentAction,
                        startAction
                    }
                })
                .endWhen(endAction$);

            return moveAction$;
        }).flatten();

    const fitContent$ = content$
        .filter(content => content.length>0)
        .map(content => {
        const wrapperBounds = content[0].parentNode.getBoundingClientRect();
        const contentBounds = content[0].getBoundingClientRect();
        return {
            contentBounds,
            wrapperBounds,
            currentAction:null,
            startAction:null
        }
    }).take(1);

    return xs.merge(
        fingerAction$,
        fitContent$,
        resize$.mapTo(fitContent$).flatten()
    )
}

function model(action$, props$) {
    return props$
        .map((props) => action$
            .map((data) => {
                const { 
                    contentBounds,
                    wrapperBounds,
                    currentAction,
                    startAction 
                } = data;

                const left = contentBounds.left - wrapperBounds.left + (currentAction && startAction?currentAction.clientX-startAction.clientX:0);
                const top = contentBounds.top - wrapperBounds.top + (currentAction && startAction?currentAction.clientY-startAction.clientY:0);
                
                const deltaH = wrapperBounds.width - contentBounds.width;
                const deltaV = wrapperBounds.height - contentBounds.height;
                const minLeft =  deltaH<0?deltaH:deltaH*0.5;
                const maxLeft = deltaH<0?0:deltaH*0.5;

                const minTop =  deltaV<0?deltaV:deltaV*0.5;
                const maxTop = deltaV<0?0:deltaV*0.5;

                return {
                    ...props,
                    top:capValue(top,minTop,maxTop),
                    left:capValue(left,minLeft,maxLeft)
                }
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

export function MapViewer({ DOM, content$, windowResize$, props$ = xs.of({}) }) {
    const defaultProps$ = xs.of({ });
    const newProps$ = xs.combine(defaultProps$, props$).map(([a, b]) => ({ ...a, ...b }));
    const action$ = intent(DOM,windowResize$);
    const state$ = model(action$, newProps$);
    const vdom$ = view(state$, content$);

    const sinks = {
        DOM: vdom$,
        value: state$
    };

    return sinks;
}

