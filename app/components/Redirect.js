import xs from 'xstream';

export function Redirect(sources) {
	const datas$ = sources.datas$;
	console.log(sources.props && sources.props.round ? sources.props.round : 0);
	const props$ = sources.storage.local.getItem('save').take(1).map(save =>
		Object.assign(
			{round: 0},
			JSON.parse(save),
			sources.props && sources.props.round ? {round: sources.props.round} : {}
		)
	).debug("props");
	
	const routerSink$ = xs.combine(props$, datas$).map(([props, datas]) => {
		// console.log("round", props.round);
		// sources.props ? console.log("sources.props", sources.props) : {};

		if(typeof datas.settings.pathLocationsNumber[props.round] === 'string')
			return ({ pathname: "/cutscene", type: 'push', state:{ props: Object.assign(props, {cutsceneName: datas.settings.pathLocationsNumber[props.round]}) }})
		else if(typeof datas.settings.pathLocationsNumber[props.round] === 'number')
			return ({ pathname: "/game", type: 'push', state:{ props }})
	});

	const sinks = {
		router: routerSink$,
	};
	
	return sinks;
}