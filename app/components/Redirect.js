import xs from 'xstream';

/*
Ce composant est utilisé pour rediriger le joueur entre chaque round. C'est utile afin de factoriser le code qui va déterminer vers quelle page être redirigé.
*/
export function Redirect(sources) {
	const datas$ = sources.datas$;
	
	// Props transférés à la redirection contenant notamment le numéro du round actuel.
	const props$ = sources.storage.local.getItem('save').take(1).map(save =>
		Object.assign(
			{round: 0}, // Si le round n'est fourni ni par une sauvegarde précédente, ni par les props passés par le composant précédent, alors on initialise le round à 0 (c'est la première redirection).
			JSON.parse(save), // On ajoute aux props les données récupèrées sur la sauvegarde locale (si elle est fournie). Concrètement utilisé dans le cas où la partie à été quittée en cours de route.
			sources.props && sources.props.round ? {round: sources.props.round} : {} // Si les props sont fournis dont l'attribut round alors ce sera celui qui prévaudra. Concrètement utilisé dans le cas où on passe au round suivant (attribut incrémenté dans la page d'où l'on arrive avant la redirection ; Cutscene ou MainGame)
		)
	);
	
	// Redirection
	const routerSink$ = xs.combine(props$, datas$).map(([props, datas]) => {
		const roundNb = datas.settings.scenarioStucture.length;

		// Si le joueur a dépassé le dernier round alors on le redirige vers la page de fin (actuellement générique => à modifier)
		if(props.round >= roundNb)
			return "/end";
		// Sinon on le redirige vers une cutscene...
		else if(datas.settings.scenarioStucture[props.round].type === 'cutscene')
			return ({ pathname: "/cutscene", type: 'push', state:{ props: Object.assign(props, {cutsceneName: datas.settings.scenarioStucture[props.round].payload.cutsceneName}) }})
		// ... ou un round d'investigation
		else if(datas.settings.scenarioStucture[props.round].type === 'investigation')
			return ({ pathname: "/game", type: 'push', state:{ props }}) // En transférant toujours les props contenant le numéro du round actuel
	});

	const sinks = {
		router: routerSink$,
	};
	
	return sinks;
}