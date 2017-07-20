import xs from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';

import { svg } from '@cycle/dom';

import * as _ from 'lodash';

const RE = /\[([^\]]*)\]\(([^)]*)\)/g;

export function formatLinks(text){
    return text.replace(RE, '<a href="$2" target="_blank">$1</a>') 
}

// Takes a location id and makes an object up of this id attribute and the location object contained in the json file
export function makeLocationObject(id, datas){
	return Object.assign({}, datas.locations[id], {id});
}

// Drop null values from the input stream (more expressive than a simple filter)
export function dropNull(input$){
    return input$.filter(o => o);
}

function getElementDimensions(DOM, elementClass, margin, type){
    return DOM.select(elementClass).elements()
    .filter(tag => tag.length > 0)
    .map(tag => tag[0])
    .map(tag => (type === "html" ?
        {
            width: tag.clientWidth, 
            height: tag.clientHeight,
        } /*type === "svg"*/ :
        {
            width: tag.getBoundingClientRect().width, 
            height: tag.getBoundingClientRect().height,
        }
    )).compose(dropRepeats((a, b) => 
        Math.abs(a.width - b.width) <= margin && 
        Math.abs(a.height - b.height) <= margin)
    );
}

export function getHtmlElementDimensions(DOM, elementClass, margin = 0){
    return getElementDimensions(DOM, elementClass, margin, "html");
}

export function getSvgElementDimensions(DOM, elementClass, margin = 0){
    return getElementDimensions(DOM, elementClass, margin, "svg");
}

export function mixMerge(att){
    return inputs$ => inputs$.map(inputs => xs.merge(...inputs.map(input => input[att]))).flatten();
}

export function mixCombine(att){
    return inputs$ => inputs$.map(inputs => xs.combine(...inputs.map(input => input[att]))).flatten();
}

export function makeShadedLine(path, sectionsNb){
    if(path.length === 0)
        return [];
    const segmentsLengths = path.map(path => {console.log(path); return Math.sqrt(Math.pow(path.x1 - path.x2, 2) + Math.pow(path.y1 - path.y2, 2))});
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
                    stroke: rgb(200,0,0); 
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