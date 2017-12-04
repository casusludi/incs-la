import xs from 'xstream';

export default function model(props$,action$){

    const openMenuAction$ = action$.filter(o => o.type === "open-menu");
    const gotoAction$ = action$.filter(o => o.type === "goto");


    return {
        router$: gotoAction$.map(o => o.value),
        state$: props$.map( props => 

            xs.combine(
                openMenuAction$,
                props.location$,
                props.datas$
            ).map(([menu,location,datas]) => 
                ({
                    open:menu.value,
                    location,
                    datas
                })
            ) 
            .startWith({
                open:false,
                location:{},
                datas:{texts:{}},
                ...props
            })
        ).flatten()
        .remember()
    }

  
}