import xs from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';

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