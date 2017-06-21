import xs from 'xstream';
import { run } from '@cycle/run';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

export function NotFound(sources) {
    const previousPageClick$ = sources.DOM.select(".previous").events("click");
    const goBack$ = previousPageClick$.mapTo({ type: "goBack" });

    const DOMSink$ = xs.of(
        <div>
            <h1>404 Not Found</h1>
            <button selector=".previous">Previous</button>
        </div>
    );

    return {
        DOM: DOMSink$,
        router: goBack$,
    };
};