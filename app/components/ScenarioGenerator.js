import xs from 'xstream';
import { run } from '@cycle/run';
import { html } from 'snabbdom-jsx';

import * as _ from 'lodash';

export function ScenarioGenerator(sources) {
	const {jsonResponse$, random$} = sources;
	
	const selectedLocationsIndexesRequest$ = jsonResponse$.map(jsonResponse => {
		const pathLocationsNumber = 10;
		const locationsTotalNumber = jsonResponse.locationsClues.length;
		
		const selectedLocationsIndexesRequest = {
			id: "selectedLocationsIndexes", 
			range: {
				min: 1, 
				max: locationsTotalNumber - 1
			}, 
			number: pathLocationsNumber - 1, 
			unique: true
		};
		
		return selectedLocationsIndexesRequest;
	});

	const selectedLocationsIndexes$ = random$.filter(random => random.id === "selectedLocationsIndexes").map(random => random.val);

	const selectedLocations$ = xs.combine(jsonResponse$, selectedLocationsIndexes$)
	.map(([jsonResponse, selectedLocationsIndexes]) => 
		_.concat(
			jsonResponse.locationsClues[0], 
			_.shuffle(jsonResponse.locationsClues.filter((value, index) => 
				_.includes(selectedLocationsIndexes, index)
			))
		)
	);

	const cluesIndexesRequest$ = selectedLocations$.map(selectedLocations => 
		xs.merge(...selectedLocations.filter((selectedLocation, index) => index < selectedLocations.length - 1)
			.map((selectedLocation, index) => {
				const locationId = selectedLocation.location;

				const nextLocation = selectedLocations[index + 1];
				
				const selectedWitnessesIndexesRequest = {
					id: {locationId, type: "witnesses"}, 
					range: nextLocation.clues.temoins.length - 1, 
					number: 2, 
					unique: true
				};
				const selectedDataIndexRequest = {
					id: {locationId, type: "data"}, 
					range: nextLocation.clues.data.length - 1,
				};

				return xs.merge(
					xs.of(selectedWitnessesIndexesRequest),
					xs.of(selectedDataIndexRequest),
				)
			})
		)
	).flatten();

	const datas$ = xs.combine(selectedLocations$, jsonResponse$).map(([selectedLocations, jsonResponse]) => {
		const pathTemp = selectedLocations.map((selectedLocation, index) => {
			const locationId = selectedLocation.location;

			const result$ = index < selectedLocations.length - 1 ? 
				xs.combine(
					random$.filter(random => random.id.locationId === locationId && random.id.type === "witnesses"),
					random$.filter(random => random.id.locationId === locationId && random.id.type === "data"),
				).map(([randomWitnesses, randomData]) => {
					const nextLocation = selectedLocations[index + 1];
					
					const selectedWitnessesIndex = randomWitnesses.val;
					const selectedDataIndex = randomData.val;

					const temoin1 = nextLocation.clues.temoins[selectedWitnessesIndex[0]];
					const temoin2 = nextLocation.clues.temoins[selectedWitnessesIndex[1]];
					const data = nextLocation.clues.data[selectedDataIndex];
					
					return {
						"location": locationId,
						"clues":{
							"temoin-1":{
								"text": temoin1
							},
							"temoin-2":{
								"text": temoin2
							},
							"data":{
								"text": data
							}
						}
					};
				}) :
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
					}
				});

			return result$;
		});

		const path$ = xs.combine(...pathTemp);

		const datas$ = path$.map(path =>
			Object.assign(
				{},
				{settings: jsonResponse.settings},
				{texts: jsonResponse.texts},
				{locations: jsonResponse.locations},
				{path: path},
			)
		);

		return datas$;
	}).flatten();

	const randomRequests$ = xs.merge(
		selectedLocationsIndexesRequest$,
		cluesIndexesRequest$,
	);

	const sinks = {
		datas$, 
		randomRequests$,
	};

	return sinks;
}