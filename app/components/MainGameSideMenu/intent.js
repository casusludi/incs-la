import xs from 'xstream';

export default function intent(DOM){
    return xs.merge(
        DOM.select('.js-action-go-main-menu').events('click').mapTo({type:"goto",value:"/"}),
        DOM.select('.js-action-open-menu').events('click').mapTo({type:"open-menu",value:true}),
        DOM.select('.js-action-close-menu').events('click').mapTo({type:"open-menu",value:false})
    );
}