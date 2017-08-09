import isolate from '@cycle/isolate';

import xs from 'xstream';
import pairwise from 'xstream/extra/pairwise';
import sampleCombine from 'xstream/extra/sampleCombine';
import dropRepeats from 'xstream/extra/dropRepeats';

import * as _ from 'lodash';

import {html} from 'snabbdom-jsx';

import {ChangeLocationButton} from './ChangeLocationButton';
import {Witness} from './Witness';
import {TimeManager} from './TimeManager';
import {Map} from './Map';
import {JSONReader} from './JSONReader';
import {ScenarioGenerator} from './ScenarioGenerator';

import {makeLocationObject} from '../utils';
import {mixMerge, mixCombine} from '../utils';

export function MainGame(sources) {
	const {DOM, HTTP, datas$} = sources;
	
	const props$ = sources.storage.local.getItem('save').take(1).map(save =>
		Object.assign(
			{
				round: 0,
				progression: 0,
				// lastLocation: null,
				elapsedTime: 0,
				questionnedWitnesses: {},
				showDestinationLinks: false,
			},
			JSON.parse(save),
			sources.props && sources.props.round ? {round: sources.props.round} : {}
		)
	);
	const random$ = sources.random;
	
	// Emits an {widht, height} object containing the dimensions of the browser window each time it is resized
	const windowResize$ = sources.windowResize;

	const scenarioGenDataJsonSinks = JSONReader({HTTP, jsonPath$: xs.of("/scenarioGenData.json")});
	const scenarioGenDataJsonRequest$ = scenarioGenDataJsonSinks.request;
	const scenarioGenDataJsonResponse$ = scenarioGenDataJsonSinks.JSON;

	const pathPresets$ = xs.merge(
		xs.of({"id":"selectedLocationsIndexes","val":[24,15,3,13,12,7,18,16,17]}),
		xs.of({"id":{"locationId":"nantes","type":"witnesses"},"val":[0,1]}),
		xs.of({"id":{"locationId":"nantes","type":"data"},"val":0}),
		xs.of({"id":{"locationId":"nantes","type":"witness1Ploy","payload":"randomPloy"},"val":19}),
		xs.of({"id":{"locationId":"nantes","type":"witness2Ploy","payload":"randomPloy"},"val":13}),
		xs.of({"id":{"locationId":"nantes","type":"dataPloy","payload":"randomPloy"},"val":12}),
		xs.of({"id":{"locationId":"la-chapelle-basse-mer","type":"witnesses"},"val":[0,1]}),
		xs.of({"id":{"locationId":"la-chapelle-basse-mer","type":"data"},"val":1}),
		xs.of({"id":{"locationId":"la-chapelle-basse-mer","type":"witness1Ploy","payload":"randomPloy"},"val":14}),
		xs.of({"id":{"locationId":"la-chapelle-basse-mer","type":"witness2Ploy","payload":"randomPloy"},"val":20}),
		xs.of({"id":{"locationId":"la-chapelle-basse-mer","type":"dataPloy","payload":"randomPloy"},"val":25}),
		xs.of({"id":{"locationId":"nozay","type":"witnesses"},"val":[0,1]}),
		xs.of({"id":{"locationId":"nozay","type":"data"},"val":0}),
		xs.of({"id":{"locationId":"nozay","type":"witness1Ploy","payload":"randomPloy"},"val":21}),
		xs.of({"id":{"locationId":"nozay","type":"witness2Ploy","payload":"randomPloy"},"val":10}),
		xs.of({"id":{"locationId":"nozay","type":"dataPloy","payload":"randomPloy"},"val":16}),
		xs.of({"id":{"locationId":"guemene","type":"witnesses"},"val":[0,1]}),
		xs.of({"id":{"locationId":"guemene","type":"data"},"val":0}),
		xs.of({"id":{"locationId":"guemene","type":"witness1Ploy","payload":"randomPloy"},"val":16}),
		xs.of({"id":{"locationId":"guemene","type":"witness2Ploy","payload":"randomPloy"},"val":11}),
		xs.of({"id":{"locationId":"guemene","type":"dataPloy","payload":"randomPloy"},"val":22}),
		xs.of({"id":{"locationId":"la-montagne","type":"witnesses"},"val":[0,1]}),
		xs.of({"id":{"locationId":"la-montagne","type":"data"},"val":0}),
		xs.of({"id":{"locationId":"la-montagne","type":"witness1Ploy","payload":"randomPloy"},"val":25}),
		xs.of({"id":{"locationId":"la-montagne","type":"witness2Ploy","payload":"randomPloy"},"val":2}),
		xs.of({"id":{"locationId":"la-montagne","type":"dataPloy","payload":"randomPloy"},"val":25}),
		xs.of({"id":{"locationId":"haute-goulaine","type":"witnesses"},"val":[0,1]}),
		xs.of({"id":{"locationId":"haute-goulaine","type":"data"},"val":0}),
		xs.of({"id":{"locationId":"haute-goulaine","type":"witness1Ploy","payload":"randomPloy"},"val":19}),
		xs.of({"id":{"locationId":"haute-goulaine","type":"witness2Ploy","payload":"randomPloy"},"val":23}),
		xs.of({"id":{"locationId":"haute-goulaine","type":"dataPloy","payload":"randomPloy"},"val":3}),
		xs.of({"id":{"locationId":"saint-nazaire","type":"witnesses"},"val":[1,0]}),
		xs.of({"id":{"locationId":"saint-nazaire","type":"data"},"val":0}),
		xs.of({"id":{"locationId":"saint-nazaire","type":"witness1Ploy","payload":"randomPloy"},"val":8}),
		xs.of({"id":{"locationId":"saint-nazaire","type":"witness2Ploy","payload":"randomPloy"},"val":26}),
		xs.of({"id":{"locationId":"saint-nazaire","type":"dataPloy","payload":"randomPloy"},"val":9}),
		xs.of({"id":{"locationId":"gorges","type":"witnesses"},"val":[1,0]}),
		xs.of({"id":{"locationId":"gorges","type":"data"},"val":0}),
		xs.of({"id":{"locationId":"gorges","type":"witness1Ploy","payload":"randomPloy"},"val":10}),
		xs.of({"id":{"locationId":"gorges","type":"witness2Ploy","payload":"randomPloy"},"val":1}),
		xs.of({"id":{"locationId":"gorges","type":"dataPloy","payload":"randomPloy"},"val":10}),
		xs.of({"id":{"locationId":"port-saint-pere","type":"witnesses"},"val":[1,0]}),
		xs.of({"id":{"locationId":"port-saint-pere","type":"data"},"val":0}),
		xs.of({"id":{"locationId":"port-saint-pere","type":"witness1Ploy","payload":"randomPloy"},"val":23}),
		xs.of({"id":{"locationId":"port-saint-pere","type":"witness2Ploy","payload":"randomPloy"},"val":5}),
		xs.of({"id":{"locationId":"port-saint-pere","type":"dataPloy","payload":"randomPloy"},"val":20}),
	);

	const scenarioProps$ = xs.combine(props$, datas$).map(([props, datas]) => ({
		pathLocationsNumber: datas.settings.pathLocationsNumber[props.round],
		availableLocations: Object.keys(datas.locations),
	})).remember();

	const {generatedPath$, randomRequests$} = ScenarioGenerator({scenarioProps$, jsonResponse$: scenarioGenDataJsonResponse$, selectedValue$: /*pathPresets$*/ random$ })

	const path$ = xs.combine(generatedPath$, props$).map(([generatedPath, props]) =>
		props.path ? props.path : generatedPath
	);

	// Proxys creation
	const changeLocationProxy$ = xs.create();
	const correctNextChoosenLocationProxy$ = xs.create();
	
	const progression$ = props$.map(props =>
		correctNextChoosenLocationProxy$.fold((acc, x) => acc + 1, props.progression)
	).flatten().remember();

	// Get the first location
	const currentLocationInit$ = xs.combine(path$, props$, datas$).map(([path, props, datas]) =>
		makeLocationObject(props.currentLocation ? props.currentLocation : path[0].location, datas)
	);

	const currentLocation$ = xs.merge(
		currentLocationInit$,
		changeLocationProxy$,
	).remember();
	
	const lastLocation$ = xs.combine(props$, datas$).map(([props, datas]) =>
		currentLocation$.startWith(props.lastLocation ? makeLocationObject(props.lastLocation, datas) : props.lastLocation).compose(pairwise).map(item => item[0])
	).flatten();

	const nextCorrectLocation$ = xs.combine(progression$, path$, datas$).map(([progression, path, datas]) =>
		progression + 1 < path.length ? 
			makeLocationObject(path[progression + 1].location, datas) : 
			null
	).remember();

	const currentCorrectLocation$ = xs.combine(path$, progression$).map(([path, progression]) =>
		path[progression]
	);

	// Array stream of current location's links' ids
	// It's made of the current location's list of links in the json and the last location visited
	// sampleCombine to avoid duplicate signal on the stream (currentLocation and lastLocation emitting at the same time)
	const currentLocationLinksIds$ =
	// nextCorrectLocation$.compose(sampleCombine(lastLocation$, currentLocation$))
	// .map(([nextCorrectLocation, lastLocation, currentLocation]) =>
	xs.combine(currentLocation$, lastLocation$, nextCorrectLocation$, currentCorrectLocation$) 
	.map(([currentLocation, lastLocation, nextCorrectLocation, currentCorrectLocation]) =>
		_.chain(lastLocation ? [lastLocation.id] : [])
		.concat(currentCorrectLocation.location === currentLocation.id ? currentCorrectLocation.ploys : currentLocation.links)
		.concat(nextCorrectLocation && currentCorrectLocation.location === currentLocation.id ? [nextCorrectLocation.id] : [])
		.uniq()
		.filter((o) => o !== currentLocation.id)
		.shuffle()
		.value()
	);
	
	const currentLocationLinks$ = xs.combine(currentLocationLinksIds$, datas$)
	.map(([currentLocationLinksIds, datas]) => 
		currentLocationLinksIds.map(currentLocationLinkId =>
			makeLocationObject(currentLocationLinkId, datas)
		)
	);

	const changeLocationButtons$ = currentLocationLinks$.map(currentLocationLinks => 
		currentLocationLinks.map((currentLocationLink, key) =>
			isolate(ChangeLocationButton, key)({
				DOM, 
				props$: xs.of(currentLocationLink),
			})
		)
	);
	
	const mapSinks = Map({DOM, windowResize$, currentLocation$, currentLocationLinksIds$, progression$, path$, datas$});

	const changeLocation$ = xs.merge(
		changeLocationButtons$.compose(mixMerge('changeLocation$')),
		mapSinks.changeLocation$,
	);

	changeLocationProxy$.imitate(changeLocation$);

	const correctNextChoosenLocation$ = 
	xs.combine(changeLocation$, nextCorrectLocation$)
	.filter(([changeLocation, nextCorrectLocation]) =>
		nextCorrectLocation && changeLocation.id === nextCorrectLocation.id
	).mapTo(true);

	correctNextChoosenLocationProxy$.imitate(correctNextChoosenLocation$);
	
	const witnessesProps$ = xs.merge(
		props$,
		changeLocation$.mapTo(null),
	);

	const witnesses$ = xs.combine(currentLocation$, progression$, path$, witnessesProps$)
	.map(([currentLocation, progression, path, witnessesProps]) => 
		Object.keys(currentLocation.places).map((key, value) =>
			isolate(Witness, key)({
				DOM: sources.DOM,
				props$: xs.of(Object.assign(
					{},
					{key},
					currentLocation.places[key], 
					path[progression].location === currentLocation.id ? 
						{clue: path[progression].clues[key]} : 
						{},
					{showResult: witnessesProps ? witnessesProps.questionnedWitnesses[key] : false},
				)),
			})
		)
	).remember();

	const questionnedWitness$ = witnesses$.map(witnesses =>
		xs.merge(...witnesses.map(witness => witness.questionned$))
	).flatten();
	
	const questionnedWitnesses$ = props$.map(props =>
		xs.merge(
			questionnedWitness$,
			changeLocation$.mapTo('reset')
		).fold((acc, item) => item === 'reset' ? {} : Object.assign(acc, {[item]: true}), props.questionnedWitnesses)
	).flatten();

	const showDestinationLinks$ = props$.map(props =>
		xs.merge(
			questionnedWitness$.mapTo(true),
			changeLocation$.mapTo(false),
		).startWith(props.showDestinationLinks).compose(dropRepeats())
	).flatten().remember();

	const timeManagerSinks = TimeManager({DOM, props$/*: props$.map(props => props.elapsedTime)*/, datas$, changeLocation$, questionnedWitness$});

	// End game reached ?
	const lastLocationReached$ = xs.combine(path$, progression$)
	.filter(([path, progression]) =>
		progression === (path.length - 1)
	).mapTo({type: "lastLocationReached"});

	const noTimeRemaining$ = timeManagerSinks.timeDatas$.filter(timeDatas =>
		timeDatas.remainingTime.raw <= 0
	).mapTo({type: "noTimeRemaining"});

	const endGame$ = xs.merge(lastLocationReached$, noTimeRemaining$);
	
	const resetSave$ = endGame$.mapTo({key: 'save', value: null}).debug("reset");

	const endGameRouter$ = xs.combine(resetSave$, timeManagerSinks.timeDatas$, endGame$, props$, datas$)
	.map(([resetSave, timeDatas, endGame, props, datas]) => {
		const roundNb = datas.settings.pathLocationsNumber.length;	
		
		if(endGame.type === "lastLocationReached" && props.round + 1 < roundNb)
			return { pathname: "/redirect", type: 'push', state: { props: { round: props.round + 1/*, newGame: true*/ }}}
			// return { pathname: "/game", type: 'push', state: { props: { round: props.round + 1/*, newGame: true*/ }}}
		else/* if(endGame.type === "noTimeRemaining")*/
			return { pathname: "/end", type: 'push', state: { timeDatas }}
	}).debug("endGame");

	const menuRouter$ = DOM.select('.js-go-to-main-menu').events('click').map(goToMainMenu => "/");

	const save$ = xs.combine(props$, path$, currentLocation$, lastLocation$, progression$, timeManagerSinks.timeDatas$, questionnedWitnesses$, showDestinationLinks$)
	.map(([props, path, currentLocation, lastLocation, progression, timeDatas, questionnedWitnesses, showDestinationLinks]) =>
		({ 
			key: 'save',
			value: JSON.stringify(
				Object.assign(
					{},
					props,
					{
						currentLocation: currentLocation.id,
						progression,
						elapsedTime: timeDatas.elapsedTime.raw,
						questionnedWitnesses,
						showDestinationLinks,
						path,
					},
					lastLocation ? {lastLocation: lastLocation.id} : {},
				)
			)
		})
	);

	const routerSink$ = xs.merge(
		endGameRouter$,
		menuRouter$,
	);

	// View
	const witnessesVTree$ = witnesses$.compose(mixCombine('DOM'));
	const linksVTree$ = changeLocationButtons$.compose(mixCombine('DOM'));
	const timeManagerVTree$ = timeManagerSinks.DOM;
	const mapVTree$ = mapSinks.DOM;

	const DOMSink$ = xs.combine(linksVTree$, currentLocation$, witnessesVTree$, timeManagerVTree$, mapVTree$, props$, datas$, showDestinationLinks$).map(
		([linksVTree, currentLocation, witnessesVTree, timeManagerVTree, mapVTree, props, datas, showDestinationLinks]) =>
			<section className="main">
				<section className="main-content" >
					<section className="city" style={{backgroundImage: "url("+currentLocation.image+")"}} >
						<section className="city-content">
							<section className="col-main">
								<header className="header">
									<h1>{currentLocation.name + " - Round : " + (props.round + 1)	}</h1>
								</header>
								<section className="place-list" >
									{witnessesVTree}
								</section>
							</section>
							<aside className="aside">
								<div classNames="city-desc scrollable-panel panel">
									{currentLocation.desc}
								</div>
								<div classNames="panel scrollable-panel">
									{datas.texts.gameDescription}
								</div>
								<div classNames="game-time panel red-panel">
									{timeManagerVTree}
								</div>
            					<button className="js-go-to-main-menu button-3d" type="button">Menu Principal</button>
							</aside>
						</section>
						<footer>
							<div className="travel-panel">
								<div className="travel-panel-content">
									{showDestinationLinks ? mapVTree : datas.texts.travelDescription}
								</div>
							</div>
						</footer>
					</section>
				</section>
			</section>
		);

	const sinks = {
		DOM: DOMSink$,
		router: routerSink$,
		HTTP: scenarioGenDataJsonRequest$,
		random: randomRequests$,
		storage: xs.merge(
			save$,
			resetSave$,
		)
	};
	return sinks;
}