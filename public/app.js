(function() {
  'use strict';

  var globals = typeof global === 'undefined' ? self : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};
  var aliases = {};
  var has = {}.hasOwnProperty;

  var expRe = /^\.\.?(\/|$)/;
  var expand = function(root, name) {
    var results = [], part;
    var parts = (expRe.test(name) ? root + '/' + name : name).split('/');
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function expanded(name) {
      var absolute = expand(dirname(path), name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var hot = hmr && hmr.createHot(name);
    var module = {id: name, exports: {}, hot: hot};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var expandAlias = function(name) {
    return aliases[name] ? expandAlias(aliases[name]) : name;
  };

  var _resolve = function(name, dep) {
    return expandAlias(expand(dirname(name), dep));
  };

  var require = function(name, loaderPath) {
    if (loaderPath == null) loaderPath = '/';
    var path = expandAlias(name);

    if (has.call(cache, path)) return cache[path].exports;
    if (has.call(modules, path)) return initModule(path, modules[path]);

    throw new Error("Cannot find module '" + name + "' from '" + loaderPath + "'");
  };

  require.alias = function(from, to) {
    aliases[to] = from;
  };

  var extRe = /\.[^.\/]+$/;
  var indexRe = /\/index(\.[^\/]+)?$/;
  var addExtensions = function(bundle) {
    if (extRe.test(bundle)) {
      var alias = bundle.replace(extRe, '');
      if (!has.call(aliases, alias) || aliases[alias].replace(extRe, '') === alias + '/index') {
        aliases[alias] = bundle;
      }
    }

    if (indexRe.test(bundle)) {
      var iAlias = bundle.replace(indexRe, '');
      if (!has.call(aliases, iAlias)) {
        aliases[iAlias] = bundle;
      }
    }
  };

  require.register = require.define = function(bundle, fn) {
    if (bundle && typeof bundle === 'object') {
      for (var key in bundle) {
        if (has.call(bundle, key)) {
          require.register(key, bundle[key]);
        }
      }
    } else {
      modules[bundle] = fn;
      delete cache[bundle];
      addExtensions(bundle);
    }
  };

  require.list = function() {
    var list = [];
    for (var item in modules) {
      if (has.call(modules, item)) {
        list.push(item);
      }
    }
    return list;
  };

  var hmr = globals._hmr && new globals._hmr(_resolve, require, modules, cache);
  require._cache = cache;
  require.hmr = hmr && hmr.wrap;
  require.brunch = true;
  globals.require = require;
})();

(function() {
var global = typeof window === 'undefined' ? this : window;
var __makeRelativeRequire = function(require, mappings, pref) {
  var none = {};
  var tryReq = function(name, pref) {
    var val;
    try {
      val = require(pref + '/node_modules/' + name);
      return val;
    } catch (e) {
      if (e.toString().indexOf('Cannot find module') === -1) {
        throw e;
      }

      if (pref.indexOf('node_modules') !== -1) {
        var s = pref.split('/');
        var i = s.lastIndexOf('node_modules');
        var newPref = s.slice(0, i).join('/');
        return tryReq(name, newPref);
      }
    }
    return none;
  };
  return function(name) {
    if (name in mappings) name = mappings[name];
    if (!name) return;
    if (name[0] !== '.' && pref) {
      var val = tryReq(name, pref);
      if (val !== none) return val;
    }
    return require(name);
  }
};
require.register("components/ChangeLocation.js", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ChangeLocation = ChangeLocation;

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _run = require('@cycle/run');

var _isolate = require('@cycle/isolate');

var _isolate2 = _interopRequireDefault(_isolate);

var _snabbdomJsx = require('snabbdom-jsx');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function intent(DOM) {

    var click$ = DOM.select('.js-change-location').events('click').mapTo(true);

    return click$;
}

function model(props$, action$) {
    return action$.map(function (action) {
        return props$;
    }).flatten();
}

function view(props$) {
    return props$.map(function (props) {
        return (0, _snabbdomJsx.html)(
            'button',
            { selector: '.js-change-location', type: 'button' },
            props.name
        );
    });
}

function _ChangeLocation(sources) {
    var props$ = sources.props$,
        DOM = sources.DOM;

    var action$ = intent(DOM);
    var value$ = model(props$, action$);
    var vdom$ = view(props$);

    var sinks = {
        DOM: vdom$,
        changeLocation$: value$,
        linkValue$: props$
    };

    return sinks;
}

function ChangeLocation(sources) {
    return (0, _isolate2.default)(_ChangeLocation)(sources);
};

});

require.register("components/EndGame.js", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.EndGame = EndGame;

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _run = require('@cycle/run');

var _isolate = require('@cycle/isolate');

var _isolate2 = _interopRequireDefault(_isolate);

var _snabbdomJsx = require('snabbdom-jsx');

var _lodash = require('lodash');

var _ = _interopRequireWildcard(_lodash);

var _JSONReader = require('./JSONReader');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function intent(DOM) {
    var click$ = DOM.select('.button-3d').events('click');

    return click$;
}

function view(value$) {
    var vdom$ = value$.map(function (value) {
        return (0, _snabbdomJsx.html)(
            'div',
            { classNames: 'content end' },
            ' ',
            (0, _snabbdomJsx.html)(
                'div',
                { className: 'modal' },
                false /*props.success*/ ? (0, _snabbdomJsx.html)(
                    'div',
                    { classNames: 'panel final-panel' },
                    value.texts.win,
                    '15h45'
                ) : (0, _snabbdomJsx.html)(
                    'div',
                    { classNames: 'panel final-panel' },
                    value.texts.loose
                ),
                (0, _snabbdomJsx.html)(
                    'a',
                    { className: 'button-3d' },
                    'Rejouer'
                )
            )
        );
    });

    return vdom$;
}

function _EndGame(sources) {
    var HTTP = sources.HTTP,
        DOM = sources.DOM;

    // JSON management

    var jsonSinks = (0, _JSONReader.JSONReader)({ HTTP: HTTP });
    var jsonRequest$ = jsonSinks.request;
    var jsonResponse$ = jsonSinks.JSON;

    var action$ = intent(DOM);
    var vdom$ = view(jsonResponse$);

    var sinks = {
        DOM: vdom$,
        HTTP: jsonRequest$,
        router: action$.mapTo("/")
    };

    return sinks;
}

function EndGame(sources) {
    return (0, _isolate2.default)(_EndGame)(sources);
};

});

require.register("components/IntroGame.js", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
				value: true
});
exports.IntroGame = IntroGame;

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _run = require('@cycle/run');

var _isolate = require('@cycle/isolate');

var _isolate2 = _interopRequireDefault(_isolate);

var _snabbdomJsx = require('snabbdom-jsx');

var _lodash = require('lodash');

var _ = _interopRequireWildcard(_lodash);

var _JSONReader = require('./JSONReader');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function intent(DOM) {
				var click$ = DOM.select('.button-3d').events('click');

				return click$;
}

function view(value$) {
				var vdom$ = value$.map(function (value) {
								return (0, _snabbdomJsx.html)(
												'div',
												{ classNames: 'content intro', style: { backgroundImage: "url(" + value.settings.images.intro + ")" } },
												(0, _snabbdomJsx.html)(
																'div',
																{ className: 'modal' },
																(0, _snabbdomJsx.html)(
																				'div',
																				{ className: 'panel' },
																				value.texts.intro
																),
																(0, _snabbdomJsx.html)(
																				'a',
																				{ className: 'button-3d' },
																				value.texts.play
																)
												)
								);
				});

				return vdom$;
}

function _IntroGame(sources) {
				var HTTP = sources.HTTP,
				    DOM = sources.DOM;

				// JSON management

				var jsonSinks = (0, _JSONReader.JSONReader)({ HTTP: HTTP });
				var jsonRequest$ = jsonSinks.request;
				var jsonResponse$ = jsonSinks.JSON;

				var action$ = intent(DOM);
				var vdom$ = view(jsonResponse$);

				var sinks = {
								DOM: vdom$,
								HTTP: jsonRequest$,
								router: action$.mapTo("/game")
				};

				return sinks;
}

function IntroGame(sources) {
				return (0, _isolate2.default)(_IntroGame)(sources);
};

});

