import isolate from '@cycle/isolate';

import xs from 'xstream';
import pairwise from 'xstream/extra/pairwise'
import sampleCombine from 'xstream/extra/sampleCombine'
import dropRepeats from 'xstream/extra/dropRepeats'

import * as _ from 'lodash';

import {html} from 'snabbdom-jsx';

import {ChangeLocationButton} from './ChangeLocationButton';
import {Witness} from './Witness';
import {TimeManager} from './TimeManager';
import {Map} from './Map';
import {JSONReader} from './JSONReader';
import {ScenarioGenerator} from './ScenarioGenerator';

import {makeLocationObject} from '../utils';

import delay from 'xstream/extra/delay'

// function intent(sources){
// 	const action$ = xs.of(null);

// 	return action$;
// }

// function model(action$, props$){
// 	const state$ = xs.of(null);

// 	return state$;
// }

// function view(state$){
// 	const vdom$ = xs.of(null);

// 	return vdom$;
// }

export function MainGame(sources) {
	const {DOM, HTTP, datas$} = sources;
	const round = sources.round ? sources.round : 0;
	const random$ = sources.random;
	
	const windowResize$ = sources.windowResize;

	const scenarioGenDataJsonSinks = JSONReader({HTTP, jsonPath$: xs.of("/scenarioGenData.json")});
	const scenarioGenDataJsonRequest$ = scenarioGenDataJsonSinks.request;
	const scenarioGenDataJsonResponse$ = scenarioGenDataJsonSinks.JSON;

	const pathPresets$ = xs.merge(
		xs.of({id: "selectedLocationsIndexes", val: [18, 12, 2, 23, 9, 4, 20, 16, 5]}),
		xs.of({id: {locationId: "nantes", type: "witnesses"}, val: [1, 0]}),
		xs.of({id: {locationId: "nantes", type: "data"}, val: 1}),
		xs.of({id: {locationId: "port-saint-pere", type: "witnesses"}, val: [1, 0]}),
		xs.of({id: {locationId: "port-saint-pere", type: "data"}, val: 0}),
		xs.of({id: {locationId: "guerande", type: "witnesses"}, val: [0, 1]}),
		xs.of({id: {locationId: "guerande", type: "data"}, val: 0}),
		xs.of({id: {locationId: "vallet", type: "witnesses"}, val: [0, 1]}),
		xs.of({id: {locationId: "vallet", type: "data"}, val: 0}),
		xs.of({id: {locationId: "haute-goulaine", type: "witnesses"}, val: [0, 1]}),
		xs.of({id: {locationId: "haute-goulaine", type: "data"}, val: 0}),
		xs.of({id: {locationId: "pornic", type: "witnesses"}, val: [0, 1]}),
		xs.of({id: {locationId: "pornic", type: "data"}, val: 0}),
		xs.of({id: {locationId: "prefailles", type: "witnesses"}, val: [1, 0]}),
		xs.of({id: {locationId: "prefailles", type: "data"}, val: 0}),
		xs.of({id: {locationId: "ancenis", type: "witnesses"}, val: [1, 0]}),
		xs.of({id: {locationId: "ancenis", type: "data"}, val: 0}),
		xs.of({id: {locationId: "coueron", type: "witnesses"}, val: [1, 0]}),
		xs.of({id: {locationId: "coueron", type: "data"}, val: 1}),
		xs.of({id: {locationId: "gorges", type: "witnesses"}, val: [0, 1]}),
		xs.of({id: {locationId: "gorges", type: "data"}, val: 0}),
	);

	const {path$, randomRequests$} = ScenarioGenerator({jsonResponse$: scenarioGenDataJsonResponse$, selectedValue$: /*pathPresets$*/ random$ })

	// Get the first location
	const currentLocationInit$ = xs.combine(path$, datas$).map(([path, datas]) =>
		makeLocationObject(path[0].location, datas)
	);

	// Proxys creation
	const changeLocationProxy$ = xs.create();
	const correctNextChoosenLocationProxy$ = xs.create();
	
	const progression$ = correctNextChoosenLocationProxy$.fold((acc, x) => acc + 1, 0);

	// map path$ to wait for the json loading
	const currentLocation$ = xs.merge(
		currentLocationInit$,
		changeLocationProxy$,
	).remember();
	
	const lastLocation$ = currentLocation$.compose(pairwise).map(item => item[0]).startWith(null);

	const nextCorrectLocation$ = xs.combine(progression$, path$, datas$).map(([progression, path, datas]) =>
		progression + 1 < path.length ? 
			makeLocationObject(path[progression + 1].location, datas) : 
			null
	);

	// Array stream of current location's links' ids
	// It's made of the current location's list of links in the json and the last location visited
	// sampleCombine to avoid duplicate signal on the stream (currentLocation and lastLocation emitting at the same time)
	const currentLocationLinksIds$ = 
	// xs.combine(currentLocation$, lastLocation$, nextCorrectLocation$) 
	// currentLocation$.compose(sampleCombine(lastLocation$, nextCorrectLocation$))
	// .map(([currentLocation, lastLocation, nextCorrectLocation]) =>
	nextCorrectLocation$.compose(sampleCombine(lastLocation$, currentLocation$))
	.map(([nextCorrectLocation, lastLocation, currentLocation]) =>
		_.chain(currentLocation.links || [])
		.concat(lastLocation ? [lastLocation.id] : [])
		.concat(nextCorrectLocation ? [nextCorrectLocation.id] : [])
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
		changeLocationButtons$.map( 
				links => xs.merge(...links.map(link => link.changeLocation$))
		).flatten(),
		mapSinks.changeLocation$,
	);

	changeLocationProxy$.imitate(changeLocation$);

	const correctNextChoosenLocation$ = 
	xs.combine(changeLocation$, nextCorrectLocation$)
	.filter(([changeLocation, nextCorrectLocation]) =>
		changeLocation.id === nextCorrectLocation.id
	).mapTo(true);

	correctNextChoosenLocationProxy$.imitate(correctNextChoosenLocation$);

	const witnesses$ = xs.combine(currentLocation$, progression$, path$)
	.map(([currentLocation, progression, path]) => 
		Object.keys(currentLocation.places).map((key, value) =>
			isolate(Witness, key)({
				DOM: sources.DOM,
				props$: xs.of(Object.assign(
					{}, 
					currentLocation.places[key], 
					path[progression].location === currentLocation.id ? 
						{clue: path[progression].clues[key]} : 
						{},
				)),
			})
		)
	).remember();

	const witnessQuestionned$ = witnesses$.map(witnesses =>
		xs.merge(...witnesses.map(witness => witness.questionned$))
	).flatten();

	const showDestinationLinks$ = xs.merge(
		witnessQuestionned$.mapTo(true),
		changeLocation$.mapTo(false),
	).startWith(false).compose(dropRepeats());

	const timeManagerSinks = TimeManager({DOM, datas$, changeLocation$, witnessQuestionned$});

	// End game reached ?
	const lastLocationReached$ = xs.combine(path$, progression$)
	.filter(([path, progression]) =>
		progression === (path.length - 1)
	).mapTo(true);

	const noTimeRemaining$ = timeManagerSinks.elapsedTime$.filter(elapsedTime =>
		elapsedTime.remainingTime.raw <= 0
	).mapTo(true);

	const endGame$ = xs.merge(lastLocationReached$, noTimeRemaining$);

	const roundNb = 3;
	const routerSink$ = xs.combine(timeManagerSinks.elapsedTime$, endGame$).map(([elapsedTime, endGame]) =>
		round + 1 < roundNb ? 
			{ pathname: "/game", type: 'push', state: { round: round + 1 }} :
			{ pathname: "/end", type: 'push', state: { elapsedTime }}
	);

	// View
	const witnessesVTree$ = witnesses$.map(witnesses => xs.combine(...witnesses.map(witness => witness.DOM))).flatten();
	const linksVTree$ = changeLocationButtons$.map(links => xs.combine(...links.map(link => link.DOM))).flatten();
	const timeManagerVTree$ = timeManagerSinks.DOM;
	const mapVTree$ = mapSinks.DOM;

	const DOMSink$ = xs.combine(linksVTree$, currentLocation$, witnessesVTree$, timeManagerVTree$, mapVTree$, datas$, showDestinationLinks$).map(
		([linksVTree, currentLocation, witnessesVTree, timeManagerVTree, mapVTree, datas, showDestinationLinks]) =>
			<section className="main">
				<section className="main-content" >
					<section className="city" style={{backgroundImage: "url("+currentLocation.image+")"}} >
						<section className="city-content">
							<section className="col-main">
								<header className="header">
									<h1>{currentLocation.name + " - Round : " + (round + 1)	}</h1>
									{/*{mapVTree}*/}
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
							</aside>
						</section>
						<footer>
							<div className="travel-panel">
								{showDestinationLinks ?
									mapVTree
									/*<div className="travel-panel-content">
										<div className="travel-label">{datas.texts.travelLabel}</div>
										<nav>
											{linksVTree}
										</nav>
									</div> */
									:
									<div className="travel-panel-content">
										{datas.texts.travelDescription}
									</div>
								}
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
	};
	return sinks;
}