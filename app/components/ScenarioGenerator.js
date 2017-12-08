import xs from 'xstream';
import delay from 'xstream/extra/delay';

import * as _ from 'lodash';
import shuffleSeed from 'shuffle-seed';

/*
Ce composant prend un fichier .json spécifique en entrer pour générer le scénario d'une partie.
Il prend également certains props (la longueur du scénario) ainsi que les index des différents éléments du scénario seléctionnés (lieux, témoins, leurres). Le plus souvent ce sera les réponses aux requêtes envoyées au driver random cependant des presets peuvent aussi être mis en place afin d'avoir un scénario fixe.
Toute le logique aléatoire du composant a été sortie afin d'obtenir du code pur respectant ainsi les paradigmes énoncés par CycleJS.
*/
export function ScenarioGenerator(sources) {
	/* args :
	props$ : les props contenant le nombre de lieux que doit comporter le scénario
	jsonResponse$ : le fichier .json contenant les données permettant la génération du scénario
	*/
	const { props$, jsonResponse$} = sources;

	const generatedPath$ = xs.combine(props$, jsonResponse$)
		.map(([props, jsonResponse]) => {
			const {seed,pathLocationsNumber} = props;
			const selectedLocations = [
				jsonResponse[0],
				...shuffleSeed.shuffle(jsonResponse.splice(1), seed).slice(0, pathLocationsNumber - 1)
			]

			return selectedLocations.map((location, index) => {

				const nextLocation = selectedLocations[index + 1];
				if (nextLocation) {
					const { clues } = nextLocation;

					const witnesses = shuffleSeed.shuffle(clues.witnesses,seed).slice(0,2);
					const data = shuffleSeed.shuffle(clues.data,seed).slice(0,1);

					const witnessClues =  witnesses.reduce( (res,o,i) => {
						res[`temoin-${i+1}`] = {text:o.text}
						return res;
					},{});

					const dataClues =  data.reduce( (res,o,i) => {
						res["data"] = {text:o.text}
						return res;
					},{});

					const finalClues = {
						...witnessClues,
						...dataClues
					};

					const lures = _.flatten([...witnesses,...data].map( o => o.lures));

					return {
						"location": location.location,
						"clues": finalClues,
						"lures": lures
					}
				} else {
					return {
						"location": location.location,
						"clues": {
							"temoin-1": {
								"text": null
							},
							"temoin-2": {
								"text": null
							},
							"data": {
								"text": null
							}
						},
						"lures": []
					}
				}
			})

		}).debug('final')

	const sinks = {
		generatedPath$
	};

	return sinks;
}