require.register("components/Investigate.js", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Investigate = Investigate;

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _run = require('@cycle/run');

var _isolate = require('@cycle/isolate');

var _isolate2 = _interopRequireDefault(_isolate);

var _snabbdomJsx = require('snabbdom-jsx');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function intent(DOM) {
    return DOM.select('.js-investigate').events('click').mapTo(true);
}

function model(action$, props$) {
    return props$.map(function (props) {
        return action$.map(function (val) {
            return {
                name: props.name,
                image: props.image,
                dialog: props.dialog,
                clue: props.clue,
                showResult: val
            };
        }).startWith(props);
    }).flatten().remember();
}

function view(state$) {
    return state$.map(function (state) {
        return (0, _snabbdomJsx.html)(
            'section',
            { selector: '.place-item' },
            state.showResult ? (0, _snabbdomJsx.html)(
                'figure',
                null,
                (0, _snabbdomJsx.html)('img', { src: state.image }),
                (0, _snabbdomJsx.html)(
                    'figcaption',
                    null,
                    state.clue ? (0, _snabbdomJsx.html)(
                        'span',
                        null,
                        state.clue.text
                    ) : (0, _snabbdomJsx.html)(
                        'span',
                        null,
                        state.dialog
                    )
                )
            ) : (0, _snabbdomJsx.html)(
                'button',
                { selector: '.js-investigate', type: 'button' },
                state.name
            )
        );
    });
}

function _Investigate(sources) {

    var action$ = intent(sources.DOM);
    var state$ = model(action$, sources.props);
    var vdom$ = view(state$);

    var sinks = {
        DOM: vdom$,
        value: state$.map(function (state) {
            return !!state.showResult;
        })
    };

    return sinks;
}

function Investigate(sources) {
    return (0, _isolate2.default)(_Investigate)(sources);
};

});

