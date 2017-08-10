import xs from 'xstream';

export function Redirect(sources) {
	const datas$ = sources.datas$;
	
	const props$ = sources.storage.local.getItem('save').take(1).map(save =>
		Object.assign(
			{round: 0},
			JSON.parse(save),
			sources.props && sources.props.round ? {round: sources.props.round} : {}
		)
	);
	
	const routerSink$ = xs.combine(props$, datas$).map(([props, datas]) => {
		if(datas.settings.scenarioStucture[props.round].type === 'cutscene')
			return ({ pathname: "/cutscene", type: 'push', state:{ props: Object.assign(props, {cutsceneName: datas.settings.scenarioStucture[props.round].payload.cutsceneName}) }})
		if(datas.settings.scenarioStucture[props.round].type === 'investigation')
			return ({ pathname: "/game", type: 'push', state:{ props }})
	});

	const sinks = {
		router: routerSink$,
	};
	
	return sinks;
}