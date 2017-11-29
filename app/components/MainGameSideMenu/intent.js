import xs from 'xstream';

export default function intent(DOM){
    return xs.merge(
        DOM.select('.js-button-open').events('click').mapTo({type:"open",value:true}),
        DOM.select('.js-button-close').events('click').mapTo({type:"open",value:false})
    );
}