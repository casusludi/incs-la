import xs from 'xstream';

import { html } from 'snabbdom-jsx';

export function JSONReader(sources) {

    const {HTTP, jsonPath$} = sources;

    const request$ = jsonPath$.map(jsonPath => ({
        url: jsonPath,
        category: jsonPath,
    }));

    const response$ = jsonPath$.map(jsonPath =>
        HTTP.select(jsonPath)
        .flatten()
        .map(response => response.body)
    ).flatten().remember();

    const sinks = {
        JSON: response$,
        request: request$,
    };

    return sinks;
}