require.register("components/JSONReader.js", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.JSONReader = JSONReader;

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _run = require('@cycle/run');

var _isolate = require('@cycle/isolate');

var _isolate2 = _interopRequireDefault(_isolate);

var _snabbdomJsx = require('snabbdom-jsx');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function JSONReader(sources) {

    var request$ = _xstream2.default.of({
        url: '/data.json',
        category: 'data'
    });

    var response$ = sources.HTTP.select('data').flatten().map(function (response) {
        return response.body;
    });

    var sinks = {
        JSON: response$,
        request: request$
    };

    return sinks;
}

});

;require.register("components/Landmark.js", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.Landmark = Landmark;

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _run = require('@cycle/run');

var _isolate = require('@cycle/isolate');

var _isolate2 = _interopRequireDefault(_isolate);

var _snabbdomJsx = require('snabbdom-jsx');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function intent(DOM) {
    var action$ = _xstream2.default.merge(DOM.select('.js-change-location').events('click').mapTo({ type: "changeLocation" }), DOM.select('.js-show-info').events('click').mapTo({ type: "showInfos" }));

    return action$;
}

function model(props$, action$) {
    return action$.filter(function (action) {
        return action.type === "changeLocation";
    }).map(function (action) {
        return props$.map(function (props) {
            return props.location;
        });
    }).flatten();
}

function view(props$, action$) {
    var showInfos$ = action$.filter(function (action) {
        return action.type === "showInfos";
    }).fold(function (acc, x) {
        return acc ? false : true;
    }, false);

    return _xstream2.default.combine(props$, showInfos$).map(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
            props = _ref2[0],
            showInfos = _ref2[1];

        return (0, _snabbdomJsx.html)(
            'div',
            null,
            (0, _snabbdomJsx.html)('img', {
                // class-js-change-location={props.isReachableLandmark}
                className: 'js-show-info',
                src: props.isCurrentLocation ? props.settings.images.currentLocationLandmark : props.isReachableLandmark ? props.settings.images.reachableLandmark : props.settings.images.unreachableLandmark,
                style: {
                    position: 'absolute',
                    left: props.pixelCoordinates.x + "px",
                    top: props.pixelCoordinates.y + "px"
                }
            }),
            showInfos ? (0, _snabbdomJsx.html)(
                'div',
                {
                    style: {
                        position: 'absolute',
                        left: props.pixelCoordinates.x + "px",
                        top: props.pixelCoordinates.y + 30 + "px",
                        backgroundColor: "white"
                    }
                },
                props.location.name,
                props.isReachableLandmark ? (0, _snabbdomJsx.html)(
                    'button',
                    { selector: '.js-change-location', type: 'button' },
                    'Move to'
                ) : ""
            ) : ""
        );
    });
}

function _Landmark(sources) {
    var props$ = sources.props$,
        DOM = sources.DOM;

    var action$ = intent(DOM);
    var value$ = model(props$, action$);
    var vdom$ = view(props$, action$);

    var sinks = {
        DOM: vdom$,
        changeLocation$: value$
    };

    return sinks;
}

function Landmark(sources) {
    return (0, _isolate2.default)(_Landmark)(sources);
};

});

