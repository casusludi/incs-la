import xs from 'xstream';

import { html } from 'snabbdom-jsx';

/*
La classique page 404
Pas utilisée
*/

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