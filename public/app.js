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

function intent(sources) {

    var click$ = sources.DOM.select('.js-change-location').events('click');

    return click$;
}

function model(newLocation$) {
    return newLocation$;
}

function view(state$) {
    return state$.map(function (state) {
        return (0, _snabbdomJsx.html)(
            'button',
            { selector: '.js-change-location', type: 'button' },
            state
        );
    });
}

function _ChangeLocation(sources) {
    var action$ = intent(sources);
    var state$ = model(sources.newLocation$);
    var vdom$ = view(state$);

    var sinks = {
        DOM: vdom$,
        newLocation$: state$.map(function (state) {
            return action$.map(function (action) {
                return state;
            });
        }).flatten(),
        destroy$: sources.destroy$
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

;require.register("initialize.js", function(exports, require, module) {
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _xstream = require('xstream');

var _xstream2 = _interopRequireDefault(_xstream);

var _run = require('@cycle/run');

var _dom = require('@cycle/dom');

var _http = require('@cycle/http');

var _collection = require('@cycle/collection');

var _collection2 = _interopRequireDefault(_collection);

var _dropRepeats = require('xstream/extra/dropRepeats');

var _dropRepeats2 = _interopRequireDefault(_dropRepeats);

var _delay = require('xstream/extra/delay');

var _delay2 = _interopRequireDefault(_delay);

var _snabbdomJsx = require('snabbdom-jsx');

var _Investigate = require('./components/Investigate.js');

var _ChangeLocation = require('./components/ChangeLocation.js');

var _JSONReader = require('./components/JSONReader.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function main(sources) {

  var jsonSinks = (0, _JSONReader.JSONReader)({ HTTP: sources.HTTP });
  var jsonRequest$ = jsonSinks.request;
  var jsonResponse$ = jsonSinks.JSON;

  /////////////////////////////
  // OLD (use of Collection) //
  /////////////////////////////
  /* 
  const proxyChangeLocation$ = xs.create(); 
  
  // const locationLinks$ = proxyChangeLocation$.map(currentLocation =>
  //     jsonResponse$.map(jsonResponse =>
  //         jsonResponse.locations[currentLocation].links.map(link => ({
  //             newLocation$: xs.of(link),
  //         }))
  //     )
  // ).flatten();
  
  const add$ = jsonResponse$.map(jsonResponse =>
      proxyChangeLocation$.map(currentLocation =>
          jsonResponse.locations[currentLocation].links.map(link => ({
              newLocation$: xs.of(link),
          }))
      )
  ).flatten();
    const progression$ = add$.mapTo(1).fold((acc, x) => acc + x, 0);
    const locations$ = Collection(
    ChangeLocation,
    {DOM: sources.DOM, destroy$: proxyChangeLocation$.mapTo(null)},
    add$.compose(delay(1)),
    item => item.destroy$
  );
    const locationsVTree$ = Collection.pluck(locations$, item => item.DOM);
  const newLocationInfo$ = Collection.merge(locations$, item => item.newLocation$);
    const changeLocation$ = xs.merge(
    xs.of('la-baule'),
    newLocationInfo$,
  );
    const currentLocation$ = changeLocation$.remember();
    // proxyChangeLocation$.imitate(newLocationInfo$.compose(dropRepeats));
    // const currentLocation$ = newLocationInfo$
  //   .startWith('la-baule');
    
  proxyChangeLocation$.imitate(currentLocation$.compose(dropRepeats()));
    const DOMSink$ = xs.combine(currentLocation$, progression$, locationsVTree$).map(
      ([currentLocation, progression, locationsVTree]) =>
        <div>
          <p>
            Progression : {progression}
          </p>
          <h1>{currentLocation}</h1>
          <div selector=".items">
            {locationsVTree}
          </div>
        </div>
    );
  */

  ///// SANS COLLECTION /////
  var action$ = sources.DOM.select('.js-change-location').events('click');

  var clickedLocation$ = _xstream2.default.merge(action$.map(function (action) {
    return action.target.value;
  }), _xstream2.default.of("None"));

  var progression$ = action$.mapTo(1).fold(function (acc, x) {
    return acc + x;
  }, 0);

  var currentLocation$ = action$.map(function (action) {
    return clickedLocation$;
  }).flatten().startWith("nantes");

  var currentLocationLinks$ = jsonResponse$.map(function (jsonResponse) {
    return currentLocation$.map(function (currentLocation) {
      return jsonResponse.locations[currentLocation].links;
    });
  }).flatten();

  var DOMSink$ = _xstream2.default.combine(currentLocation$, currentLocationLinks$, progression$, clickedLocation$ /*, locationsVTree$*/).map(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 4),
        currentLocation = _ref2[0],
        currentLocationLinks = _ref2[1],
        progression = _ref2[2],
        clickedLocation /*, locationsVTree*/ = _ref2[3];

    return (0, _snabbdomJsx.html)(
      'div',
      null,
      (0, _snabbdomJsx.html)(
        'p',
        null,
        'Progression : ',
        progression
      ),
      (0, _snabbdomJsx.html)(
        'p',
        null,
        'Clicked location : ',
        clickedLocation
      ),
      (0, _snabbdomJsx.html)(
        'h1',
        null,
        currentLocation
      ),
      (0, _snabbdomJsx.html)(
        'p',
        null,
        currentLocationLinks.map(function (currentLocationLink) {
          return (0, _snabbdomJsx.html)(
            'button',
            { selector: '.js-change-location', type: 'button', value: currentLocationLink },
            currentLocationLink
          );
        })
      )
    );
  });
  ///////////////////////////

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

(0, _run.run)(main, drivers);

});

require.register("___globals___", function(exports, require, module) {
  
});})();require('___globals___');


//# sourceMappingURL=app.js.map