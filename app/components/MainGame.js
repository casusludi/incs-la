import {run} from '@cycle/run';
import isolate from '@cycle/isolate';

import xs from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats'
import pairwise from 'xstream/extra/pairwise'
import sampleCombine from 'xstream/extra/sampleCombine'

import * as _ from 'lodash';

import {html} from 'snabbdom-jsx';

import {ChangeLocationButton} from './ChangeLocationButton';
import {Witness} from './Witness';
import {JSONReader} from './JSONReader';
import {TimeManager} from './TimeManager';
import {Map} from './Map';

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

// Takes a location id and makes an object made up of this id attribute and the location object contained in the json file
export function makeLocationObject(id, datas){
	return Object.assign({}, datas.locations[id], {id});
}

export function MainGame(sources) {
	const DOM = sources.DOM;
	const windowResize$ = sources.windowResize;

	const datas$ = sources.datas$.remember(); // sources.scenarioGenerator;
	
	// Get the first location
	const pathInit$ = datas$.map(datas =>
		makeLocationObject(datas.path[0].location, datas)
	);

	// Proxys creation
	const changeLocationProxy$ = xs.create();
	const correctNextChoosenLocationProxy$ = xs.create();
	
	const progression$ = correctNextChoosenLocationProxy$.fold((acc, x) => acc + 1, 0);

	const currentLocation$ = xs.merge(
		pathInit$,
		changeLocationProxy$,
	).remember();

	const lastLocation$ = currentLocation$.compose(pairwise).map(item => item[0]).startWith(null);

	const nextCorrectLocation$ = xs.combine(progression$, datas$).map(([progression, datas]) =>
		progression + 1 < datas.path.length ? 
			makeLocationObject(datas.path[progression + 1].location, datas) : 
			null
	);

	// Array stream of current location's links' ids
	// It's made of the current location's list of links in the json and the last location visited
	// sampleCombine to avoid duplicate signal on the stream (currentLocation and lastLocation emitting at the same time)
	const currentLocationLinksIds$ = xs.combine(currentLocation$, lastLocation$, nextCorrectLocation$) 
	// currentLocation$.compose(sampleCombine(lastLocation$, nextCorrectLocation$))
	.map(([currentLocation, lastLocation, nextCorrectLocation]) =>
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

	const correctNextChoosenLocation$ = currentLocation$.compose(sampleCombine(nextCorrectLocation$))
	.filter(([currentLocation, nextCorrectLocation]) =>
		currentLocation.id === nextCorrectLocation.id
	).mapTo(true);

	correctNextChoosenLocationProxy$.imitate(correctNextChoosenLocation$);
	
	const mapSinks = Map({DOM, windowResize$, currentLocation$, currentLocationLinksIds$, progression$, datas$});

	const changeLocation$ = xs.merge(
		changeLocationButtons$.map( 
				links => xs.merge(...links.map(link => link.changeLocation$))
		).flatten(),
		mapSinks.changeLocation$,
	);

	changeLocationProxy$.imitate(changeLocation$);

	const witnesses$ = xs.combine(currentLocation$.compose(sampleCombine(progression$)), datas$)
	.map(([[currentLocation, progression], datas]) => 
		Object.keys(currentLocation.places).map((key, value) =>
			isolate(Witness, key)({
				DOM: sources.DOM,
				props$: xs.of(Object.assign(
					{}, 
					currentLocation.places[key], 
					datas.path[progression].location === currentLocation.id ? 
						{clue: datas.path[progression].clues[key]} : 
						{},
				)),
			})
		)
	);

	const witnessQuestionned$ = witnesses$.map(witnesses =>
		xs.merge(...witnesses.map(witness => witness.questionned$))
	).flatten();

	const showDestinationLinks$ = xs.merge(
		witnessQuestionned$.mapTo(true),
		changeLocation$.mapTo(false),
	).startWith(false);

	const timeManagerSinks = TimeManager({DOM, datas$, changeLocation$, witnessQuestionned$});

	// End game reached ?
	const lastLocationReached$ = xs.combine(datas$, progression$)
	.filter(([datas, progression]) =>
		progression === (datas.path.length - 1)
	).mapTo(true);

	const noTimeRemaining$ = timeManagerSinks.elapsedTime$.filter(elapsedTime =>
		elapsedTime.remainingTime.raw <= 0
	).mapTo(true);

	const endGame$ = xs.merge(lastLocationReached$, noTimeRemaining$);

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
									<h1>{currentLocation.name}</h1>
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
		router: xs.combine(timeManagerSinks.elapsedTime$, endGame$).map(([elapsedTime, endGame]) =>
			({ pathname: "/end", type: 'push', state: { elapsedTime }})
		),
	};
	return sinks;
}