require.register("components/MainGame.js", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.MainGame = MainGame;

var _run = require('@cycle/run');

var _dom = require('@cycle/dom');

var _http = require('@cycle/http');

var _cyclicRouter = require('cyclic-router');

var _isolate = require('@cycle/isolate');

var _isolate2 = _interopRequireDefault(_isolate);

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _fromDiagram = require('xstream/extra/fromDiagram');

var _fromDiagram2 = _interopRequireDefault(_fromDiagram);

var _dropRepeats = require('xstream/extra/dropRepeats');

var _dropRepeats2 = _interopRequireDefault(_dropRepeats);

var _delay = require('xstream/extra/delay');

var _delay2 = _interopRequireDefault(_delay);

var _pairwise = require('xstream/extra/pairwise');

var _pairwise2 = _interopRequireDefault(_pairwise);

var _lodash = require('lodash');

var _ = _interopRequireWildcard(_lodash);

var _snabbdomJsx = require('snabbdom-jsx');

var _switchPath = require('switch-path');

var _switchPath2 = _interopRequireDefault(_switchPath);

var _Investigate = require('./Investigate');

var _ChangeLocation = require('./ChangeLocation');

var _Witness = require('./Witness');

var _JSONReader = require('./JSONReader');

var _TimeManager = require('./TimeManager');

var _Map = require('./Map');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _MainGame(sources) {
  var HTTP = sources.HTTP,
      DOM = sources.DOM;

  // JSON management

  var jsonSinks = (0, _JSONReader.JSONReader)({ HTTP: HTTP });
  var jsonRequest$ = jsonSinks.request;
  var jsonResponse$ = jsonSinks.JSON;

  var settings$ = jsonResponse$.map(function (jsonResponse) {
    return jsonResponse.settings;
  });
  var texts$ = jsonResponse$.map(function (jsonResponse) {
    return jsonResponse.texts;
  });
  var path$ = jsonResponse$.map(function (jsonResponse) {
    return jsonResponse.path;
  });
  var locations$ = jsonResponse$.map(function (jsonResponse) {
    return jsonResponse.locations;
  });

  // Locations management
  var changeLocationProxy$ = _xstream2.default.create();

  var currentLocation$ = changeLocationProxy$.remember();

  var lastLocation$ = currentLocation$.compose(_pairwise2.default).map(function (item) {
    return item[0];
  }).startWith("");

  var nextCorrectLocationProxy$ = _xstream2.default.create();

  var pathInit$ = _xstream2.default.combine(path$, locations$).map(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        path = _ref2[0],
        locations = _ref2[1];

    return Object.assign({}, locations[path[0].location], { id: path[0].location });
  });

  var currentLocationLinks$ = _xstream2.default.combine(nextCorrectLocationProxy$, currentLocation$, lastLocation$, locations$).map(function (_ref3) {
    var _ref4 = _slicedToArray(_ref3, 5),
        nextCorrectLocation = _ref4[0],
        currentLocation = _ref4[1],
        lastLocation = _ref4[2],
        locations = _ref4[3],
        path = _ref4[4];

    var links = _.chain(currentLocation.links || []).concat(lastLocation ? [lastLocation.id] : []).uniq().filter(function (o) {
      return o !== currentLocation.id;
    }).shuffle().value();

    return links.map(function (link) {
      return (0, _ChangeLocation.ChangeLocation)({
        DOM: DOM,
        props$: _xstream2.default.of(Object.assign({}, locations[link], { id: link }))
      });
    });
  });

  var currentLinksValues$ = currentLocationLinks$.map(function (links) {
    return _xstream2.default.combine.apply(_xstream2.default, _toConsumableArray(links.map(function (link) {
      return link.linkValue$;
    })));
  }).flatten();

  // Map
  var mapProps$ = _xstream2.default.combine(currentLocation$, settings$, locations$, currentLinksValues$);
  var mapSinks = (0, _Map.Map)({ DOM: DOM, props$: mapProps$ });
  //////////

  var changeLocation$ = _xstream2.default.merge(currentLocationLinks$.map(function (links) {
    return _xstream2.default.merge.apply(_xstream2.default, _toConsumableArray(links.map(function (link) {
      return link.changeLocation$;
    })));
  }).startWith(pathInit$).flatten(), mapSinks.changeLocation$);

  changeLocationProxy$.imitate(changeLocation$);

  // Progression management
  var progressionProxy$ = _xstream2.default.create();

  var nextCorrectLocation$ = _xstream2.default.combine(path$, progressionProxy$).map(function (_ref5) {
    var _ref6 = _slicedToArray(_ref5, 2),
        path = _ref6[0],
        progression = _ref6[1];

    return { id: path.length > progression + 1 ? path[progression + 1].location : null };
  }).remember();

  nextCorrectLocationProxy$.imitate(nextCorrectLocation$.compose((0, _dropRepeats2.default)()));

  var correctNextChoosenCity$ = _xstream2.default.combine(currentLocation$, nextCorrectLocation$).filter(function (_ref7) {
    var _ref8 = _slicedToArray(_ref7, 2),
        currentLocation = _ref8[0],
        nextCorrectLocation = _ref8[1];

    return currentLocation.id === nextCorrectLocation.id;
  });

  var progression$ = correctNextChoosenCity$.mapTo(1).fold(function (acc, x) {
    return acc + x;
  }, 0);

  progressionProxy$.imitate(_xstream2.default.merge(progression$, _xstream2.default.of(0)));

  // Witness management
  var witnessesData$ = currentLocation$.map(function (currentLocation) {
    return currentLocation.places;
  });

  var witnesses$ = _xstream2.default.combine(witnessesData$, path$, currentLocation$, progression$).map(function (_ref9) {
    var _ref10 = _slicedToArray(_ref9, 4),
        witnessesData = _ref10[0],
        path = _ref10[1],
        currentLocation = _ref10[2],
        progression = _ref10[3];

    return Object.keys(witnessesData).map(function (key, value) {
      return (0, _isolate2.default)(_Witness.Witness, key)({
        DOM: sources.DOM,
        props$: _xstream2.default.of(Object.assign({}, witnessesData[key], path[progression].location === currentLocation.id ? { clue: path[progression].clues[key] } : {}))
      });
    });
  });

  var witnessQuestionned$ = witnesses$.map(function (witnesses) {
    return _xstream2.default.merge.apply(_xstream2.default, _toConsumableArray(witnesses.map(function (witness) {
      return witness.questionned$;
    })));
  }).flatten();

  // Time management
  var timeManagerSinks = (0, _TimeManager.TimeManager)({ DOM: DOM, settings: settings$, changeLocation: changeLocation$, witnessQuestionned: witnessQuestionned$ });

  // End game reached ?
  var lastLocationReached$ = _xstream2.default.combine(path$, progression$).filter(function (_ref11) {
    var _ref12 = _slicedToArray(_ref11, 2),
        path = _ref12[0],
        progression = _ref12[1];

    return progression === path.length - 1;
  }).mapTo(true);

  // View
  var witnessesVTree$ = witnesses$.map(function (witnesses) {
    return _xstream2.default.combine.apply(_xstream2.default, _toConsumableArray(witnesses.map(function (witness) {
      return witness.DOM;
    })));
  }).flatten();
  var linksVTree$ = currentLocationLinks$.map(function (links) {
    return _xstream2.default.combine.apply(_xstream2.default, _toConsumableArray(links.map(function (link) {
      return link.DOM;
    })));
  }).flatten();
  var TimeManagerVTree$ = timeManagerSinks.DOM;
  var mapVTree$ = mapSinks.DOM;

  var DOMSink$ = _xstream2.default.combine(linksVTree$, currentLocation$, witnessesVTree$, progression$, TimeManagerVTree$, mapVTree$, texts$, witnessQuestionned$).map(function (_ref13) {
    var _ref14 = _slicedToArray(_ref13, 8),
        linksVTree = _ref14[0],
        currentLocation = _ref14[1],
        witnessesVTree = _ref14[2],
        progression = _ref14[3],
        TimeManagerVTree = _ref14[4],
        mapVTree = _ref14[5],
        texts = _ref14[6],
        witnessQuestionned = _ref14[7];

    return (0, _snabbdomJsx.html)(
      'section',
      { className: 'city', style: { backgroundImage: "url(" + currentLocation.image + ")" } },
      (0, _snabbdomJsx.html)(
        'section',
        { className: 'col-main' },
        (0, _snabbdomJsx.html)(
          'header',
          null,
          (0, _snabbdomJsx.html)(
            'h1',
            null,
            currentLocation.name
          )
        ),
        (0, _snabbdomJsx.html)(
          'section',
          { className: 'place-list' },
          witnessesVTree
        ),
        (0, _snabbdomJsx.html)(
          'aside',
          { className: 'aside' },
          (0, _snabbdomJsx.html)(
            'div',
            { classNames: 'city-desc scrollable-panel panel' },
            currentLocation.desc
          ),
          (0, _snabbdomJsx.html)(
            'div',
            { classNames: 'panel scrollable-panel' },
            texts.gameDescription
          ),
          (0, _snabbdomJsx.html)(
            'div',
            { classNames: 'game-time panel red-panel' },
            TimeManagerVTree
          )
        )
      ),
      (0, _snabbdomJsx.html)(
        'footer',
        null,
        (0, _snabbdomJsx.html)(
          'div',
          { className: 'travel-panel' },
          witnessQuestionned ? (0, _snabbdomJsx.html)(
            'div',
            null,
            (0, _snabbdomJsx.html)(
              'div',
              { className: 'travel-labem' },
              texts.travelLabel
            ),
            (0, _snabbdomJsx.html)(
              'nav',
              null,
              linksVTree
            )
          ) : (0, _snabbdomJsx.html)(
            'div',
            null,
            texts.travelDescription
          )
        )
      ),
      mapVTree
    );
  });

  var sinks = {
    DOM: DOMSink$,
    HTTP: jsonRequest$,
    router: lastLocationReached$.mapTo("/end") // lastLocationReached$.mapTo({ pathname: "/end", state: { elapsedTime: timeManagerSinks.elapsedTime} })
  };
  return sinks;
}

