import * as _ from 'lodash';

// Driver permettant de générer des nombres aléatoires
// L'aléatoire étant un aspect contraire à la programmation fonctionnelle, ce traitement est relégué à un driver
export function randomDriver(sink$){
	const source$ = sink$.map(sink => {
		// attributs :
		// id - identifiant permettant de retrouver la réponse correspondante à une requête donnée (sur le principe du driver HTTP)
		// range - objet contenant 2 attributs 'min' et 'max' définissant les bornes (incluses) entre lesquelles sont générés les nombres aléatoires. Peut être un nombre unique et dans ce cas sera converti en {min: 0, max: [ce nombre]}
		// Number - nombre de chiffres à tirer
		// exclude - tableau contenant les nombres à ne pas tirer
		// unique - si plusieurs nombres à tirer alors définie si ces nombres doivent être uniques
		const {id, range, number, exclude, unique} = sink;

		// si l'att range est un nombre, le convertit en objet {min, max}
		const rangeDef = typeof range === "number" ? {min: 0, max: range} : range;

		const randomArray = 
		_.chain(Array(rangeDef.max - rangeDef.min + 1)) // Génère un tableau vide de la taille de l'intervalle définie par les bornes min et max
		.map((value, index) => index + rangeDef.min) // Rempli le tableau avec les nombres à tirer
		.filter(value => !_.includes(exclude, value)) // Retire les nombres à exclure
		.shuffle() // Mélange le tableau
		.value();

		var val;
		if(!number) // Si l'att number n'est pas précisé alors on tire un unique nombre
			val = randomArray[0];
		else if(unique)
			val = _.take(randomArray, number);
		else // Si les nombres n'ont pas à être unique on tire des nombres au hasard parmis la liste des indices de randomArray et map ensuite leurs valeurs avec celles correspondant dans randomArray
			val = _.chain(Array(number)).map((value, index) => _.random(randomArray.length - 1)).map(index => randomArray[index]).value();

		// La valeur de retour est un objet contenant l'id de la requête ainsi que le réponse val
		const ret = {id, val};

		return ret;
	});
	
	// Étant un driver, il doit contenir un listener (même vide)
	// Cependant qu'il soit là ou pas cela ne change pas l'éxécution du code (Je ne l'explique pas)
	/*
	source$.addListener({
		next: () => {}
	});
	*/

	return source$;
}