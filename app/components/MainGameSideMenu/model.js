import xs from 'xstream';

export default function model(props$,action$){

    return props$.map( props => 
        action$.map(
            action => ({
                ...props,
                open: action.value
            })
        ).startWith(props)
    ).flatten()
    .remember();
}