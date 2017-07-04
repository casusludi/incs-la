import fromEvent from 'xstream/extra/fromEvent';

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