function MainGame(sources) {
  return (0, _isolate2.default)(_MainGame)(sources);
};

});

require.register("components/Map.js", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.Map = Map;

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _run = require('@cycle/run');

var _isolate = require('@cycle/isolate');

var _isolate2 = _interopRequireDefault(_isolate);

var _snabbdomJsx = require('snabbdom-jsx');

var _Landmark = require('./Landmark');

var _lodash = require('lodash');

var _ = _interopRequireWildcard(_lodash);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function intent(DOM) {

    var click$ = DOM.select('.js-show-map').events('click');

    var showMap$ = click$.fold(function (acc, x) {
        return acc ? false : true;
    }, false);

    return showMap$;
}

function model(props$, DOM) {
    var propsWithPixelCoordinates$ = props$.map(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 4),
            currentLocation = _ref2[0],
            settings = _ref2[1],
            locations = _ref2[2],
            currentLinksValues = _ref2[3];

        var landmark1 = settings.landmarks[0].location;
        var landmark2 = settings.landmarks[1].location;
        var coordinateLandmark1 = locations[landmark1].coordinates;
        var coordinateLandmark2 = locations[landmark2].coordinates;
        var pixelCoordinateLandmark1 = settings.landmarks[0].pixelCoordinates;
        var pixelCoordinateLandmark2 = settings.landmarks[1].pixelCoordinates;

        var linksIDs = currentLinksValues.map(function (currentLinkValue) {
            return currentLinkValue.id;
        });

        return Object.keys(locations).map(function (key, value) {
            var xRatio = (coordinateLandmark2.latitude - coordinateLandmark1.latitude) / (pixelCoordinateLandmark2.x - pixelCoordinateLandmark1.x);
            var x0 = (pixelCoordinateLandmark2.x * coordinateLandmark1.latitude - pixelCoordinateLandmark1.x * coordinateLandmark2.latitude) / (pixelCoordinateLandmark2.x - pixelCoordinateLandmark1.x);
            var curX = (locations[key].coordinates.latitude - x0) / xRatio - settings.landmarkImageDimension.x / 2;

            var yRatio = (coordinateLandmark2.longitude - coordinateLandmark1.longitude) / (pixelCoordinateLandmark2.y - pixelCoordinateLandmark1.y);
            var y0 = (pixelCoordinateLandmark2.y * coordinateLandmark1.longitude - pixelCoordinateLandmark1.y * coordinateLandmark2.longitude) / (pixelCoordinateLandmark2.y - pixelCoordinateLandmark1.y);
            var curY = (locations[key].coordinates.longitude - y0) / yRatio - settings.landmarkImageDimension.y;

            var isCurrentLocation = key === currentLocation.id;
            var isReachableLandmark = _.includes(linksIDs, key);

            return {
                settings: settings,
                location: Object.assign({}, locations[key], { id: key }),
                pixelCoordinates: {
                    x: curX,
                    y: curY
                },
                isCurrentLocation: isCurrentLocation,
                isReachableLandmark: isReachableLandmark
            };
        });
    });

    var landmarks$ = propsWithPixelCoordinates$.map(function (propsWithPixelCoordinates) {
        return propsWithPixelCoordinates.map(function (propWithPixelCoordinates) {
            return (0, _Landmark.Landmark)({ DOM: DOM, props$: _xstream2.default.of(propWithPixelCoordinates) });
        });
    });

    return landmarks$;
}

