import xs from 'xstream';

import { html } from 'snabbdom-jsx';

import * as _ from 'lodash';

/*
Ce composant est utilisé pour des cutscenes (initialement l'introduction) soit des succession d'images de type diapo. Il suffit de lui fournir le nombre de slides ainsi que le nom de la cutscene voulue (ex: 'intro') et d'avoir préalablement placé dans le dossier assets un dossier à ce nom contenant des images jpeg nommées XXX.jpg (ex: 000.jpg, 001.jpg, etc)
*/

function intent(DOM){
	// 2 actions : passer à la slide suivante ou passer l'ensemble de la cutscene
    const click$ = xs.merge(
		DOM.select('.js-slide').events('click').mapTo({type: "nextSlide"}),
		DOM.select('.js-end-cut-scene').events('click').mapTo({type: "endCutScene"}),
	);

    return click$;
}

function model(action$, props$, datas$){
	// Compteur du numéro de la slide actuelle
	const slideIndex$ = action$.filter(action => action.type === "nextSlide").fold((acc, x) => acc + 1, 0);
	
	const state$ = xs.combine(slideIndex$, props$, datas$).map(([slideIndex, props, datas]) => {
		// Tronque le compteur de slide pour ne pas qu'il dépasse la taille de la cutscene
		const truncatedSlideIndex = _.clamp(slideIndex, datas.settings.cutscenes[props.cutsceneName].length - 1);

		return ({
			// Chemin de la slide actuelle
			image: `${datas.settings.cutscenes[props.cutsceneName].path}/${_.padStart(truncatedSlideIndex, 3, '0')}.jpg`,
			// Booléen qui resprésente si la cutscene est terminée
			ready: slideIndex >= datas.settings.cutscenes[props.cutsceneName].length - 1,
		});
	});

	return state$;
}

function view(state$, props$, datas$){
    const vdom$ = xs.combine(state$, props$, datas$).map(([state, props, datas]) =>
		<div classNames="content js-slide" style={{backgroundImage: "url("+ state.image +")"}} >
			{state.ready ? // Si la cutscene est terminée alors on affiche la "boîte de dialogue" de fin
			<div className="modal">
				<div className="panel">
					{datas.settings.cutscenes[props.cutsceneName].message}
				</div>
				<a classNames="js-end-cut-scene button-3d">{datas.settings.cutscenes[props.cutsceneName].button}</a>
			</div> :
			<div className="skip-button-container">
				<a classNames="js-end-cut-scene button-3d">Skip ►</a>
			</div>}
		</div>
	);

    return vdom$;
}

export function Cutscene(sources) {
	const {DOM, datas$} = sources;
	const props$ = xs.of(sources.props);

    const action$ = intent(DOM);
    const state$ = model(action$, props$, datas$);
    const vdom$ = view(state$, props$, datas$);

	// On sauvegarde le numéro actuel du round contenu dans les props (envoyé par le composant Redirect) afin de retomber directement sur la cutscene si le jeu a été quitté à ce moment là.
	const save$ = props$.map(props => ({ 
		key: 'save',
		value: JSON.stringify(props),
	}));

	// Si le bouton 'skip' ou la boite de dialogue finale sont cliqués alors on redirige le joueur vers le composant Redirect en incrémentant préalablement le numéro du round dans les props
	const routerSink$ = props$.map(props =>
		action$.filter(action => action.type === "endCutScene").map(a => {
			return ({ pathname: "/redirect", type: 'push', state:{ props: Object.assign(props, {round: props.round + 1}) }})
		})
	).flatten();

    const sinks = {
        DOM: vdom$,
		router: routerSink$,
		storage: save$,
    };

    return sinks;
}