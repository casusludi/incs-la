
import { html } from 'snabbdom-jsx';
import xs from 'xstream'; 

export default function view(state$){

    return state$.map(state => 
        <div className={`game-side-menu ${state.open?'show':'hide'}`}>
            <div className="game-side-menu-overlay"></div>
            <button className="game-side-menu-button-open glue-button glue-button-right js-action-open-menu" type="button" ><i className="svg-icon icon-info" /></button>
            <div className="game-side-menu-content">
                <button className="game-side-menu-button-close glue-button glue-button-left js-action-close-menu" type="button" ><i className="svg-icon icon-close" /></button>
                <button className="js-action-go-main-menu button" type="button">Menu Principal</button>
                
                <p className="side-menu-panel">{state.location.desc}</p>
            </div>
        </div>        
    )
}