import xs from 'xstream';

const uuidv4 = require('uuid/v4');

export function seedDriver(input$) {

    const createAction$ = input$
        .map( ({category}) => ({
            category,
            value:uuidv4()
        }));

    createAction$.addListener({
        next() { },
        complete() { },
        error() { }
    });

    return {
        select(category) {
            return createAction$.filter(o => o.category === category);
        }
    }

}
