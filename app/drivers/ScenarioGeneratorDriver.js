import xs from 'xstream';

import * as _ from 'lodash';

export function MakeScenarioGeneratorDriver(){
	function ScenarioGeneratorDriver(sink$){
		const source$ = sink$.map(sink => {
			const pathLocationsNumber = 10;
			const locationsTotalNumber = sink.locationsClues.length;
			const selectedLocationsIndex = _.chain(Array(locationsTotalNumber - 1)).map((value, index) => index + 1).shuffle().take(pathLocationsNumber - 1).value();

			const locationsClues = sink.locationsClues;
			const selectedLocations = _.concat(locationsClues[0], _.shuffle(locationsClues.filter((value, index) => _.includes(selectedLocationsIndex, index))));

			const path = selectedLocations.map((selectedLocation, index) => {
				const locationId = selectedLocation.location;

				var temoin1, temoin2, data;
				if(index < selectedLocations.length - 1){
					const nextLocation = selectedLocations[index + 1];
					
					const selectedWitnessesIndex = _.chain(Array(nextLocation.clues.temoins.length)).map((value, index) => index).shuffle().take(2).value();
					const selectedDataIndex = _.random(0, nextLocation.clues.data.length - 1);

					temoin1 = nextLocation.clues.temoins[selectedWitnessesIndex[0]];
					temoin2 = nextLocation.clues.temoins[selectedWitnessesIndex[1]];
					data = nextLocation.clues.data[selectedDataIndex];
				}
				
				return {
					"location": locationId,
					"clues":{
						"temoin-1":{
							"text": temoin1 ? temoin1 : null
						},
						"temoin-2":{
							"text": temoin2 ? temoin2 : null
						},
						"data":{
							"text": data ? data : null
						}
					}
				};
			});

			const data = Object.assign(
				{},
				{settings: sink.settings},
				{texts: sink.texts},
				{locations: sink.locations},
				{path: path},
			)

			return data;
		});

		return source$;
	}

	return ScenarioGeneratorDriver;
}