function view(value$, props$, action$) {
    var landmarksVTree$ = value$.map(function (landmarks) {
        return _xstream2.default.combine.apply(_xstream2.default, _toConsumableArray(landmarks.map(function (landmark) {
            return landmark.DOM;
        })));
    }).flatten();

    var vdom$ = _xstream2.default.combine(value$, landmarksVTree$, props$, action$).map(function (_ref3) {
        var _ref4 = _slicedToArray(_ref3, 4),
            value = _ref4[0],
            landmarksVTree = _ref4[1],
            _ref4$ = _slicedToArray(_ref4[2], 4),
            currentLocation = _ref4$[0],
            settings = _ref4$[1],
            locations = _ref4$[2],
            currentLinksValues = _ref4$[3],
            showMap = _ref4[3];

        return (0, _snabbdomJsx.html)(
            'div',
            null,
            (0, _snabbdomJsx.html)(
                'button',
                { selector: '.js-show-map', type: 'button' },
                'Show map'
            ),
            showMap ? (0, _snabbdomJsx.html)(
                'div',
                { 'class-map': 'true' },
                (0, _snabbdomJsx.html)('img', { src: settings.images.map, style: { position: 'relative', top: '0', left: '0' } }),
                landmarksVTree
            ) : ""
        );
    });

    return vdom$;
}

