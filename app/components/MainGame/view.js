import { html } from 'snabbdom-jsx';
import xs from 'xstream';

export default function view(sources){

    const {
        currentLocation$, 
        witnessesVDom$, 
        timeManagerVDom$, 
        mapVDom$, 
        props$, 
        datas$, 
        canTravel$,
        sideMenuVDom$
    } = sources;

    // VDom global
	return xs.combine(
        currentLocation$, 
        witnessesVDom$, 
        timeManagerVDom$, 
        mapVDom$, 
        props$, 
        datas$, 
        canTravel$,
        sideMenuVDom$
    )
    .map(([
        currentLocation,
        witnessesVDom,
        timeManagerVDom, 
        mapVDom, 
        props, 
        datas, 
        canTravel,
        sideMenuVDom
    ]) =>
        <section className="main">
            <section className="main-content" >
                <section className="city" style={{ backgroundImage: "url(" + currentLocation.image + ")" }} >
                    <section className="city-content">
                        <section className="col-main">
                            <header className="city-header">
                                {/* On affiche ici round + 1 car on commence au round n°0 et c'est plus explicite pour le joueur de commencer au round 1 */}
                                {timeManagerVDom}
                                <h1>{currentLocation.name /*+ " - Round : " + (props.round + 1) + " - Successes : " + props.successesNumber*/}</h1>
                                
                            </header>
                            <section className="col-main-body">
                                <div className="witness-list" >
                                    <div className={`investigate-info ${canTravel?'':''}`}> 
                                    <div className="panel">{datas.texts.travelDescription}</div>
                                    </div>
                                    {witnessesVDom}
                                </div>
                                
                                    
                                <div className="city-more">
                                    <div className="city-desc panel">{currentLocation.desc}</div>
                                   
                                </div>
                                {mapVDom}
                            </section>
                            {sideMenuVDom}
                        </section>
                        {/*<aside className="aside">
                        <div classNames="city-desc scrollable-panel panel">
                            {currentLocation.desc}
                        </div>
                        <div classNames="panel scrollable-panel">
                            {datas.texts.gameDescription}
                        </div>
                        <div classNames="game-time panel red-panel">
                            {timeManagerVDom}
                        </div>
                        <button className="js-go-to-main-menu button-3d" type="button">Menu Principal</button>
                    </aside>*/}
                    </section>
                </section>
            </section>
        </section>
    );
}