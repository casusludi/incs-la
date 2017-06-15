import xs from 'xstream';
import { run } from '@cycle/xstream-run';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

export function JSONReader(sources) {

    const request$ = xs.of({
        url: 'http://localhost:1984/assets/data.json',
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