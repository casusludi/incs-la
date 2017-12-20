/*
Dans la documentation certains mots peuvent prêter à confusion. Voilà le lexique pour éviter toute ambiguïté :
	- indice / clue : Indice de l'enquête
	- id : chaine de caractère unique permettant d'identifier un objet/variable
	- index : valeur numérique identifiant un élement d'une liste/tableau
	- chemin / scénario : Ensemble des villes ordonnées que le joueur doit parcourir pour achever une étape du jeu
*/

import styles from './styles.css';

import isolate from '@cycle/isolate';

import xs from 'xstream';
import pairwise from 'xstream/extra/pairwise';
import sampleCombine from 'xstream/extra/sampleCombine';
import dropRepeats from 'xstream/extra/dropRepeats';

import * as _ from 'lodash';



import { Witness } from '../Witness';
import { TimeManager } from '../TimeManager';
import MainGameSideMenu from '../MainGameSideMenu';
import { Map } from '../Map';
import { JSONReader } from '../JSONReader';
import { ScenarioGenerator } from '../ScenarioGenerator';

import { makeLocationObject } from '../../utils';
import { mixMerge, mixCombine } from '../../utils';

import { pathPresets$ } from './presets';
import view from './view';
import shuffleSeed from 'shuffle-seed';

export function MainGame(sources) {
	// Récupération des sources
	const { DOM, HTTP, datas$, seed } = sources;
	const random$ = sources.random;
	const windowResize$ = sources.windowResize;


	const seedRequest$ = xs.of({
		category: 'main'
	})

	const props$ = xs.combine(
		seed.select('main').take(1),
		sources.storage.local.getItem('save').take(1)
	)
		.map(([seed, save]) =>
			(
				// Props par défaut
				{
					round: 0,
					seed: seed.value,
					progression: 0,
					// lastLocation: null,
					elapsedTime: 0,
					questionnedWitnesses: {},
					canTravel: false,
					successesNumber: 0,
					// Props enregistrés localement
					...JSON.parse(save),
					// Props transférés depuis la page précédente
					...sources.props
				}
			)
		)

	// Chargement du .json contenant les données permettant de générer le scénario random
	const scenarioGenDataJsonSinks = JSONReader({ HTTP, jsonPath$: xs.of("/data/scenarioGenData.json") });
	const scenarioGenDataJsonRequest$ = scenarioGenDataJsonSinks.request;
	const scenarioGenDataJsonResponse$ = scenarioGenDataJsonSinks.JSON;

	// Props pour la génération de scénario random
	// pathLocationsNumber - nombre de lieux contenus dans le "chemin" généré / longueur du scénario
	const scenarioProps$ = xs.combine(props$, datas$).map(([props, datas]) => ({
		pathLocationsNumber: datas.settings.scenarioStucture[props.round].payload.pathLocationsNumber,
		seed: props.seed
	})).remember();

	// Création d'un composant ScenarioGenerator dont le but est de transformé le .json contenant les infos en de génération de scénario en un objet représentant le scénario
	// La source selectedValue$ emet les réponses aux requêtes random (elle peut être remplacée par des réponses fixes en remplaçant le la source random$ par pathPresets$)
	const scenarioGeneratorSinks = ScenarioGenerator({
		props$: scenarioProps$,
		jsonResponse$: scenarioGenDataJsonResponse$
	});

	// Scénario généré par le composant
	const path$ = scenarioGeneratorSinks.generatedPath$.remember();

	// Création des proxys pour certains flux (causé par l'interdépendance des streams - a = f(b) et b = f(a))
	const changeLocationProxy$ = xs.create();
	const canTravelProxy$ = xs.create();
	const isNextLocationCorrectProxy$ = xs.create();

	const state$ = xs.combine(props$, datas$, path$).map(
		([props, datas, path]) => {

			const changeLocationInitialized$ = changeLocationProxy$
				
				// add current location
				.startWith(makeLocationObject(props.currentLocation ? props.currentLocation : path[0].location, datas))
				// add last location
				.startWith(props.lastLocation ? makeLocationObject(props.lastLocation, datas) : null)
				.compose(pairwise);


			const progression$ = isNextLocationCorrectProxy$
				.fold((acc, x) => acc + 1, props.progression)
				.remember()
				.debug(' [state] progress updated');

			return xs.combine(
				changeLocationInitialized$,
				progression$
			)
				.map(([[lastLocation, currentLocation],progression]) => {
					console.log('[state] progression in map', progression)
					const currentCorrectLocation = path[progression];
					const nextCorrectLocation = progression + 1 < path.length ? path[progression + 1] : null;

					return{
						path,
						currentLocation,
						lastLocation,
						progression,
						currentCorrectLocation,
						nextCorrectLocation,
						isCurrentLocationCorrect: currentCorrectLocation.location === currentLocation.id,
						isNextLocationCorrect: nextCorrectLocation && currentLocation.id === nextCorrectLocation.location
					}

				})
		})
		.flatten()
		.debug('state')
		.remember();

	const isNextLocationCorrect$ = state$
		.filter( state => state.isNextLocationCorrect)
		.mapTo(true)

	isNextLocationCorrectProxy$.imitate(isNextLocationCorrect$);

	const seed$ = props$.map(p => p.seed).compose(dropRepeats());

	const linksIds$ = xs.combine(datas$, seed$).map(([datas, seed]) =>
		shuffleSeed.shuffle(Object.keys(datas.locations), seed)
	)

	// Tableau contenant les ids des lieux vers lesquels le joueur peut se diriger (liens)
	// Si le joueur se trouve dans la bonne ville alors les villes suggérées sont la prochaine ville correcte ainsi que les leurres contenus dans le scenario
	// Si le joueur ne se trouve pas dans le bonne ville alors les villes suggérées sont celles d'où il vient ainsi que 3 villes tirées au hasard
	const currentLocationLinksIds$ = xs.combine(
		state$,
		linksIds$
	)
		.map(([{currentLocation, lastLocation, nextCorrectLocation, currentCorrectLocation}, linksIds]) => {
			const isCurrentLocationCorrect = currentCorrectLocation.location === currentLocation.id;
			return _.chain([])
				.concat(isCurrentLocationCorrect ? currentCorrectLocation.lures : [])
				.concat(linksIds)
				.take(4)
				.concat(lastLocation ? [lastLocation.id] : [])
				.concat(nextCorrectLocation && isCurrentLocationCorrect ? [nextCorrectLocation.location] : [])
				.uniq()
				.filter((o) => o !== currentLocation.id)
				.value()
		}).compose(dropRepeats()).debug('locations');

	// Créer le composant représentant la carte
	const mapSinks = Map({
		DOM,
		canTravel$: canTravelProxy$.startWith(false),
		windowResize$,
		props$:state$,
		currentLocationLinksIds$,
		datas$
	}
	);

	// Flux émettant l'id du nouveau lieu à chaque changement
	const changeLocation$ = mapSinks.changeLocation$;

	// Défini la valeur du proxy défini initialement
	changeLocationProxy$.imitate(mapSinks.changeLocation$);

	// Props pour les témoins
	// Contient initialement la valeur de départ des témoins (déjà interrogé ou non) si une sauvegarde était fournie
	// Une fois le premier changement de lieu effectué (changeLocation$) alors emet n'emet plus les props (null à la place)
	const witnessesProps$ = xs.merge(
		props$,
		changeLocation$.mapTo(null),
	);

	// Créer les composants représentant les témoins
	const witnesses$ = xs.combine(state$, witnessesProps$).debug('wit')
		.map(([{currentLocation, progression, path, isCurrentLocationCorrect}, witnessesProps]) =>
			Object.keys(currentLocation.places).map((key, value) =>
				isolate(Witness, key)({
					DOM: sources.DOM,
					props$: xs.of(Object.assign(
						{},
						{ key }, // type de témoins (temoin-1, temoin-2 ou data)
						currentLocation.places[key], // données concernant le témoin actuel
						isCurrentLocationCorrect ? // On ajoute les indices donnés par les témoins si le joueur se trouve dans le bon lieu
							{ clue: path[progression].clues[key] } :
							{},
						{ showResult: witnessesProps ? witnessesProps.questionnedWitnesses[key] : false }, // Défini si le témoin est déjà interrogé ou pas dans la sauvegarde (si elle est fournie)
					)),
				})
			)
		).remember();

	// Emet les props d'un témoin quand qu'il est interrogé
	const questionnedWitness$ = witnesses$.map(witnesses =>
		xs.merge(...witnesses.map(witness => witness.questionned$))
	).flatten();

	// Un objet contenant chaque clé de témoin (temoin-1, temoin-2 ou data) déjà interrogé associer à true. Exemple :
	// {'temoin-1': true, 'data': true}
	// Il est remis à zero lors d'un changement de lieu
	// Il sert à conserver une trace des témoins déjà interrogés dans la sauvegarde
	// (Sa valeur de départ est contenue dans la sauvegarde si elle est fournie)
	const questionnedWitnesses$ = props$.map(props =>
		xs.merge(
			questionnedWitness$.map(questionnedWitness => questionnedWitness.key),
			changeLocation$.mapTo('reset')
		).fold((acc, item) => item === 'reset' ? {} : Object.assign(acc, { [item]: true }), props.questionnedWitnesses)
	).flatten().remember();

	// Un booléen représentant si le peut se déplacer ou non
	// Il peut se déplacer à partir du moment où il a interrogé au moins un des témoins du lieu où il se trouve
	const canTravel$ = props$.map(props =>
		xs.merge(
			questionnedWitness$.mapTo(true),
			changeLocation$.mapTo(false),
		).startWith(props.canTravel).compose(dropRepeats())
	).flatten();
	canTravelProxy$.imitate(canTravel$);

	// Instancie le composant qui va gérer le temps ingame
	const timeManagerProps$ = props$.map(props => props ? { elapsedTime: props.elapsedTime } : {});
	const timeManagerSinks = TimeManager({ DOM, props$: timeManagerProps$, datas$, changeLocation$, questionnedWitness$ });

	// Emet lorsque le joueur atteint le dernier lieu du chemin
	const lastLocationReached$ = state$
		.filter(({path, progression}) =>
			progression === (path.length - 1)
		).mapTo({ type: "lastLocationReached" });

	// Emet lorsque le joueur a épuisé le temps qui lui était imparti
	const noTimeRemaining$ = timeManagerSinks.timeDatas$.filter(timeDatas =>
		timeDatas.remainingTime.raw <= 0
	).mapTo({ type: "noTimeRemaining" });

	// Merge des 2 façons de finir une partie (dernier lieu atteint ou temps épuisé)
	const endGame$ = xs.merge(lastLocationReached$, noTimeRemaining$);

	// Détruit la sauvegarde présente dans la mémoire locale car la partie est terminée
	const resetSave$ = endGame$.mapTo({ key: 'save', value: null });

	// Redirige à la fin de la partie
	const endGameRouter$ = xs.combine(resetSave$ /*combine resetSave$ car la sauvegarde doit être détruite avant d'effectuer la redirection. C'est pas très propre j'ai pas su faire autrement.*/, timeManagerSinks.timeDatas$, endGame$, props$, datas$)
		.map(([resetSave, timeDatas, endGame, props, datas]) => {
			// Nombre de victoires à obtenir pour terminer le round
			const numberOfSuccessesNeeded = datas.settings.scenarioStucture[props.round].payload.numberOfSuccessesNeeded;

			if (endGame.type === "lastLocationReached") {
				if (props.successesNumber + 1 >= numberOfSuccessesNeeded)
					// Si le joueur a atteint le dernier lieu et qu'il a obtenu suffisamment de victoires
					// Alors il est envoyé vers la page de redirection (en incrémentant le compteur de round) qui le redirigera vers le prochain round
					return { pathname: "/redirect", type: 'push', state: { props: { round: props.round + 1 } } }
				else
					// Sinon il on relance une partie en incrémentant le compteur de victoires
					return { pathname: "/game", type: 'push', state: { props: { round: props.round, successesNumber: props.successesNumber + 1 } } }
			}
			else if (endGame.type === "noTimeRemaining")
				// S'il a juste épuisé son temps alors on relance simplement une partie
				return { pathname: "/game", type: 'push', state: { props: { round: props.round, successesNumber: props.successesNumber } } }
		});

	// Emet un nouvel objet de sauvegarde chaque fois que des données à sauvegarder sont modifiées
	// Le driver de stockage local fonctionne sous la forme de clé-valeur c'est pourquoi on converti l'objet de sauvegarde en string à l'aide de JSON.stringify
	// On utilise la clé 'save'
	const save$ = xs.combine(props$, state$, timeManagerSinks.timeDatas$, questionnedWitnesses$, canTravel$)
		.map(([props, {path, currentLocation, lastLocation, progression}, timeDatas, questionnedWitnesses, canTravel]) =>
			({
				key: 'save',
				value: JSON.stringify(
					Object.assign(
						{}, 													// Les données sauvegardées sont
						props,													// Les props actuels (round, successesNumber...)
						{														// Dont certaines propriétés sont écrasées telles que
							currentLocation: currentLocation.id,				// Le lieu actuel
							progression,										// La progression actuelle
							elapsedTime: timeDatas.elapsedTime.raw,				// Le temps écoulé
							questionnedWitnesses,								// Les témoins déjà interrogés
							canTravel,											// Si le joueur peut se déplacer (au moins un témoin a déjà été interrogé)
						},
						lastLocation ? { lastLocation: lastLocation.id } : {},	// Le lieu précédent si il existe
					)
				)
			})
		);

	// Side menu
	const sideMenu = isolate(MainGameSideMenu, 'main-game')({
		DOM,
		props$: xs.of({
			location$: state$.map( state => state.currentLocation),
			datas$
		})
	});

	// Redirections
	const routerSink$ = xs.merge(
		endGameRouter$, // Lorsqu'une partie s'achève
		sideMenu.router,	// Lorsque le joueur veut se rendre au menu
	);

	// Storage savings
	const storageSink$ = xs.merge(
		save$,
		resetSave$,
	);

	// Vues nécessaires à la génération du vdom
	const witnessesVDom$ = witnesses$.compose(mixCombine('DOM'));
	const timeManagerVDom$ = timeManagerSinks.DOM;
	const mapVDom$ = mapSinks.DOM;

	const DOMSink$ = view({
		currentLocation$:state$.map( state => state.currentLocation),
		witnessesVDom$,
		timeManagerVDom$,
		mapVDom$,
		props$,
		datas$,
		canTravel$,
		sideMenuVDom$: sideMenu.DOM
	});

	const sinks = {
		DOM: DOMSink$,
		router: routerSink$,
		HTTP: scenarioGenDataJsonRequest$,
		storage: storageSink$,
		seed: seedRequest$
	};
	return sinks;
}