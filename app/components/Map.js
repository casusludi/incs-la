import xs from 'xstream';
import { run } from '@cycle/run';
import isolate from '@cycle/isolate';
import { html } from 'snabbdom-jsx';

function intent(DOM){
    
}

function model(props$, action$){
    return props$.map(([settings, locations, currentLinksValues]) => {
        const landmark1 = settings.landmarks[0].location;
        const landmark2 = settings.landmarks[1].location;
        const coordinateLandmark1 = locations[landmark1].coordinates;
        const coordinateLandmark2 = locations[landmark2].coordinates;
        const pixelCoordinateLandmark1 = settings.landmarks[0].pixelCoordinates;
        const pixelCoordinateLandmark2 = settings.landmarks[1].pixelCoordinates;

        return Object.assign({},
            {images: settings.images},
            {locations:
                currentLinksValues.map(currentLinkValue => {
                    const xRatio = (coordinateLandmark2.latitude - coordinateLandmark1.latitude) / (pixelCoordinateLandmark2.x - pixelCoordinateLandmark1.x);
                    const x0 = (pixelCoordinateLandmark2.x * coordinateLandmark1.latitude - pixelCoordinateLandmark1.x * coordinateLandmark2.latitude) / (pixelCoordinateLandmark2.x - pixelCoordinateLandmark1.x);
                    const curX = (currentLinkValue.coordinates.latitude - x0) / xRatio - settings.landmarkImageDimension.x / 2;
                    
                    const yRatio = (coordinateLandmark2.longitude - coordinateLandmark1.longitude) / (pixelCoordinateLandmark2.y - pixelCoordinateLandmark1.y);
                    const y0 = (pixelCoordinateLandmark2.y * coordinateLandmark1.longitude - pixelCoordinateLandmark1.y * coordinateLandmark2.longitude) / (pixelCoordinateLandmark2.y - pixelCoordinateLandmark1.y);
                    const curY = (currentLinkValue.coordinates.longitude - y0) / yRatio - settings.landmarkImageDimension.y;
                    
                    return {
                        id: currentLinkValue.id,
                        x: curX,
                        y: curY,
                    }
                }),
            },
        );
    });
}

function view(value$){
    return value$.map(value =>
        (
            <div class-map="true">
                <img src={value.images.map} style={ ({position: 'relative', top: '0', left: '0'}) } />
                {Object.keys(value.locations).map((key, v) => {
                    return <img 
                        src={value.images.landmark}
                        style={ ({
                            position: 'absolute',  
                            left: value.locations[key].x + "px",
                            top: value.locations[key].y + "px",
                        }) }
                    />
                })}
            </div>
        )
    );
}

function _Map(sources) {
    const {props$, DOM} = sources;
    const action$ = intent(DOM);
    const value$ = model(props$, action$);
    const vdom$ = view(value$);

    const sinks = {
        DOM: vdom$,
    };

    return sinks;
}

export function Map(sources){ return isolate(_Map)(sources) };