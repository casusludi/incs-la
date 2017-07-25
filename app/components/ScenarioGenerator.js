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

	const cluesIndexesRequests$ = selectedLocations$.map(selectedLocations => 
		xs.merge(...selectedLocations.filter((selectedLocation, index) => index < selectedLocations.length - 1)
			.map((selectedLocation, index) => {
				const locationId = selectedLocation.location;

				const nextLocation = selectedLocations[index + 1];
				
				const selectedWitnessesIndexesRequest = {
					id: {locationId, type: "witnesses"}, 
					range: nextLocation.clues.witnesses.length - 1, 
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

	/*
	const ploysIndexesRequests$ = xs.combine(selectedLocations$, jsonResponse$).map(([selectedLocations, jsonResponse]) => {
		return xs.merge(...selectedLocations.slice(0, -1).map(selectedLocation => {
			const locationId = selectedLocation.location;
			
			const test$ = selectedValue$//.filter(selectedValue => selectedValue.id.locationId === locationId)// && selectedValue.id.type === "witnesses");
			test$.addListener({
				next: i => console.log(i.id.locationId),
			});
			
			// console.log(locationId);
			const selectedWitness1IndexRequest = {
				id: {locationId, type: "witness1Ploy"}, 
				range: 3//nextLocation.clues.witnesses[selectedWitnessesIndexes[0]].ploys.length - 1,
			};
			const selectedWitness2IndexRequest = {
				id: {locationId, type: "witness2Ploy"}, 
				range: 6//nextLocation.clues.witnesses[selectedWitnessesIndexes[1]].ploys.length - 1,
			};
			const selectedDataIndexRequest = {
				id: {locationId, type: "dataPloy"}, 
				range: 1//nextLocation.clues.data[selectedDataIndex].ploys.length - 1,
			};
			
			return xs.merge(
				xs.of(selectedWitness1IndexRequest),
				xs.of(selectedWitness2IndexRequest),
				xs.of(selectedDataIndexRequest),
			);

			return xs.combine(
				selectedValue$.filter(selectedValue => selectedValue.id.locationId === locationId && selectedValue.id.type === "witnesses"),
				selectedValue$.filter(selectedValue => selectedValue.id.locationId === locationId && selectedValue.id.type === "data"),
			).map(([selectedWitnesses, selectedData]) => {
				// console.log(selectedWitnesses);
				const selectedWitnessesIndexes = selectedWitnesses.val;
				const selectedDataIndex = selectedData.val;
				
				const selectedWitness1IndexRequest = {
					id: {locationId, type: "witness1Ploy"}, 
					range: 3//nextLocation.clues.witnesses[selectedWitnessesIndexes[0]].ploys.length - 1,
				};
				const selectedWitness2IndexRequest = {
					id: {locationId, type: "witness2Ploy"}, 
					range: 6//nextLocation.clues.witnesses[selectedWitnessesIndexes[1]].ploys.length - 1,
				};
				const selectedDataIndexRequest = {
					id: {locationId, type: "dataPloy"}, 
					range: 1//nextLocation.clues.data[selectedDataIndex].ploys.length - 1,
				};
				
				return xs.merge(
					xs.of(selectedWitness1IndexRequest),
					xs.of(selectedWitness2IndexRequest),
					xs.of(selectedDataIndexRequest),
				);
			}).flatten();
		}))
	}).flatten();
	*/

	const path$ = xs.combine(selectedLocations$, jsonResponse$).map(([selectedLocations, jsonResponse]) =>
		xs.combine(...selectedLocations.map((selectedLocation, index) => {
			const locationId = selectedLocation.location;
			const selectedLocationSelectedValues$ = selectedValue$.filter(selectedValue => selectedValue.id.locationId === locationId);

			const result$ = index < selectedLocations.length - 1 ? 
				xs.combine(
					selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "witnesses"),
					selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "data"),
					// selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "witness1_ploy"),
					// selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "witness2_ploy"),
					// selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "data_ploy"),
				).map(([selectedWitnesses, selectedData/*, witness1Ploy, witness2Ploy, dataPloy*/]) => {
					const nextLocation = selectedLocations[index + 1];
					
					const selectedWitnessesIndexes = selectedWitnesses.val;
					const selectedDataIndex = selectedData.val;

					const witness1 = nextLocation.clues.witnesses[selectedWitnessesIndexes[0]];
					const witness2 = nextLocation.clues.witnesses[selectedWitnessesIndexes[1]];
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
						},/*
						"ploys": [
							witness1Ploy,
							witness2Ploy,
							dataPloy
						]*/
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
		}))
	).flatten().remember();

	const randomRequests$ = xs.merge(
		selectedLocationsIndexesRequest$,
		cluesIndexesRequests$,
		// ploysIndexesRequests$,
	);

	const sinks = {
		path$, 
		randomRequests$,
	};

	return sinks;
}