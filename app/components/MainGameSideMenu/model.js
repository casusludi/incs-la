import xs from 'xstream';

export default function model(props$,action$){

    const openMenuAction$ = action$.filter(o => o.type === "open-menu");
    const gotoAction$ = action$.filter(o => o.type === "goto");


    return {
        router$: gotoAction$.map(o => o.value),
        state$: props$.map( props => 

            xs.combine(
                openMenuAction$,
                props.location$
            ).map(([menu,location]) => 
                ({
                    open:menu.value,
                    location
                })
            ) 
            .startWith({
                open:false,
                location:{},
                ...props
            })
        ).flatten()
        .remember()
    }

  
}