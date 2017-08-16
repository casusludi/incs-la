import { html } from 'snabbdom-jsx';

/*
Affiche juste une simple boîte de dialogue redirigeant vers le menu principal.
*/

function intent(DOM){
    const click$ = DOM
        .select('.js-go-to-main-menu')
        .events('click');

    return click$;
}

function view(value$){
    const vdom$ = value$.map(value => (
        <div classNames="content end" style={{ backgroundImage: "url("+ value.settings.images.endWin +")" }} >
            <div className="modal">
                <div classNames="panel final-panel">
                    {value.texts.win}
                </div>
                <a className="button-3d js-go-to-main-menu">Rejouer</a>
            </div>
        </div>
	));

    return vdom$;
}

export function EndGame(sources) {
    const {DOM, datas$} = sources;

    const action$ = intent(DOM);
    const vdom$ = view(datas$);

    const sinks = {
        DOM: vdom$,
		router: action$.mapTo("/"),
    };

    return sinks;
}
