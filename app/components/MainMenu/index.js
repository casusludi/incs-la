import xs from 'xstream';
import delay from 'xstream/extra/delay';

import {html} from 'snabbdom-jsx';

/*
Menu principal assez simple qui contient 2 boutons :
	- Commencer une nouvelle partie
	- Charger la partie sauvegardée
Les 2 redirigent vers le composant Redirect mais dans le cas d'une nouvelle partie la sauvegarde est préalablement écrasée.
*/

export function MainMenu(sources) {

	const {DOM} = sources;
	// Récupère la sauvegarde si elle existe pour pouvoir afficher le numéro du round sauvegardé (sinon round null)
	const props$ = sources.storage.local.getItem('save').take(1).map(save => 
		Object.assign({
			round: null
		}, JSON.parse(save))
	);

	const action$ = xs.merge(
		DOM.select('.js-new-game').events('click').mapTo({type: "newGame"}),
		DOM.select('.js-resume-game').events('click').mapTo({type: "resumeGame"}),
	);

	// Écrase la sauvegarde existante
	const resetSave$ = action$.filter(action => action.type === "newGame").mapTo({key: 'save', value: null});

	// Un délai de 1ms est le seul moyen que j'ai trouvé ici pour faire en sorte que le redirection s'effectue après l'écrasement de la sauvegarde. Sans ce délai la redirection se fait systématiquement avant et le joueur reprend la partie sauvegardée qui n'a pas eu le temps d'être réinitialisée.
	const routerSink$ = action$.map(action => "/redirect").compose(delay(1));

	const DOMSink$ = props$.map(props =>
		<div className="menu-principal">
			<h1>Menu Principal</h1>
			<button className="js-new-game button-3d">NEW GAME</button>
			{props.round !== null ? <button className="js-resume-game button-3d">RESUME GAME<br/>Round {props.round + 1}</button> : ""}
		</div>
	);

    const sinks = {
		DOM: DOMSink$,
		router: routerSink$,
		storage: resetSave$,
	};

	return sinks;
}