function _Map(sources) {
    var props$ = sources.props$,
        DOM = sources.DOM;

    var action$ = intent(DOM);
    var value$ = model(props$, DOM);

    var changeLocation$ = value$.map(function (landmarks) {
        return _xstream2.default.merge.apply(_xstream2.default, _toConsumableArray(landmarks.map(function (landmark) {
            return landmark.changeLocation$;
        })));
    }).flatten();

    var vdom$ = view(value$, props$, action$);

    var sinks = {
        DOM: vdom$,
        changeLocation$: changeLocation$
    };

    return sinks;
}

function Map(sources) {
    return (0, _isolate2.default)(_Map)(sources);
};

});

require.register("components/NotFound.js", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.NotFound = NotFound;

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _run = require('@cycle/run');

var _isolate = require('@cycle/isolate');

var _isolate2 = _interopRequireDefault(_isolate);

var _snabbdomJsx = require('snabbdom-jsx');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function NotFound(sources) {
    var previousPageClick$ = sources.DOM.select(".previous").events("click");
    var goBack$ = previousPageClick$.mapTo({ type: "goBack" });

    var DOMSink$ = _xstream2.default.of((0, _snabbdomJsx.html)(
        'div',
        null,
        (0, _snabbdomJsx.html)(
            'h1',
            null,
            '404 Not Found'
        ),
        (0, _snabbdomJsx.html)(
            'button',
            { selector: '.previous' },
            'Previous'
        )
    ));

    return {
        DOM: DOMSink$,
        router: goBack$
    };
};

});

require.register("components/TimeManager.js", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.TimeManager = TimeManager;

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _run = require('@cycle/run');

var _isolate = require('@cycle/isolate');

var _isolate2 = _interopRequireDefault(_isolate);

var _snabbdomJsx = require('snabbdom-jsx');

var _lodash = require('lodash');

var _ = _interopRequireWildcard(_lodash);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function model(sources) {
    var settings$ = sources.settings;
    var changeLocation$ = sources.changeLocation;
    var witnessQuestionned$ = sources.witnessQuestionned;

    var elapsedTime$ = settings$.map(function (settings) {
        return _xstream2.default.merge(changeLocation$.mapTo(settings.cost.travel), witnessQuestionned$.mapTo(settings.cost.investigate));
    }).flatten().fold(function (acc, x) {
        return acc + x;
    }, 0);

    return elapsedTime$.map(function (elapsedTime) {
        var hours = parseInt(elapsedTime % 24); //elapsedTime - elapsedTime % 1;
        var minutes = (elapsedTime % 24 - hours) * 60;
        return {
            raw: elapsedTime,
            hours: hours,
            minutes: minutes
        };
    });
}

function view(value$) {
    return value$.map(function (value) {
        return (0, _snabbdomJsx.html)(
            'span',
            null,
            _.padStart(value.hours, 2, '0'),
            'h',
            _.padStart(value.minutes, 2, '0')
        );
    });
}

function _TimeManager(sources) {
    var value$ = model(sources);
    var vdom$ = view(value$);

    var sinks = {
        DOM: vdom$,
        elapsedTime: value$
    };

    return sinks;
}

function TimeManager(sources) {
    return (0, _isolate2.default)(_TimeManager)(sources);
};

});

