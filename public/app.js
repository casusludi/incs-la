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
    }).remember();
}

function _ChangeLocation(sources) {
    var props$ = sources.props$,
        DOM = sources.DOM;

    var action$ = intent(DOM);
    var value$ = model(props$, action$);
    var vdom$ = view(props$);

    var sinks = {
        DOM: vdom$,
        value$: value$
    };

    return sinks;
}

function ChangeLocation(sources) {
    return (0, _isolate2.default)(_ChangeLocation)(sources);
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

;require.register("components/TimeManager.js", function(exports, require, module) {
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

    return elapsedTime$;
}

function view(value$) {
    return value$.map(function (value) {
        return (0, _snabbdomJsx.html)(
            'span',
            null,
            value - value % 1,
            'h',
            value % 1 * 60
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

var _isolate = require('@cycle/isolate');

var _isolate2 = _interopRequireDefault(_isolate);

var _snabbdomJsx = require('snabbdom-jsx');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function intent(DOM) {

    var click$ = DOM.select('.js-question-witness').events('click').mapTo(true);

    return click$;
}

function model(props$, action$) {
    return props$.map(function (props) {
        return action$.map(function (action) {
            return Object.assign(props, { showResult: action });
        }).startWith(props);
    }).flatten().remember();
}

function view(value$) {
    return value$.map(function (value) {
        return (0, _snabbdomJsx.html)(
            'section',
            { style: 'background: red;' },
            value.showResult ? (0, _snabbdomJsx.html)(
                'figure',
                null,
                (0, _snabbdomJsx.html)('img', { src: value.image }),
                (0, _snabbdomJsx.html)(
                    'figcaption',
                    null,
                    value.clue ? value.clue : value.dialogs[0]
                )
            ) : (0, _snabbdomJsx.html)(
                'button',
                { selector: '.js-question-witness', type: 'button' },
                value.name
            )
        );
    });
}

function _Witness(sources) {
    var props$ = sources.props$,
        DOM = sources.DOM;

    var action$ = intent(DOM);
    var value$ = model(props$, action$);
    var vdom$ = view(value$);

    var sinks = {
        DOM: vdom$,
        questionned$: action$.mapTo(null)
    };

    return sinks;
}

function Witness(sources) {
    return (0, _isolate2.default)(_Witness)(sources);
};

});

require.register("initialize.js", function(exports, require, module) {
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _run = require('@cycle/run');

var _dom = require('@cycle/dom');

var _http = require('@cycle/http');

var _collection = require('@cycle/collection');

var _collection2 = _interopRequireDefault(_collection);

var _cycleOnionify = require('cycle-onionify');

var _cycleOnionify2 = _interopRequireDefault(_cycleOnionify);

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

var _Investigate = require('./components/Investigate.js');

var _ChangeLocation = require('./components/ChangeLocation.js');

var _Witness = require('./components/Witness.js');

var _JSONReader = require('./components/JSONReader.js');

var _TimeManager = require('./components/TimeManager.js');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function main(sources) {
  var HTTP = sources.HTTP,
      DOM = sources.DOM;


  var jsonSinks = (0, _JSONReader.JSONReader)({ HTTP: sources.HTTP });
  var jsonRequest$ = jsonSinks.request;
  var jsonResponse$ = jsonSinks.JSON;

  var locations$ = jsonResponse$.map(function (jsonResponse) {
    return jsonResponse.locations;
  });
  var path$ = jsonResponse$.map(function (jsonResponse) {
    return jsonResponse.path;
  });
  var settings$ = jsonResponse$.map(function (jsonResponse) {
    return jsonResponse.setting;
  });

  var changeLocationProxy$ = _xstream2.default.create();

  var currentLocation$ = _xstream2.default.combine(locations$, changeLocationProxy$).map(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        locations = _ref2[0],
        changeLocation = _ref2[1];

    return Object.assign({}, locations[changeLocation.id], changeLocation);
  });

  var lastLocation$ = currentLocation$.compose(_pairwise2.default).map(function (item) {
    return item[0];
  }).startWith("");

  var nextCorrectLocationProxy$ = _xstream2.default.create();

  var pathInit$ = path$.map(function (path) {
    return { id: path[0].location };
  });

  var currentLocationLinks$ = _xstream2.default.combine(nextCorrectLocationProxy$, currentLocation$, lastLocation$, locations$).map(function (_ref3) {
    var _ref4 = _slicedToArray(_ref3, 4),
        nextCorrectLocation = _ref4[0],
        currentLocation = _ref4[1],
        lastLocation = _ref4[2],
        locations = _ref4[3];

    // console.log("currentLocation.links", currentLocation.links);
    // console.log("lastLocation", lastLocation);

    var links = _.chain(currentLocation.links || []).concat(lastLocation ? [lastLocation.id] : []).concat(nextCorrectLocation ? [nextCorrectLocation.id] : []).uniq().filter(function (o) {
      return o !== currentLocation.id;
    }).shuffle().value();

    return links.map(function (link) {
      return (0, _ChangeLocation.ChangeLocation)({
        DOM: DOM,
        props$: _xstream2.default.of(Object.assign({}, locations[link], { id: link }))
      });
    });
  });

  var changeLocation$ = currentLocationLinks$.map(function (links) {
    return _xstream2.default.merge.apply(_xstream2.default, _toConsumableArray(links.map(function (link) {
      return link.value$;
    })));
  }).startWith(pathInit$).flatten();

  changeLocationProxy$.imitate(changeLocation$);

  var linksVtree$ = currentLocationLinks$.map(function (links) {
    return _xstream2.default.combine.apply(_xstream2.default, _toConsumableArray(links.map(function (link) {
      return link.DOM;
    })));
  }).flatten();

  var witnessesData$ = currentLocation$.map(function (currentLocation) {
    return currentLocation.places;
  });

  var witnesses$ = witnessesData$.map(function (witnessesData) {
    return Object.keys(witnessesData).map(function (key, value) {
      return (0, _Witness.Witness)({
        DOM: sources.DOM,
        props$: _xstream2.default.of(witnessesData[key])
      });
    });
  });

  var witnessQuestionned$ = witnesses$.map(function (witnesses) {
    return _xstream2.default.merge.apply(_xstream2.default, _toConsumableArray(witnesses.map(function (witness) {
      return witness.questionned$;
    })));
  }).flatten();

  var witnessesVTree$ = witnesses$.map(function (witnesses) {
    return _xstream2.default.combine.apply(_xstream2.default, _toConsumableArray(witnesses.map(function (witness) {
      return witness.DOM;
    })));
  }).flatten();

  // Progression management
  var progressionProxy$ = _xstream2.default.create();

  var nextCorrectLocation$ = _xstream2.default.combine(path$, progressionProxy$).map(function (_ref5) {
    var _ref6 = _slicedToArray(_ref5, 2),
        path = _ref6[0],
        progression = _ref6[1];

    return { id: path.length > progression + 1 ? path[progression + 1].location : null };
  }).remember();

  nextCorrectLocationProxy$.imitate(nextCorrectLocation$.compose((0, _dropRepeats2.default)()));

  var progression$ = _xstream2.default.combine(currentLocation$, nextCorrectLocation$).filter(function (_ref7) {
    var _ref8 = _slicedToArray(_ref7, 2),
        currentLocation = _ref8[0],
        nextCorrectLocation = _ref8[1];

    // console.log("currentLocation", currentLocation.id);
    // console.log("nextCorrectLocation", nextCorrectLocation.id);
    return currentLocation.id === nextCorrectLocation.id;
  }).mapTo(1).fold(function (acc, x) {
    return acc + x;
  }, 0);

  progressionProxy$.imitate(_xstream2.default.merge(progression$, _xstream2.default.of(0)));

  // Time management
  var TimeManagerSink = (0, _TimeManager.TimeManager)({ DOM: DOM, settings: settings$, changeLocation: changeLocation$, witnessQuestionned: witnessQuestionned$ });
  var TimeManagerVTree$ = TimeManagerSink.DOM;

  var DOMSink$ = _xstream2.default.combine(linksVtree$, changeLocation$, witnessesVTree$, progression$, TimeManagerVTree$).map(function (_ref9) {
    var _ref10 = _slicedToArray(_ref9, 5),
        linksVtree = _ref10[0],
        changeLocation = _ref10[1],
        witnessesVTree = _ref10[2],
        progression = _ref10[3],
        TimeManagerVTree = _ref10[4];

    return (0, _snabbdomJsx.html)(
      'div',
      null,
      (0, _snabbdomJsx.html)(
        'h1',
        null,
        'Progression : ',
        progression
      ),
      (0, _snabbdomJsx.html)(
        'h2',
        null,
        'Elapsed time : ',
        TimeManagerVTree
      ),
      (0, _snabbdomJsx.html)(
        'div',
        null,
        witnessesVTree
      ),
      (0, _snabbdomJsx.html)(
        'footer',
        null,
        (0, _snabbdomJsx.html)(
          'div',
          { 'class': 'travel-panel' },
          (0, _snabbdomJsx.html)(
            'p',
            null,
            changeLocation.name ? 'Current : ' + changeLocation.name : ''
          ),
          (0, _snabbdomJsx.html)('h1', null),
          (0, _snabbdomJsx.html)(
            'div',
            { selector: '.items' },
            linksVtree
          )
        )
      )
    );
  });

  var sinks = {
    DOM: DOMSink$,
    HTTP: jsonRequest$
  };
  return sinks;
}

var drivers = {
  DOM: (0, _dom.makeDOMDriver)('#app'),
  HTTP: (0, _http.makeHTTPDriver)()
};

var wrappedMain = (0, _cycleOnionify2.default)(main);

(0, _run.run)(wrappedMain, drivers);

});

require.register("___globals___", function(exports, require, module) {
  
});})();require('___globals___');


//# sourceMappingURL=app.js.map