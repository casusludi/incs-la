import xs from 'xstream';

import * as _ from 'lodash';

/*
Ce composant prend un fichier .json spécifique en entrer pour générer le scénario d'une partie.
Il prend également certains props (la longueur du scénario) ainsi que les index des différents éléments du scénario seléctionnés (lieux, témoins, leurres). Le plus souvent ce sera les réponses aux requêtes envoyées au driver random cependant des presets peuvent aussi être mis en place afin d'avoir un scénario fixe.
Toute le logique aléatoire du composant a été sortie afin d'obtenir du code pur respectant ainsi les paradigmes énoncés par CycleJS.
*/
export function ScenarioGenerator(sources) {
	/* args :
	props$ : les props contenant le nombre de lieux que doit comporter le scénario
	jsonResponse$ : le fichier .json contenant les données permettant la génération du scénario
	selectedValue$ : Index des différents éléments du scénario sélectionnés
	*/
	const {props$, jsonResponse$, selectedValue$} = sources;
	
	// Requête pour les index des lieux du scénario
	// Le premier lieu d'un scnéario est toujours le premier contenu dans le fichier .json (soit celui d'index 0) c'est pourquoi on veut des nombres entre 1 et (locationsTotalNumber - 1) inclus
	// Le scénario contenant props.pathLocationsNumber lieux, on voudra (props.pathLocationsNumber - 1) nombres car on a déjà le lieu de départ (indice 0)
	const selectedLocationsIndexesRequest$ = xs.combine(props$, jsonResponse$).map(([props, jsonResponse]) => {
		const locationsTotalNumber = jsonResponse.length;
		
		const selectedLocationsIndexesRequest = {
			id: "selectedLocationsIndexes", 
			range: {
				min: 1, 
				max: locationsTotalNumber - 1
			}, 
			number: props.pathLocationsNumber - 1, 
			unique: true
		};
		
		return selectedLocationsIndexesRequest;
	});

	// On récupère les index des lieux sélectionnés en filtrant la source selectedValue$ grâce à son attribut 'id' et en mapant ensuite les valeurs voulues soit son attribut 'val'. On concatene aussi l'index 0 au début afin d'avoir le premier lieu.
	const selectedLocationsIndexes$ = selectedValue$.filter(selectedValue => selectedValue.id === "selectedLocationsIndexes").map(selectedValue => [0, ...selectedValue.val]);

	// On va ensuite maper ces index avec les données contenues dans le .json
	const selectedLocations$ = xs.combine(jsonResponse$, selectedLocationsIndexes$)
	.map(([jsonResponse, selectedLocationsIndexes]) => 
		selectedLocationsIndexes.map(selectedLocationsIndex =>
			jsonResponse[selectedLocationsIndex]
		)
	);

	// Une fois qu'on a obtenu les lieux composant le scénario on va pouvoir effectuer les requêtes pour récupérer les index des indices donnés par les témoins. Chaque lieu ayant un nombre différent d'indices il nous est impossible de le faire plus tôt.
	const cluesIndexesRequests$ = selectedLocations$.map(selectedLocations => 
		xs.merge(...selectedLocations.filter((selectedLocation, index) => index < selectedLocations.length - 1) // Inutile d'effectuer une requête pour le dernier lieu du scénario car il ne mène à aucun autre lieu.
			.map((selectedLocation, index) => {
				const locationId = selectedLocation.location;

				const nextLocation = selectedLocations[index + 1];
				
				// Chaque lieu contient les indixes menant vers le lieu suivant d'où le 'nextLocation'
				// Les syntaxes des indices des 2 premiers témoins et de data étant différents...
				// On va effectuer une requête pour les 2 témoins en demandant donc 2 nombres uniques parmi les indices des témoins
				const selectedWitnessesIndexesRequest = {
					id: {locationId, type: "witnesses"}, 
					range: nextLocation.clues.witnesses.length - 1, 
					number: 2, 
					unique: true
				};
				// Et une requête pour data en demandant un unique nombre
				const selectedDataIndexRequest = {
					id: {locationId, type: "data"}, 
					range: nextLocation.clues.data.length - 1,
				};

				// Et on merge le tout pour que chaque élément émis sur le flux final soit une unique requête
				return xs.merge(
					xs.of(selectedWitnessesIndexesRequest),
					xs.of(selectedDataIndexRequest),
				)
			})
		)
	).flatten();

	// En gros la même chose pour les leurres une fois qu'on a obtenu les indices car chaque indice contient un nombre différents de leurres
	// Par contre je n'ai pas trouvé de moyen de faire en sorte que les valeurs retournées ne se retrouvent pas être identiques. On pourrait très bien obtenir les mêmes leurres pour 2 indices différents ce qui voudrait dire attendre que la réponse à la requête de leurre pour le premier témoin arrive pour ensuite en redemander une dans le cas où on obtiendrait le même résultat pour le témoin 2 ou data. Avec le mécanisme d'aléatoire sorti de la logique interne du jeu c'est un procédé qui me semble trop compliqué à mettre en oeuvre. On trouve ici une des limites actuelles de CycleJS dans son envie d'avoir un code systématiquement pur. La plupart des exemples trouvés sur le net conserve l'aléatoire dans la partie logique. Une solution pourrait être apportée par les signaux. C'est une amélioration en cours de discussion (voir https://github.com/cyclejs/cyclejs/issues/581)
	const luresIndexesRequests$ = xs.combine(jsonResponse$, selectedLocations$).map(([jsonResponse, selectedLocations]) =>
		xs.merge(...selectedLocations.slice(0, -1).map((selectedLocation, index) => {
			const locationId = selectedLocation.location;
			const selectedLocationSelectedValues$ = selectedValue$.filter(selectedValue => selectedValue.id.locationId === locationId);
			
			const locationsTotalNumber = jsonResponse.length;
		
			const result$ = xs.combine(
					selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "witnesses"),
					selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "data"),
				).map(([selectedWitnesses, selectedData]) => {
					const nextLocation = selectedLocations[index + 1];
					
					const selectedWitnessesIndexes = selectedWitnesses.val;
					const selectedDataIndex = selectedData.val;

					// Si il existe au moins un leurre pour un l'indice choisi alors la requête demande un nombre aléatoire parmi les index de ce(s) leurre(s). Sinon elle demande un nombre aléatoire parmi les index de tous lieux existant, dans ce cas une information supplémentaire (randomLure) est apportée à l'attribut 'id' de la requête pour spécifier que le nombre retourné correspond à l'index d'un lieu aléatoire (c'est-à-dire pas un leurre).
					////// PAS SÛR QUE CETTE PARTIE AIT ÉTÉ BIEN CLAIRE ///////
					const selectedWitness1IndexRequest = nextLocation.clues.witnesses[selectedWitnessesIndexes[0]].lures && nextLocation.clues.witnesses[selectedWitnessesIndexes[0]].lures.length > 0 ? 
						{
							id: {locationId, type: "witness1Lure"},
							range: nextLocation.clues.witnesses[selectedWitnessesIndexes[0]].lures.length - 1
						} :
						{
							id: {locationId, type: "witness1Lure", payload: "randomLure"},
							range: locationsTotalNumber - 1
						};
					const selectedWitness2IndexRequest = nextLocation.clues.witnesses[selectedWitnessesIndexes[1]].lures && nextLocation.clues.witnesses[selectedWitnessesIndexes[1]].lures.length > 0 ?
						{
							id: {locationId, type: "witness2Lure"},
							range: nextLocation.clues.witnesses[selectedWitnessesIndexes[1]].lures.length - 1
						} :
						{
							id: {locationId, type: "witness2Lure", payload: "randomLure"},
							range: locationsTotalNumber - 1
						};
					const selectedDataIndexRequest = nextLocation.clues.data[selectedDataIndex].lures && nextLocation.clues.data[selectedDataIndex].lures.length > 0 ? 
						{
							id: {locationId, type: "dataLure"},
							range: nextLocation.clues.data[selectedDataIndex].lures.length - 1
						} : 
						{
							id: {locationId, type: "dataLure", payload: "randomLure"},
							range: locationsTotalNumber - 1
						};
					
					return xs.merge(
						xs.of(selectedWitness1IndexRequest),
						xs.of(selectedWitness2IndexRequest),
						xs.of(selectedDataIndexRequest),
					);
				}).flatten();

			return result$;
		}))
	).flatten();
	
	// Problème : Je me suis rendu compte que le seul moyen pour que cette requête parte est d'ajouter un listener (même vide). Normalement le listener doit être ajouté dans le driver (random) mais ici ça ne fonctionne pas. Encore plus étrange : pour les autres requêtes le listener n'était pas nécessaire. À investiguer.
	luresIndexesRequests$.addListener({
		next: () => {}
	});

	// Scénaio généré final
	const generatedPath$ = xs.combine(jsonResponse$, selectedLocations$).map(([jsonResponse, selectedLocations]) =>
		xs.combine(...selectedLocations.map((selectedLocation, index) => {
			const locationId = selectedLocation.location;
			// On récupère toutes les réponses aux requêtes concernant le lieu actuel
			const selectedLocationSelectedValues$ = selectedValue$.filter(selectedValue => selectedValue.id.locationId === locationId);

			const result$ = index < selectedLocations.length - 1 ? // Pour l'ensemble des lieux à l'exception du dernier
				xs.combine( // On récupère séparément les réponses aux requêtes pour les indices et leurres du lieu actuel
					selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "witnesses"),
					selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "data"),
					selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "witness1Lure"),
					selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "witness2Lure"),
					selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "dataLure"),
				).map(([selectedWitnesses, selectedData, selectedWitness1Lure, selectedWitness2Lure, selectedDataLure]) => {
					const nextLocation = selectedLocations[index + 1];
					
					const selectedWitnessesIndexes = selectedWitnesses.val;
					const selectedDataIndex = selectedData.val;
					const selectedWitness1LureIndex = selectedWitness1Lure.val;
					const selectedWitness2LureIndex = selectedWitness2Lure.val;
					const selectedDataLureIndex = selectedDataLure.val;

					// Récupère l'ensemble des lieux possible dans le cas d'un 'randomLure'
					const availableLocations = jsonResponse.map(el => el.location);

					const witness1 = nextLocation.clues.witnesses[selectedWitnessesIndexes[0]].text;
					const witness2 = nextLocation.clues.witnesses[selectedWitnessesIndexes[1]].text;
					const data = nextLocation.clues.data[selectedDataIndex].text;
					// Pour chaque leurre si le payload est 'randomLure' alors on va prendre le leurre parmi l'ensemble des lieux possibles. Sinon on le récuperera parmi les leurres fournis par l'indice.
					const witness1Lure = selectedWitness1Lure.id.payload === "randomLure" ?
						availableLocations[selectedWitness1LureIndex] :
						nextLocation.clues.witnesses[selectedWitnessesIndexes[0]].lures[selectedWitness1LureIndex];
					const witness2Lure = selectedWitness2Lure.id.payload === "randomLure" ?
						availableLocations[selectedWitness2LureIndex] :
						nextLocation.clues.witnesses[selectedWitnessesIndexes[1]].lures[selectedWitness2LureIndex];
					const dataLure = selectedDataLure.id.payload === "randomLure" ?
						availableLocations[selectedDataLureIndex] :
						nextLocation.clues.data[selectedDataIndex].lures[selectedDataLureIndex];
					
					// On créer ensuite l'objet résumant l'ensemble des infos rassemblées (id du lieu, indices et leurres)
					return {
						"location": locationId,
						"clues":{
							"temoin-1":{
								"text": witness1
							},
							"temoin-2":{
								"text": witness2
							},
							"data":{
								"text": data
							}
						},
						"lures": [
							witness1Lure,
							witness2Lure,
							dataLure
						]
					};
				}) :
				// Pour le dernier lieu (car il ne mène à aucun autre lieu donc il ne nécessite pas d'indices ni de leurres)
				xs.of({
					"location": locationId,
					"clues":{
						"temoin-1":{
							"text": null
						},
						"temoin-2":{
							"text": null
						},
						"data":{
							"text": null
						}
					},
					"lures": []
				});

			return result$;
		}))
	).flatten().remember();

	const randomRequests$ = xs.merge(
		selectedLocationsIndexesRequest$,
		cluesIndexesRequests$,
		luresIndexesRequests$,
	);

	const sinks = {
		generatedPath$, 
		randomRequests$,
	};

	return sinks;
}