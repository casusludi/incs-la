import xs from 'xstream';

import * as _ from 'lodash';

export function ScenarioGenerator(sources) {
	const {jsonResponse$, selectedValue$} = sources;
	
	const selectedLocationsIndexesRequest$ = jsonResponse$.map(jsonResponse => {
		const pathLocationsNumber = 10;
		const locationsTotalNumber = jsonResponse.length;
		
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

	const selectedLocationsIndexes$ = selectedValue$.filter(selectedValue => selectedValue.id === "selectedLocationsIndexes").map(selectedValue => selectedValue.val);

	const selectedLocations$ = xs.combine(jsonResponse$, selectedLocationsIndexes$)
	.map(([jsonResponse, selectedLocationsIndexes]) => 
		_.concat(
			jsonResponse[0],
			selectedLocationsIndexes.map(selectedLocationsIndex =>
				jsonResponse[selectedLocationsIndex]
			),
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

	const path$ = xs.combine(selectedLocations$, jsonResponse$).map(([selectedLocations, jsonResponse]) => {
		const pathTemp = selectedLocations.map((selectedLocation, index) => {
			const locationId = selectedLocation.location;

			const result$ = index < selectedLocations.length - 1 ? 
				xs.combine(
					selectedValue$.filter(selectedValue => selectedValue.id.locationId === locationId && selectedValue.id.type === "witnesses"),
					selectedValue$.filter(selectedValue => selectedValue.id.locationId === locationId && selectedValue.id.type === "data"),
				).map(([selectedWitnesses, selectedData]) => {
					const nextLocation = selectedLocations[index + 1];
					
					const selectedWitnessesIndexes = selectedWitnesses.val;
					const selectedDataIndex = selectedData.val;

					const witness1 = nextLocation.clues.temoins[selectedWitnessesIndexes[0]];
					const witness2 = nextLocation.clues.temoins[selectedWitnessesIndexes[1]];
					const data = nextLocation.clues.data[selectedDataIndex];
					
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

		return xs.combine(...pathTemp);
	}).flatten().remember();

	const randomRequests$ = xs.merge(
		selectedLocationsIndexesRequest$,
		cluesIndexesRequest$,
	);

	const sinks = {
		path$, 
		randomRequests$,
	};

	return sinks;
}