import xs from 'xstream';

import { html } from 'snabbdom-jsx';

export function JSONReader(sources) {

    const request$ = xs.of({
        url: '/data.json',
        category: 'data',
    });

    const response$ = sources.HTTP
        .select('data')
        .flatten()
        .map(response => response.body);

    const sinks = {
        JSON: response$,
        request: request$,
    };

    return sinks;
}