require.register("components/Witness.js", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Witness = Witness;

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _run = require('@cycle/run');

var _snabbdomJsx = require('snabbdom-jsx');

var _utils = require('../utils');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function intent(DOM) {

    var click$ = DOM.select('.js-question-witness').events('click');

    return click$;
}

function model(props$, action$) {
    return props$.map(function (props) {
        return action$.map(function (action) {
            return Object.assign(props, { showResult: true });
        }).startWith(props);
    }).flatten().remember();
}

function view(value$) {
    return value$.map(function (value) {
        return (0, _snabbdomJsx.html)(
            'section',
            { className: 'place-item' },
            value.showResult ? (0, _snabbdomJsx.html)(
                'figure',
                null,
                (0, _snabbdomJsx.html)('img', { src: value.image }),
                (0, _snabbdomJsx.html)(
                    'figcaption',
                    null,
                    (0, _snabbdomJsx.html)('span', { hook: { insert: function insert(vnode) {
                                return vnode.elm.innerHTML = value.clue ? (0, _utils.formatLinks)(value.clue.text) : _lodash2.default.sample(value.dialogs);
                            } } })
                )
            ) : (0, _snabbdomJsx.html)(
                'button',
                { classNames: 'js-question-witness button-3d', type: 'button' },
                value.name
            )
        );
    });
}

function Witness(sources) {
    var props$ = sources.props$,
        DOM = sources.DOM;

    var action$ = intent(DOM);
    var value$ = model(props$, action$);
    var vdom$ = view(value$);

    var sinks = {
        DOM: vdom$,
        questionned$: action$.fold(function (acc, x) {
            return true;
        }, false)
    };

    return sinks;
}

});

;require.register("initialize.js", function(exports, require, module) {
'use strict';

var _run = require('@cycle/run');

var _dom = require('@cycle/dom');

var _http = require('@cycle/http');

var _cyclicRouter = require('cyclic-router');

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _switchPath = require('switch-path');

var _switchPath2 = _interopRequireDefault(_switchPath);

var _history = require('history');

var _IntroGame = require('./components/IntroGame');

var _MainGame = require('./components/MainGame');

var _EndGame = require('./components/EndGame');

var _NotFound = require('./components/NotFound');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function main(sources) {
  var HTTP = sources.HTTP,
      DOM = sources.DOM;


  var match$ = sources.router.define({
    '/': _IntroGame.IntroGame,
    '/game': _MainGame.MainGame,
    '/end': _EndGame.EndGame,
    '*': _NotFound.NotFound
  });

  var page$ = match$.map(function (_ref) {
    var path = _ref.path,
        value = _ref.value;
    return value(Object.assign({}, sources, { router: sources.router.path(path) }));
  });

  var sinks = {
    DOM: page$.map(function (c) {
      return c.DOM;
    }).flatten(),
    router: page$.map(function (c) {
      return c.router;
    }).flatten(),
    HTTP: page$.filter(function (c) {
      return c.HTTP;
    }).map(function (c) {
      return c.HTTP;
    }).flatten()
  };

  return sinks;
}

var drivers = {
  DOM: (0, _dom.makeDOMDriver)('#app'),
  HTTP: (0, _http.makeHTTPDriver)(),
  router: (0, _cyclicRouter.makeRouterDriver)((0, _history.createBrowserHistory)(), _switchPath2.default)
};

(0, _run.run)(main, drivers);

});

require.register("utils.js", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.formatLinks = formatLinks;
var RE = /\[([^\]]*)\]\(([^)]*)\)/g;

function formatLinks(text) {
  return text.replace(RE, '<a href="$2" target="_blank">$1</a>');
}

});

;require.register("___globals___", function(exports, require, module) {
  
});})();require('___globals___');


//# sourceMappingURL=app.js.map