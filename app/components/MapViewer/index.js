import xs from 'xstream';
import tween from 'xstream/extra/tween';
import pairwise from 'xstream/extra/pairwise';
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
    if (e instanceof MouseEvent) {
        return e;
    }
    const result = _.find(e.changedTouches, (o) => _.some(targetTouches, a => a.identifier == o.identifier));
    return result ? result : false;
}

function component(DOM){
    const content = DOM.select('.map-viewer-content');
    const root = DOM.select('body');
    return {
        content,
        root,
        bounds$: content.elements() 
                .filter(content => content.length > 0)
                .map(content => {
                    const wrapperBounds = content[0].parentNode.getBoundingClientRect();
                    const contentBounds = content[0].getBoundingClientRect();
                    return {
                        contentBounds,
                        wrapperBounds
                    }
                }).take(1)
                .remember()
    }
}

function intent(comp, windowResize$) {

    const resize$ = windowResize$;

    const {content, root} = comp;


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

    const fitContent$ = comp.bounds$.take(1);

    return xs.merge(
        fingerAction$,
        fitContent$,
        resize$.mapTo(fitContent$).flatten()
    )
}

function moveTo({ x, y, contentBounds, wrapperBounds }) {
    const left = contentBounds.left - wrapperBounds.left + x;
    const top = contentBounds.top - wrapperBounds.top + y;
    console.log(left, top);

    const deltaH = wrapperBounds.width - contentBounds.width;
    const deltaV = wrapperBounds.height - contentBounds.height;
    const paddingH = wrapperBounds.width * 0.25;
    const paddingV = wrapperBounds.height * 0.25;

    const minLeft = deltaH < paddingH ? deltaH - paddingH : deltaH * 0.5;
    const maxLeft = deltaH < paddingH ? paddingH : deltaH * 0.5;

    const minTop = deltaV < paddingV ? deltaV - paddingV : deltaV * 0.5;
    const maxTop = deltaV < paddingV ? paddingV : deltaV * 0.5;

    return {
        top: capValue(top, minTop, maxTop),
        left: capValue(left, minLeft, maxLeft)
    }
}

function model(action$, center$, comp) {
   
        const innerAction$ = action$
            .map((data) => {
                const {
                contentBounds,
                    wrapperBounds,
                    currentAction,
                    startAction
            } = data;

                return moveTo({
                    smooth: false,
                    x: (currentAction && startAction ? currentAction.clientX - startAction.clientX : 0),
                    y: (currentAction && startAction ? currentAction.clientY - startAction.clientY : 0),
                    contentBounds,
                    wrapperBounds
                })

            });

        const externalAction$ = comp.bounds$.map(
            ({contentBounds,wrapperBounds}) => 
                center$.map( 
                    center => xs.of(
                        moveTo({
                            smooth: !!center.smooth,
                            x:center.x,
                            y:center.y,
                            contentBounds,
                            wrapperBounds
                        })
                    )
                )
        ).flatten()

        return xs.merge(
                innerAction$,
                externalAction$
            ).compose(pairwise)
            .map(([curr,last])=> {
                if(curr.smooth){
                    return tween({
                        from: 0,
                        to: 1,
                        ease: tween.exponential.easeIn,
                        duration: 300,
                    }).map( t => moveTo({
                        x:center.x,
                        y:center.y,
                        contentBounds,
                        wrapperBounds
                    }))
                }
                return xs.of(curr)
            })
            .flatten()
            .startWith({top:0,left:0})
            .remember();
}

function view(state$, content$) {
    return content$.map(content =>
        state$.map(({ top, left }) =>
            <div className="map-viewer">
                <div className="map-viewer-content" style={{ top: `${top}px`, left: `${left}px` }}>
                    {content}
                </div>
            </div>
        )
    ).flatten();
}

export function MapViewer({ DOM, content$, center$=xs.of({ x: 0, y: 0, smooth:false }), windowResize$ }) {
  
    const comp = component(DOM);
    const action$ = intent(comp, windowResize$);
    const state$ = model(action$, center$,comp);
    const vdom$ = view(state$, content$);

    const sinks = {
        DOM: vdom$,
        value: state$
    };

    return sinks;
}

