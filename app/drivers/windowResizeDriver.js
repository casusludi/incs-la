import fromEvent from 'xstream/extra/fromEvent';

// Driver emettant chaque fois que la fenêtre du navigateur est redimensionnée 
export function makeWindowResizeDriver(){
  function windowSize () {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  };

  function windowResizeDriver () {
    return fromEvent(window, 'resize')
      .map(windowSize)
      .startWith(windowSize())
      .remember();
  };

  return windowResizeDriver;
}