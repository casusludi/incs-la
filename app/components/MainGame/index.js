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

export function MainGame(sources) {
	// Récupération des sources
	const { DOM, HTTP, datas$ } = sources;
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
				canTravel: false,
				successesNumber: 0,
			},
			// Props enregistrés localement
			JSON.parse(save),
			// Props transférés depuis la page précédente
			sources.props,
		)
	);

	// Chargement du .json contenant les données permettant de générer le scénario random
	const scenarioGenDataJsonSinks = JSONReader({ HTTP, jsonPath$: xs.of("/scenarioGenData.json") });
	const scenarioGenDataJsonRequest$ = scenarioGenDataJsonSinks.request;
	const scenarioGenDataJsonResponse$ = scenarioGenDataJsonSinks.JSON;

	// Props pour la génération de scénario random
	// pathLocationsNumber - nombre de lieux contenus dans le "chemin" généré / longueur du scénario
	const scenarioProps$ = xs.combine(props$, datas$).map(([props, datas]) => ({
		pathLocationsNumber: datas.settings.scenarioStucture[props.round].payload.pathLocationsNumber,
	})).remember();

	// Création d'un composant ScenarioGenerator dont le but est de transformé le .json contenant les infos en de génération de scénario en un objet représentant le scénario
	// La source selectedValue$ emet les réponses aux requêtes random (elle peut être remplacée par des réponses fixes en remplaçant le la source random$ par pathPresets$)
	const scenarioGeneratorSinks = ScenarioGenerator({ props$: scenarioProps$, jsonResponse$: scenarioGenDataJsonResponse$, selectedValue$: /*pathPresets$*/ random$ })
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
	const linksIndexesRandomRequest$ = xs.combine(currentLocation$, datas$, lastLocation$).map(([currentLocation, datas, lastLocation]) => {
		const locations = Object.keys(datas.locations);
		const locationsNumber = locations.length;

		const lastLocationIndex = lastLocation ? locations.indexOf(lastLocation.id) : -1;
		const currentLocationIndex = currentLocation ? locations.indexOf(currentLocation.id) : -1;

		// On veut 3 nombres uniques parmis la liste des index des lieux
		// On exclue le lieu d'où arrive le joueur car il est automatiquement ajouté plus loin
		// On exclue bien sûr aussi le lieu où il se trouve
		const linksIndexesRandomRequest = {
			id: "linksIndexes",
			range: {
				min: 0,
				max: locationsNumber - 1
			},
			exclude: [currentLocationIndex, lastLocationIndex],
			number: 3,
			unique: true
		};

		return linksIndexesRandomRequest;
	});

	// Réponse à la requête ci-dessus
	const linksIndexesRandomResponse$ = random$.filter(random => random.id === "linksIndexes").map(selectedValue => selectedValue.val);

	// Remplace les index par les ids des lieux
	const linksIds$ = xs.combine(datas$, linksIndexesRandomResponse$).map(([datas, linksIndexesRandomResponse]) =>
		linksIndexesRandomResponse.map(index => Object.keys(datas.locations)[index])
	);

	// Tableau contenant les ids des lieux vers lesquels le joueur peut se diriger (liens)
	// Si le joueur se trouve dans la bonne ville alors les villes suggérées sont la prochaine ville correcte ainsi que les leurres contenus dans le scenario
	// Si le joueur ne se trouve pas dans le bonne ville alors les villes suggérées sont celles d'où il vient ainsi que 3 villes tirées au hasard
	const currentLocationLinksIds$ = xs.combine(currentLocation$, lastLocation$, nextCorrectLocation$, currentCorrectLocation$, isCurrentLocationCorrect$, linksIds$)
		.map(([currentLocation, lastLocation, nextCorrectLocation, currentCorrectLocation, isCurrentLocationCorrect, linksIds]) =>
			_.chain([])
				.concat(lastLocation ? [lastLocation.id] : [])
				.concat(isCurrentLocationCorrect ? currentCorrectLocation.lures : linksIds)
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
	const mapSinks = Map({ DOM, windowResize$, currentLocation$, currentLocationLinksIds$, progression$, path$, datas$ });

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
	const witnesses$ = xs.combine(currentLocation$, progression$, path$, isCurrentLocationCorrect$, witnessesProps$)
		.map(([currentLocation, progression, path, isCurrentLocationCorrect, witnessesProps]) =>
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
	).flatten().remember();

	/* DEPRECATED
	const showDestinationLinks$ = props$.map(props =>
		xs.merge(
			questionnedWitnesses$.map(questionnedWitnesses => Object.keys(questionnedWitnesses).length > 0),
			changeLocation$.mapTo(false),
		).compose(dropRepeats())
	).flatten().remember();
	*/

	// Instancie le composant qui va gérer le temps ingame
	const timeManagerProps$ = props$.map(props => props ? { elapsedTime: props.elapsedTime } : {});
	const timeManagerSinks = TimeManager({ DOM, props$: timeManagerProps$, datas$, changeLocation$, questionnedWitness$ });

	// Emet lorsque le joueur atteint le dernier lieu du chemin
	const lastLocationReached$ = xs.combine(path$, progression$)
		.filter(([path, progression]) =>
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

	// Redirection vers le menu principal quand le joueur clique sur le bouton menu
	const menuRouter$ = DOM.select('.js-go-to-main-menu').events('click').map(goToMainMenu => "/");

	// Emet un nouvel objet de sauvegarde chaque fois que des données à sauvegarder sont modifiées
	// Le driver de stockage local fonctionne sous la forme de clé-valeur c'est pourquoi on converti l'objet de sauvegarde en string à l'aide de JSON.stringify
	// On utilise la clé 'save'
	const save$ = xs.combine(props$, path$, currentLocation$, lastLocation$, progression$, timeManagerSinks.timeDatas$, questionnedWitnesses$, canTravel$)
		.map(([props, path, currentLocation, lastLocation, progression, timeDatas, questionnedWitnesses, canTravel]) =>
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
							path,												// Le scénario (chemin) de la partie en cours
						},
						lastLocation ? { lastLocation: lastLocation.id } : {},	// Le lieu précédent si il existe
					)
				)
			})
		);

	// Redirections
	const routerSink$ = xs.merge(
		endGameRouter$, // Lorsqu'une partie s'achève
		menuRouter$,	// Lorsque le joueur veut se rendre au menu
	);

	// Random requests
	const randomRequests$ = xs.merge(
		scenarioGeneratorRandomRequests$,
		linksIndexesRandomRequest$,
	);

	// Storage savings
	const storageSink$ = xs.merge(
		save$,
		resetSave$,
	);

	const sideMenu = isolate(MainGameSideMenu,'main-game')(sources);

	// Vues nécessaires à la génération du vdom
	const witnessesVDom$ = witnesses$.compose(mixCombine('DOM'));
	const timeManagerVDom$ = timeManagerSinks.DOM;
	const mapVDom$ = mapSinks.DOM;

	const DOMSink$ = view({
		currentLocation$,
		witnessesVDom$,
		timeManagerVDom$,
		mapVDom$,
		props$,
		datas$,
		canTravel$,
		sideMenuVDom$:sideMenu.DOM
	});

	const sinks = {
		DOM: DOMSink$,
		router: routerSink$,
		HTTP: scenarioGenDataJsonRequest$,
		random: randomRequests$,
		storage: storageSink$,
	};
	return sinks;
}