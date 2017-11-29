
import { html } from 'snabbdom-jsx';
import xs from 'xstream'; 

export default function view(state$){

    return state$.map(state => 
        <div className={`game-side-menu ${state.open?'show':'hide'}`}>
            <div className="game-side-menu-overlay"></div>
            <button className="game-side-menu-button-open glue-button glue-button-right js-button-open" type="button" ><i className="svg-icon icon-info" /></button>
            <div className="game-side-menu-content">
                <button className="game-side-menu-button-close glue-button glue-button-left js-button-close" type="button" ><i className="svg-icon icon-close" /></button>
                Pouet {state.open}
            </div>
        </div>        
    )
}