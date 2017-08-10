import * as _ from 'lodash';

export function makeRandomDriver(){
	function randomDriver(sink$){
		const source$ = sink$.map(sink => {
			const {id, range, number, exclude, unique} = sink;

			const rangeDef = typeof range === "number" ? {min: 0, max: range} : range;

			const randomArray = _.chain(Array(rangeDef.max - rangeDef.min + 1)).map((value, index) => index + rangeDef.min).filter(value => !_.includes(exclude, value)).shuffle().value();

			var val;
			if(!number)
				val = randomArray[0];
				// val = _.random(rangeDef.min, rangeDef.max);
			else if(unique)
				val = _.take(randomArray, number);
			else
				val = _.chain(Array(number)).map((value, index) => _.random(randomArray.length - 1)).map(index => randomArray[index]).value();
				// val = _.map(Array(number), el => _.random(rangeDef.min, rangeDef.max));

			const ret = {id, val};

			return ret;
		});
		
		source$.addListener({
			next: () => {}
		});

		return source$;
	}

	return randomDriver;
}