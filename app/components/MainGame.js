/*
Dans la documentation certains mots peuvent prêter à confusion. Voilà le lexique pour éviter toute ambiguïté :
	- indice / clue : Indice de l'enquête
	- id : chaine de caractère unique permettant d'identifier un objet/variable
	- index : valeur numérique identifiant un élement d'une liste/tableau
	- chemin / scénario : Ensemble des villes ordonnées que le joueur doit parcourir pour achever une étape du jeu
*/

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
	// Récupération des sources
	const {DOM, HTTP, datas$} = sources;
	const random$ = sources.random;
	const windowResize$ = sources.windowResize;
	
	// Création des props
	const props$ = sources.storage.local.getItem('save').take(1).map(save =>
		Object.assign(
			// Props par défaut
			{
				round: 0,
				progression: 0,
				// lastLocation: null,
				elapsedTime: 0,
				questionnedWitnesses: {},
				showDestinationLinks: false,
				successesNumber: 0,
			},
			// Props enregistrés localement
			JSON.parse(save),
			// Props transférés depuis la page précédente
			sources.props,
		)
	);

	// Chargement du .json contenant les données permettant de générer le scénario random
	const scenarioGenDataJsonSinks = JSONReader({HTTP, jsonPath$: xs.of("/scenarioGenData.json")});
	const scenarioGenDataJsonRequest$ = scenarioGenDataJsonSinks.request;
	const scenarioGenDataJsonResponse$ = scenarioGenDataJsonSinks.JSON;

	// Presets pour la génération d'un scénario fixe (utile pour le débugage)
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

	// Props pour la génération de scénario random
	// pathLocationsNumber - nombre de lieux contenus dans le "chemin" généré / longueur du scénario
	const scenarioProps$ = xs.combine(props$, datas$).map(([props, datas]) => ({
		pathLocationsNumber: datas.settings.scenarioStucture[props.round].payload.pathLocationsNumber,
	})).remember();

	// Création d'un composant ScenarioGenerator dont le but est de transformé le .json contenant les infos en de génération de scénario en un objet représentant le scénario
	// La source selectedValue$ emet les réponses aux requêtes random (elle peut être remplacée par des réponses fixes en remplaçant le la source random$ par pathPresets$)
	const scenarioGeneratorSinks = ScenarioGenerator({props$: scenarioProps$, jsonResponse$: scenarioGenDataJsonResponse$, selectedValue$: /*pathPresets$*/ random$ })
	// Requêtes envoyées au driver random
	const scenarioGeneratorRandomRequests$ = scenarioGeneratorSinks.randomRequests$;
	// Scénario généré par le composant
	const generatedPath$ = scenarioGeneratorSinks.generatedPath$;

	// Choix du chemin à utiliser.
	// Si un chemin est fourni dans les sources alors on l'utilise, sinon on utilise le scénario généré.
	const path$ = xs.combine(generatedPath$, props$).map(([generatedPath, props]) =>
		props.path ? props.path : generatedPath
	);

	// Création des proxys pour certains flux (causé par l'interdépendance des streams - a = f(b) et b = f(a))
	const changeLocationProxy$ = xs.create();
	const correctNextChoosenLocationProxy$ = xs.create();
	
	// Ce flux emet un entier correspondant au nombre de villes correctes parcourues par le joueur
	// La valeur de base est fournie par les props (0 ou autre si il existe une sauvegarde)
	const progression$ = props$.map(props =>
		correctNextChoosenLocationProxy$.fold((acc, x) => acc + 1, props.progression)
	).flatten().remember();

	// Ce flux emet le lieu d'où commence le joueur (lieu du départ du scénario ou autre si une sauvegarde est fournie dans les props)
	const currentLocationInit$ = xs.combine(path$, props$, datas$).map(([path, props, datas]) =>
		makeLocationObject(props.currentLocation ? props.currentLocation : path[0].location, datas)
	);

	// Ce flux est un flux mémorisé contenant le lieu actuel où se trouve le joueur
	// Il est composé de la position de départ du joueur 'currentLocationInit$' ainsi que des éventuels changement de lieu émits par 'changeLocationProxy$'
	const currentLocation$ = xs.merge(
		currentLocationInit$,
		changeLocationProxy$,
	).remember();
	
	// Emet le lieu précédent (null si le joueur est dans le premier lieu)
	// L'opérateur pairwise mémorise les 2 valeurs émisent par un flux, il suffit de récupérer la plus ancienne des 2
	const lastLocation$ = xs.combine(props$, datas$).map(([props, datas]) =>
		currentLocation$.startWith(props.lastLocation ? makeLocationObject(props.lastLocation, datas) : null).compose(pairwise).map(item => item[0])
	).flatten().remember();

	// Emet le lieu suivant correct vers lequel le joueur doit aller pour progresser (null si le joueur se trouve dans le dernier lieu du scénario)
	// Il emet lorsque le joueur arrive dans un nouveau lieu correct, le lien correct suivant est alors émis
	const nextCorrectLocation$ = xs.combine(progression$, path$, datas$).map(([progression, path, datas]) =>
		progression + 1 < path.length ? 
			makeLocationObject(path[progression + 1].location, datas) : 
			null
	).remember();

	// Emet le lieu dans lequel le joueur est censé se trouver pour pouvoir progresser (le lieu qui va lui donner les indices pour parvenir au lieu suivant)
	const currentCorrectLocation$ = xs.combine(path$, progression$).map(([path, progression]) =>
		path[progression]
	);

	// Emet un boolean égal à true si le joueur se trouve dans le lieu actuel correct (false sinon)
	const isCurrentLocationCorrect$ = xs.combine(currentCorrectLocation$, currentLocation$).map(([currentCorrectLocation, currentLocation]) =>
		currentCorrectLocation.location === currentLocation.id
	);

	// Requête permettant de récupérer les index des villes suivantes suggérées au joueur (en plus de celle d'où il arrive) lorsqu'il se trompe et sort du chemin prévu par le scénario
	const otherLinksIndexesRandomRequest$ = xs.combine(currentLocation$, datas$, lastLocation$).map(([currentLocation, datas, lastLocation]) => {
		const locations = Object.keys(datas.locations);
		const locationsNumber = locations.length;

		const lastLocationIndex = lastLocation ? locations.indexOf(lastLocation.id) : -1;
		const currentLocationIndex = currentLocation ? locations.indexOf(currentLocation.id) : -1;
		
		// On veut 3 nombres uniques parmis la liste des index des lieux
		// On exclue le lieu d'où arrive le joueur car il est automatiquement ajouté plus loin
		// On exclue bien sûr aussi le lieu où il se trouve
		const otherLinksIndexesRandomRequest = {
			id: "otherLinksIndexes", 
			range: {
				min: 0, 
				max: locationsNumber - 1
			},
			exclude: [currentLocationIndex, lastLocationIndex],
			number: 3, 
			unique: true
		};
		
		return otherLinksIndexesRandomRequest;
	});

	// Réponse à la requête ci-dessus
	const otherLinksIndexesRandomResponse$ = random$.filter(random => random.id === "otherLinksIndexes").map(selectedValue => selectedValue.val);

	// Remplace les index  par les ids des lieux
	const otherLinksIds$ = xs.combine(datas$, otherLinksIndexesRandomResponse$).map(([datas, otherLinksIndexesRandomResponse]) =>
		otherLinksIndexesRandomResponse.map(index => Object.keys(datas.locations)[index])
	);

	// Tableau contenant les ids des lieux vers lesquels le joueur peut se diriger (liens)
	// Si le joueur se trouve dans la bonne ville alors les villes suggérées sont la prochaine ville correcte ainsi que les leurres contenus dans le scenario
	// Si le joueur ne se trouve pas dans le bonne ville alors les villes suggérées sont celles d'où il vient ainsi que 3 villes tirées au hasard
	const currentLocationLinksIds$ = xs.combine(currentLocation$, lastLocation$, nextCorrectLocation$, isCurrentLocationCorrect$, otherLinksIds$) 
	.map(([currentLocation, lastLocation, nextCorrectLocation, isCurrentLocationCorrect, otherLinksIds]) =>
		_.chain([])
		.concat(lastLocation ? [lastLocation.id] : [])
		.concat(isCurrentLocationCorrect ? currentLocation.lures : otherLinksIds)
		.concat(nextCorrectLocation && isCurrentLocationCorrect ? [nextCorrectLocation.id] : [])
		.uniq()
		.filter((o) => o !== currentLocation.id)
		.value()
	);
	
	// Map les ids des liens récupérés ci-dessus avec les objets de lieu complet contenus dans le .json de données
	const currentLocationLinks$ = xs.combine(currentLocationLinksIds$, datas$).map(([currentLocationLinksIds, datas]) => 
		currentLocationLinksIds.map(currentLocationLinkId =>
			makeLocationObject(currentLocationLinkId, datas)
		)
	);
	
	// Créer le composant représentant la carte
	const mapSinks = Map({DOM, windowResize$, currentLocation$, currentLocationLinksIds$, progression$, path$, datas$});

	// Flux émettant l'id du nouveau lieu à chaque changement
	const changeLocation$ = mapSinks.changeLocation$;

	// Défini la valeur du proxy défini initialement
	changeLocationProxy$.imitate(mapSinks.changeLocation$);

	// Emet true si le lieu choisi par le joueur est correct (le suivant dans le scénario)
	const correctNextChoosenLocation$ = xs.combine(changeLocation$, nextCorrectLocation$)
	.filter(([changeLocation, nextCorrectLocation]) =>
		nextCorrectLocation && changeLocation.id === nextCorrectLocation.id
	).mapTo(true);

	// Défini la valeur du proxy défini initialement
	correctNextChoosenLocationProxy$.imitate(correctNextChoosenLocation$);
	
	// Props pour les témoins
	// Contient initialement la valeur de départ des témoins (déjà interrogé ou non) si une sauvegarde était fournie
	// Une fois le premier changement de lieu effectué (changeLocation$) alors emet n'emet plus les props (null à la place)
	const witnessesProps$ = xs.merge(
		props$,
		changeLocation$.mapTo(null),
	);

	// Créer les composants représentant les témoins
	const witnesses$ = xs.combine(currentLocation$, progression$, path$, witnessesProps$)
	.map(([currentLocation, progression, path, witnessesProps]) => 
		Object.keys(currentLocation.places).map((key, value) =>
			isolate(Witness, key)({
				DOM: sources.DOM,
				props$: xs.of(Object.assign(
					{},
					{key}, // type de témoins (temoin-1, temoin-2 ou data)
					currentLocation.places[key], // données concernant le témoin actuel
					path[progression].location === currentLocation.id ? // 
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
	
	const resetSave$ = endGame$.mapTo({key: 'save', value: null});

	const endGameRouter$ = xs.combine(resetSave$, timeManagerSinks.timeDatas$, endGame$, props$, datas$)
	.map(([resetSave, timeDatas, endGame, props, datas]) => {
		const numberOfSuccessesNeeded = datas.settings.scenarioStucture[props.round].payload.numberOfSuccessesNeeded;
		
		if(endGame.type === "lastLocationReached"){
			if(props.successesNumber + 1 >= numberOfSuccessesNeeded)
				return { pathname: "/redirect", type: 'push', state: { props: { round: props.round + 1 }}}
			else
				return { pathname: "/game", type: 'push', state: { props: { round: props.round, successesNumber: props.successesNumber + 1 }}}
		}
		else if(endGame.type === "noTimeRemaining")
			return { pathname: "/game", type: 'push', state: { props: { round: props.round, successesNumber: props.successesNumber }}}
	});

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
	const timeManagerVTree$ = timeManagerSinks.DOM;
	const mapVTree$ = mapSinks.DOM;

	const DOMSink$ = xs.combine(currentLocation$, witnessesVTree$, timeManagerVTree$, mapVTree$, props$, datas$, showDestinationLinks$).map(
		([currentLocation, witnessesVTree, timeManagerVTree, mapVTree, props, datas, showDestinationLinks]) =>
			<section className="main">
				<section className="main-content" >
					<section className="city" style={{backgroundImage: "url("+currentLocation.image+")"}} >
						<section className="city-content">
							<section className="col-main">
								<header className="header">
									<h1>{currentLocation.name + " - Round : " + (props.round + 1) + " - Successes : " + props.successesNumber}</h1>
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
		random: xs.merge(
			scenarioGeneratorRandomRequests$,
			otherLinksIndexesRandomRequest$,
		),
		storage: xs.merge(
			save$,
			resetSave$,
		)
	};
	return sinks;
}