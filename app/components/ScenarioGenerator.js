import xs from 'xstream';

import * as _ from 'lodash';

export function ScenarioGenerator(sources) {
	const {props$, jsonResponse$, selectedValue$} = sources;
	
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

					const selectedWitness1IndexRequest = nextLocation.clues.witnesses[selectedWitnessesIndexes[0]].lures && nextLocation.clues.witnesses[selectedWitnessesIndexes[0]].lures.length > 0 ? 
						{
							id: {locationId, type: "witness1Ploy"},
							range: nextLocation.clues.witnesses[selectedWitnessesIndexes[0]].lures.length - 1
						} :
						{
							id: {locationId, type: "witness1Ploy", payload: "randomPloy"},
							range: locationsTotalNumber - 1
						};
					const selectedWitness2IndexRequest = nextLocation.clues.witnesses[selectedWitnessesIndexes[1]].lures && nextLocation.clues.witnesses[selectedWitnessesIndexes[1]].lures.length > 0 ?
						{
							id: {locationId, type: "witness2Ploy"},
							range: nextLocation.clues.witnesses[selectedWitnessesIndexes[1]].lures.length - 1
						} :
						{
							id: {locationId, type: "witness2Ploy", payload: "randomPloy"},
							range: locationsTotalNumber - 1
						};
					const selectedDataIndexRequest = nextLocation.clues.data[selectedDataIndex].lures && nextLocation.clues.data[selectedDataIndex].lures.length > 0 ? 
						{
							id: {locationId, type: "dataPloy"},
							range: nextLocation.clues.data[selectedDataIndex].lures.length - 1
						} : 
						{
							id: {locationId, type: "dataPloy", payload: "randomPloy"},
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
	
	luresIndexesRequests$.addListener({
		next: () => {}
	});

	const generatedPath$ = xs.combine(jsonResponse$, selectedLocations$).map(([jsonResponse, selectedLocations]) =>
		xs.combine(...selectedLocations.map((selectedLocation, index) => {
			const locationId = selectedLocation.location;
			const selectedLocationSelectedValues$ = selectedValue$.filter(selectedValue => selectedValue.id.locationId === locationId);

			const result$ = index < selectedLocations.length - 1 ? 
				xs.combine(
					selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "witnesses"),
					selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "data"),
					selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "witness1Ploy"),
					selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "witness2Ploy"),
					selectedLocationSelectedValues$.filter(selectedValue => selectedValue.id.type === "dataPloy"),
				).map(([selectedWitnesses, selectedData, selectedWitness1Ploy, selectedWitness2Ploy, selectedDataPloy]) => {
					const nextLocation = selectedLocations[index + 1];
					
					const selectedWitnessesIndexes = selectedWitnesses.val;
					const selectedDataIndex = selectedData.val;
					const selectedWitness1PloyIndex = selectedWitness1Ploy.val;
					const selectedWitness2PloyIndex = selectedWitness2Ploy.val;
					const selectedDataPloyIndex = selectedDataPloy.val;

					const availableLocations = jsonResponse.map(el => el.location);

					const witness1 = nextLocation.clues.witnesses[selectedWitnessesIndexes[0]].text;
					const witness2 = nextLocation.clues.witnesses[selectedWitnessesIndexes[1]].text;
					const data = nextLocation.clues.data[selectedDataIndex].text;
					const witness1Ploy = selectedWitness1Ploy.id.payload === "randomPloy" ?
						availableLocations[selectedWitness1PloyIndex] :
						nextLocation.clues.witnesses[selectedWitnessesIndexes[0]].lures[selectedWitness1PloyIndex];
					const witness2Ploy = selectedWitness2Ploy.id.payload === "randomPloy" ?
						availableLocations[selectedWitness2PloyIndex] :
						nextLocation.clues.witnesses[selectedWitnessesIndexes[1]].lures[selectedWitness2PloyIndex];
					const dataPloy = selectedDataPloy.id.payload === "randomPloy" ?
						availableLocations[selectedDataPloyIndex] :
						nextLocation.clues.data[selectedDataIndex].lures[selectedDataPloyIndex];

					// console.log('selectedDataPloy.id.payload === "randomPloy"', selectedDataPloy.id.payload === "randomPloy");
					// console.log("witness1Ploy", witness1Ploy);
					// console.log("witness2Ploy", witness2Ploy);
					// console.log("dataPloy", dataPloy);
					
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
							witness1Ploy,
							witness2Ploy,
							dataPloy
						]
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