import * as _ from 'lodash';

export function makeRandomDriver(){
	function randomDriver(sink$){
		const source$ = sink$.map(sink => {
			const {id, range, number, unique} = sink;

			const rangeDef = typeof range === "number" ? {min: 0, max: range} : range;

			var val;
			if(!number)
				val = _.random(rangeDef.min, rangeDef.max);
			else if(unique)
				val = _.chain(Array(rangeDef.max - rangeDef.min + 1)).map((value, index) => index + rangeDef.min).shuffle().take(number).value();
			else
				val = _.map(Array(number), el => _.random(rangeDef.min, rangeDef.max));

			const ret = {id, val};

			return ret;
		});
		

		return source$;
	}

	return randomDriver;
}