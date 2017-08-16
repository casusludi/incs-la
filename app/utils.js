import xs from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';

import { svg } from '@cycle/dom';

import * as _ from 'lodash';

// Convertit les chaînes de caractères formatées du .json en lien HTML
// Ex: Il avait rendez-vous avec un [paludier](https://fr.wikipedia.org/wiki/Saunier)
//     Il avait rendez-vous avec un <a href="https://fr.wikipedia.org/wiki/Saunier" target="_blank">paludier</a>
const RE = /\[([^\]]*)\]\(([^)]*)\)/g;
export function formatLinks(text){
    return text.replace(RE, '<a href="$2" target="_blank">$1</a>') 
}

// Retourne l'objet de lieu complet contenu dans le .json à partir de l'id du lieu. Étant utilisé de nombreuses fois, il a été utile de factoriser ce morçeau de code en le rendant par la même occasion plus explicite.
export function makeLocationObject(id, datas){
	return Object.assign({}, datas.locations[id], {id});
}

// Les méthodes pour récupérer les dimensions de la balise diffère d'une balise HTML à une balise SVG. Cette méthode générique permet de factoriser le code.
// La marge appliquée permet d'éviter des arrondis qui autrement, une fois le repositionnement effectué dans le composant Tooltip, emettent continuellement (ex: 74, 75, 74, 75...). Une marge de 1 permet de stopper cet effet. C'est plus une magouille qu'une véritable solution.
function getElementDimensions(DOM, elementClass, margin, type){
    return DOM.select(elementClass).elements()
    .filter(tag => tag.length > 0)
    .map(tag => tag[0])
    .map(tag => {
        switch(type) {
            case "html":
                return {
                    width: tag.clientWidth, 
                    height: tag.clientHeight,
                };
            case "svg": 
                return {
                    width: tag.getBoundingClientRect().width, 
                    height: tag.getBoundingClientRect().height,
                };
        };
    }).compose(dropRepeats((a, b) => 
        Math.abs(a.width - b.width) <= margin && 
        Math.abs(a.height - b.height) <= margin)
    );
}

// Sorte de surcharges de la méthode vue ci-dessus
export function getHtmlElementDimensions(DOM, elementClass, margin = 0){
    return getElementDimensions(DOM, elementClass, margin, "html");
}
export function getSvgElementDimensions(DOM, elementClass, margin = 0){
    return getElementDimensions(DOM, elementClass, margin, "svg");
}

// Méthodes utilisées à l'aide de 'compose' de xstream qui permet de récupérer un certain sink à partir d'un stream d'array. Le sink 'sinkName' de chaque élément de l'array est récupéré. Ils sont ensuite soit merge (avec mixMerge) ou combine (avec mixCombine).
export function mixMerge(sinkName){
    return inputs$ => inputs$.map(inputs => xs.merge(...inputs.map(input => input[sinkName]))).flatten();
}
export function mixCombine(sinkName){
    return inputs$ => inputs$.map(inputs => xs.combine(...inputs.map(input => input[sinkName]))).flatten();
}

// Permet d'obtenir des lignes poitillées dégradées à partir d'un chemin 'path' et d'un nombre de nuances 'sectionsNb' (ce qui est impossible en SVG "classique")
// Plus une expérience qu'une vértiable fonctionnalité
// La bonne idée serait de découper les lignes entre chaque pointillés pour que l'effet soit invisible (ce qui n'est pas le cas actuellement certaines lignes transparentes se superposent avec un effet bizarre comme résultat)
export function makeShadedLine(path, sectionsNb){
    if(path.length === 0)
        return [];
    const segmentsLengths = path.map(path => Math.sqrt(Math.pow(path.x1 - path.x2, 2) + Math.pow(path.y1 - path.y2, 2)));
    const segmentsAddedLengths = segmentsLengths.map((o, i) => segmentsLengths.slice(0, i).reduce((a, b) => a + b, 0));
    const totalLength = segmentsLengths.reduce((a, b) => a + b, 0);
    const sectionLength = totalLength / sectionsNb;

    var totalLengthTraveled = 0;
    var curCoord = {x: path[0].x1, y: path[0].y1};
    var curSegmentIndex = 0;
    
    const sectionsDatas = (new Array(sectionsNb)).fill(null).map((section, i) => {
        var curLengthTraveled = 0;
        var returnedVal = [{x: curCoord.x, y: curCoord.y, offset: totalLengthTraveled}];
        
        while(totalLengthTraveled + sectionLength > segmentsAddedLengths[curSegmentIndex + 1] && curLengthTraveled < sectionLength){
            curSegmentIndex += 1;
            curLengthTraveled += Math.sqrt(Math.pow(curCoord.x - path[curSegmentIndex].x1, 2) + Math.pow(curCoord.y - path[curSegmentIndex].y1, 2));
            curCoord = {x: path[curSegmentIndex].x1, y: path[curSegmentIndex].y1};
            returnedVal.push({x: curCoord.x, y: curCoord.y, offset: totalLengthTraveled + curLengthTraveled});
        }
        var remainingLength = totalLengthTraveled + sectionLength - segmentsAddedLengths[curSegmentIndex];
        curLengthTraveled = sectionLength;
        
        var curX = path[curSegmentIndex].x1 + (path[curSegmentIndex].x2 - path[curSegmentIndex].x1) * (remainingLength / segmentsLengths[curSegmentIndex]);
        var curY = path[curSegmentIndex].y1 + (path[curSegmentIndex].y2 - path[curSegmentIndex].y1) * (remainingLength / segmentsLengths[curSegmentIndex]);
        
        returnedVal.push({x: curX, y: curY, offset: totalLengthTraveled + curLengthTraveled});
        totalLengthTraveled += sectionLength;
        curCoord = {x: curX, y: curY};

        return returnedVal;
    });

    const pathSvgLines = sectionsDatas.map((sectionData, i) =>
        sectionData.slice(0, -1).map((v, j) =>
            svg.line({ attrs: { 
                x1: sectionData[j].x, 
                y1: sectionData[j].y, 
                x2: sectionData[j + 1].x,   
                y2: sectionData[j + 1].y, 
                style: `
                    stroke: rgb(200,200,200); 
                    stroke-width: 4; 
                    stroke-dasharray: 10, 10; 
                    stroke-linecap: round; 
                    stroke-opacity: ${i / sectionsDatas.length};
                    stroke-dashoffset: ${sectionData[j].offset};
                `
            }})
        )
    );

    return _.flatten(pathSvgLines);
}