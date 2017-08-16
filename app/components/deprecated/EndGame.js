import { html } from 'snabbdom-jsx';

function intent(DOM){
    const click$ = DOM
        .select('.button-3d')
        .events('click');

    return click$;
}

function view(value$, timeDatas){
    const success = timeDatas ? timeDatas.remainingTime.raw > 0 : false;

    const vdom$ = value$.map(value => (
        <div classNames="content end" style={{ backgroundImage: "url("+ (success ? value.settings.images.endWin : value.settings.images.endLose) +")" }} >
            <div className="modal">
                {success ? 
                    <div classNames="panel final-panel">
                        {value.texts.win}
                        {/*timeDatas.remainingTime.formatted*/}
                    </div> :
                    <div classNames="panel final-panel">
                        {value.texts.loose}
                    </div>
                }
                <a className="button-3d">Rejouer</a>
            </div>
        </div>
	));

    return vdom$;
}

export function EndGame(sources) {
	const {DOM, timeDatas, datas$} = sources;

    const action$ = intent(DOM);
    const vdom$ = view(datas$, timeDatas);

    const sinks = {
        DOM: vdom$,
		router: action$.mapTo("/"),
    };

    return sinks;
}
