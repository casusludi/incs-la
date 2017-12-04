import { html } from 'snabbdom-jsx';
import { formatLinks } from '../../utils';
import * as _ from 'lodash';

export function view(value$) {
    return value$
        .map(value =>
            <div className="witness">
                <figure className="witness-avatar">
                    <img src={value.image} />
                </figure>
                {value.showResult
                    ?
                    <div className="witness-cartdridge expanded"><span className=" witness-info"><span hook={{insert: vnode => vnode.elm.innerHTML = value.clue ? formatLinks(value.clue.text) : _.sample(value.dialogs)}}></span></span></div>
                    :
                    <div className="witness-cartdridge">
                        <button classNames="witness-action js-question-witness" type="button" >
                            {value.name}
                        </button>
                    </div>
                }
            </div>
        );
}
