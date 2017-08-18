var Global,
    window = Global = (window == undefined || window == null)? {}: Global || window,
    navigator = (navigator || {}),
    JSUNIT,
    Symbol,
    Tuple,
    NewLine,
    Types,
Paramour =
Global.Paramour =

/** Paramour 29.0.0
 * @author Ephellon Dantzler
 * @syntax (input, options)
 * @param  {String}    input: The string to compile
 * @       {DOMObject} input: The HTML element who's text value will be compiled
 * @       {Array}     input: The array to join and compile
 * @param  {Object}  options: Compiling options
 * @return {String}
 * @see https://codepen.io/ephellon/pen/XKPVgw
 */

function Paramour(input, options) {
  Paramour.version = "29.0.0";
  Paramour.versionName = "Gyalchester"; // Reference to "Gyalchester" - Drake

  /* Comment Syntax:
    // Return Type: Parameter Type[, ...]
    function fn(parameter[, ...]) {
      // ...
    }

    // Types:
    * - any type, including undefined and null
    ... - any number of types
    !Type - expectedly, "Type," i.e. "!Function" means "expecting a Function"
    [...] - optional
    (type1|type2[|...]) - type1 or type2
  */

  // Simply throws a "prettier" error message
  // Undefined: Error, String, String
  function Throw(error, location, message) {
    error.stack = error.stack.replace(/(\n\r?|\r)[\s\S]*$/, location);
    error.message = message;
    throw error;
  };

  // Convert the input into a string
  switch(typeof input) {
    case "string":
      break;
    case "object":
      if(input.value != undefined && input.value != null)
        input = input.value;
      else if(input.innerText != undefined && input.innerText != null)
        input = input.innerText;
      else if(input.innerHTML != undefined && input.innerHTML != null)
        input = input.innerHTML;
      else if(input.constructor == Array)
        input = input.join("\n");
      break;
    default:
      try {
        input = input.toString();
        // the second most trivial conversion (after input + "")
        // doing this will catch "undefined" and "null"
      } catch(error) {
        Throw(error, "$1\tat <Paramour>: [" + (input = typeof input) + " -> String]", "Failed to convert " + (input) + " value");
      }
      break;
  };

  (options = options || {}).native = (options.native == undefined)? /(#|\/\/)\s*@native/.test(input): options.native;

  // Check for the __defineGetter__ and __defineSetter__
  /* JavaScript Manager Error
    CAUSE:       __defineGetter__ is undefined
                 __defineSetter__ is undefined
    FIX:         define __defineGetter__ and __defineSetter__
  */
  var JavaScript_Manager = (Object.prototype.__defineGetter__ == undefined || Object.prototype.__defineSetter__ == undefined);
  if(JavaScript_Manager) {
    // Rhino, NetBeans, and Eclipse (Java) would cause this to happen, so this fixes some "undefined" variables/properties
    Object.prototype.__defineGetter__ =
      // !Function: String, Function
    function __defineGetter__(property, method) {
      return (this[property] != undefined)?
        this[property]:
      Object.defineProperty(this, property, {
        get: method
      });
    };
    Object.prototype.__defineSetter__ =
      // !Function: String, Function
    function __defineSetter__(property, method) {
      return (this[property] != undefined)?
        this[property]:
      Object.defineProperty(this, property, {
        set: method
      });
    };
  }

  Global.navigator = navigator;
  Global.navigator.__defineGetter__("runtime", function() {
    return runtime;
  });
  Global.navigator.__defineGetter__("paramour", function() {
    return Paramour;
  });

  var backup, newline, self, strict, native = options.native,
      condition = /[\&\|~]|[<>]=?|[!=]={1,2}/, // & | ~ < <= > >= != != == ==
      number    = /\b([-+]?(?:0b[01]+|0o[0-7]+|0x[\da-f]+|(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+\.?\d*)?))\b/, // numbers
      tabs      = false, // should the doublespaces be replaced with tabs?
      RTS       = {p: "prefix-", m: "media-", s: "suffix-", P: "Prefix_", M: "Media_", S: "Suffix_"},
      reserved  = /(\b(?:abstract|boolean|break|byte|ca(?:se|tch)|char|class|con(?:st|tinue)|de(?:bugger|fault|lete)|do(?:uble)?|else|enum|eval|ex(?:port|tends)|false|final(?:ly)?|float|for|function|goto|i[fn]|imp(?:lements|ort)|int(?:erface)?|long|native|new|null|package|pr(?:ivate|otected)|public|return|short|static|super|switch|synchronized|this|throws?|tr(?:ansient|ue|y)|(?:instance|type)?of|(?:un)?defined|var|vo(?:id|latile)|while|with|yield|[gsl]et|self)\b|(?:<init>|@|[\-\+\~\&]>))/,
      errors = /(\s*var\s*;|[\b]*|.*[sp]ocket\?=[a-zA-Z\$_][\w\$]*.*(?:\n\r?|\r)?)/g,
      global_expressions = [],
      // Reserved: eval
      // Not Reserved: arguments constructor
      // Paramour Reserved: <init> defined self @ -> +> ~> &>
      operators = "!~*/%+-<>&^|?:=".split(""), // in order of priority (highest to lowest; "descending")
      operators_regexp = /[\!~\*\/\%\+\-<>\&\^\|\?\:\=]/,
      operator_names = {
        "!": "Not_",
        "~": "Tilde_",
        "*": "Star_",
        "/": "Slash_",
        "%": "Cent_",
        "+": "Plus_",
        "-": "Minus_",
        "<": "Less_Than_",
        ">": "Greater_Than_",
        "&": "And_",
        "^": "Caret_",
        "|": "Or_",
        "?": "Question_Mark_",
        ":": "Colon_",
        "=": "Equals_"
      },
      LITERALS = {
      /** Type of literals: U N E O A S
        U - "Unknown", aka "Comments"
        N - "Non-Escapable", aka "Opposing Pairs" (parenthesis, brackets, braces, etc.)
        E - "Escapable", aka "Similar Pairs" (double quotes, single quotes, etc.)
        O - "Operators"
        A - "Alpha-numeric Characters", aka "Keywords", "Numbers", "Variables"
        S - "Special Characters" (backslashes, etc.)
      */
        U: "SU VC ML DS EM PN SL", // Unknown - able to, but should not contain other U-type literals; may have a matching, ending sequence
        N: "TP BK PR BE", // Non-Escapable - able to, and may contain other N-type literals; must have a matching, ending sequence
        E: "DQ SQ RX QI Dq Sq Rq Tq", // Escapable - able to, and may contain other E-type literals; must have a matching, ending sequence
        NORMAL: "Dq Sq Tq Rq DQ SQ RX VC ML DS EM PN SL QI TP BK PR BE" // "Normal" Order of Operation
      },
      // Order of Completion: ML SL RX DQ SQ QI PR BK BE TP VC EM DL PN DS IG Dq Sq Tq SU Rq
      // Order of Preference:
      SU = [], // Strict Usage (similar to "use strict")
      VC = [], // Version Control
      ML = [], // Multi-line (###...###)
      DS = [], // Docstrings (/*...*/)
      EM = [], // Emus
      PN = [], // Phantoms (# $...)
      SL = [], // Single line (#...)

      TP = [], // Tuples (.{...})
      PR = [], // Parenthesis ((...))
      BE = [], // Braces ({...})
      BK = [], // Brackets ([...])

      DQ = [], // Double Quote ("...")
      SQ = [], // Single Quote ('...')
      RX = [], // RegExp (/.../...)
      QI = [], // Quasi (`...`)
      Dq = [], // Double Quasi ("""...""")
      Sq = [], // Single Quasi ('''...''')
      Tq = [], // Triple Quasi (```...```)
      Rq = [], // RegExp Quasi (///...///...)

      DL = [], // Dollar
      IG = [], // Ignored

      patterns = {
        // Order of Operations I
        "SU": (!native?
               /#\s*?(\s?@(?:strict|mini|deps|embed))/:
               /\/\/\s*?(\s?@(?:strict|mini|deps|embed))/), // # @option
        "DL": /(\$[1-9])/,  // $1 ... $9
        "Dq": /("""(?:[^\\]|\\.)*?""")/, // """..."""
        "Sq": /('''(?:[^\\]|\\.)*?''')/, // '''...'''
        "Tq": /(```(?:[^\\]|\\.)*?```)/, // ```...```
        "Rq": /(?:(?:[\(\)\[\]\{\}\!\~\*\/%\+\-<>\&\^\|\?\:\=,;]|[\b\n\r])[\x20\t\v ]*)(\/{3}(?:[^\\]|\\.)*?\/{3}(?:[imguy]*\b)?)/, // ///...///imguy; // -> /(?:)/
        "DQ": /("(?:[^\\\n\r]|\\.)*?")/, // "..."
        "SQ": /('(?:[^\\\n\r]|\\.)*?')/, // '...'
        "RX": /(?:(?:[\(\)\[\]\{\}\!\~\*\/%\+\-<>\&\^\|\?\:\=,;]|[\b\n\r])[\x20\t\v ]*)(\/(?:[^\\\/\*\b\n\r]|\\.)*?\/(?:[imguy]*\b)?)/, // /.../imguy; // -> /(?:)/
        "VC": (!native?
               /#\s*([\d\.]+\?[\s\S]*?)#\?/:
               /\/\/\s*([\d\.]+\?[\s\S]*?)\/\/\?/), // # 1.1? ... #?
        "ML": (!native?
               /###([\s\S]*?)###/:
               /\/\*([^\*][\s\S]*?)\*\//), // ###...###
        "DS": /\/\*([\s\S]*?)\*\//, // /* ... */
        "EM": (!native?
               /#\s*@([\d\.]+)/:
               /\/\/\s*@([\d\.]+)/), // # @1.1
        "PN": (!native?
               /#\s*\$(.+)/:
               /\/\/\s*\$(.+)/), // # $a -> apple; $b => "banana"
        "SL": (!native?
               /#(.*)/:
               /\/\/(.*)/), // # ...
        "QI": /(`(?:[^\\]|\\.)*?`)/, // `...`
        "BK": /(\[[^\[\]\(\)\{\}]*?\])/, // [...]
        "PR": /(\([^\(\)\{\}\[\]]*?\))/, // (...)
        "TP": /\.\{([^\{\}]*?)\}/, // .{...}
        "BE": /(\{[^\{\}\[\]\(\)]*?\})/ // {...}
      },
      _patterns_ = {
        // Order of Operations II
        "BK": /(\[[^\[\]\(\)\{\}]*?\])/, // [...]
        "PR": /(\([^\(\)\{\}\[\]]*?\))/, // (...)
        "BE": /(\{[^\{\}\[\]\(\)]*?\})/  // {...}
      },
      __patterns__ = {
        // Order of Operations III
        "BK": /(\[[^\[\]*?]\])/, // [...]
        "PR": /(\([^\(\)]*?\))/, // (...)
        "BE": /(\{[^\{\}]*?\})/  // {...}
      },
      // The return symbols, if needed (i.e. the [Fold] error)
      SYMBOLS = {
        DL: "",
        Dq: "",
        Sq: "",
        Tq: "",
        Rq: "",
        DQ: "",
        SQ: "",
        RX: "",
        SU: (options.native? "// @": "# @"),
        VC: (options.native? ["//","//?"]: ["#","#?"]),
        ML: (options.native? ["/*","*/"]: ["###","###"]),
        DS: ["/*","*/"],
        EM: (options.native? "// @": "# @"),
        PN: (options.native? "// $": "# $"),
        SL: (options.native? "//": "#"),
        QI: "",
        TP: [".{","}"],
        PR: "",
        BE: "",
        BK: ""
      },

      // Create a backup and optimize the input
      backup = input = "\b" + input.replace(/[\t\v]/g, function(e) {
        if(e != undefined)
          tabs = true;
        return "  ";
      }),

      // Set the clock
      clock = {
        start: (new Date).getTime(),
        stop: null,
        span: null
      },

      // Create the runtime object
      runtime = {
        /*
        ECMAScript features
        (All info. provided by the MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/New_in_JavaScript)
        */
        is: function is(version) {
          switch (version + "") {
            case "*":
              return runtime.is("1.8.5");
              break;

            case "1.8.5":
              if(undefined == Symbol || null == Symbol)
                return runtime.is("1.8.1");
              /* JavaScript 1.8.5
              Objects:
                Proxy
                Symbol
              Methods:
                Object:
                  create, defineProperty, defineProperties, getOwnPropertyDescriptor, keys, getOwnPropertyNames, preventExtensions, isExpandable, seal, isSealed, freeze, isFrozen, isArray
                Date.prototype:
                  toJSON
                Function.prototype:
                  bind
              Operators:
                get
                set
              */
              break;

            case "1.8.1":
              if(undefined == Object.getPrototypeOf || null == Object.getPrototypeOf)
                return runtime.is("1.8");
              /* JavaScript 1.8.1
              Methods:
                Object:
                  getProtototypeOf
                String.prototype:
                  trim, trimLeft, trimRight, startsWith
                Et Cetra:
                  "native" JSON
              */
              break;

              // ^ ECMAScript 7
            case "1.8":
              if(undefined == Array.prototype.reduce || null == Array.prototype.reduce)
                return runtime.is("1.7");
              /* JavaScript 1.8
              Methods:
                Array.prototype:
                  reduce, reduceRight
              Deprecated:
                "destructing"
              */
              break;

              // ^ ECMAScript 6
            case "1.7":
              if(undefined != Array.prototype.indexOf && null != Array.prototype.indexOf && (undefined == Array.prototype.reduce || null == Array.prototype.reduce))
                return runtime.is("1.6");
              /* JavaScript 1.7
              Et Cetra:
                "destructing" @ {
                  [a, b, c, ...] = ["abc", 123, "xyz", ...]
                  {a, b, c, ...} = {a: "abc", b: 123, c: "xyz", ...}
                }
              */
              break;

            case "1.6":
              if(undefined == Array.prototype.indexOf || null == Array.prototype.indexOf)
                return runtime.is("1.5");
              /* JavaScript 1.6
              Methods:
                Array:
                  indexOf, lastIndexOf, every, filter, forEach, map, some
              Statements:
                for each...in
              Et Cetra:
                XML support
              */
              break;

              // ^ ECMAScript 5
            case "1.5":
              if(undefined == Number.prototype.toExponential || null == Number.prototype.toExponential)
                return runtime.is("1.4");
              /* JavaScript 1.5
              Methods:
                Number.prototype:
                  toExponential, toFixed, toPrecision
              Statements:
                const
              Improved:
                catch @ try...catch
              */
              break;

            case "1.4":
              if(undefined == Function.prototype.length || null == Function.prototype.length)
                return runtime.is("1.3");
              /* JavaScript 1.4
              Operators:
                in
                instanceof
              Statements:
                throw
                try...catch
              Deprecated:
                Function.arity ["Function.length"]
              */
              break;

            case "1.3":
              if(undefined == Function.prototype.apply || null == Function.prototype.apply)
                return runtime.is("1.2");
              /* JavaScript 1.3
              Globals:
                NaN
                Infinity
                undefined
              Methods:
                isFinite
                Function.prototype:
                  apply, call
                Date: *
              Operators:
                ==
                !=
              */
              break;

            case "1.2":
              if(undefined == Array.prototype.concat || null == Array.prototype.concat)
                return runtime.is("1.1");
              /* JavaScript 1.2
              Objects:
                arguments
                []
                {}
              Properties:
                Function:
                  arity
              Methods:
                Array.prototype:
                  concat, slice
                String.prototype:
                  charCodeAt, concat, fromCharCode, match, replace, search, slice, substr
              Operators
                delete
                ==
                !=
              Statements:
                "label" @ {
                  label_name:
                    statement
                }
                switch
                do...while
                import
                export
              Et Cetra:
                RegExp
              */
              break;

            default:
              /* JavaScript 1.1
              Objects:
                Array
                Boolean
                Function
                Number
              Properties:
                Number:
                  MAX_VALUE
                  MIN_VALUE
                  NaN
                  NEGATIVE_INFINTY
                  POSITIVE_INFINITY
              Methods:
                Array.prototype:
                  join, reverse, sort, split
              Operators:
                typeof
                void
              */
              return "1.1";
              break;
          }
          return version
        },
        has: function has(version) {
          if(Paramour.support != undefined)
            return Paramour.support.indexOf(version) > -1;
          var versions = [ "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.8.1", "1.8.5" ], index = 0;
          return index = versions.slice(0, versions.indexOf(runtime.is("*")) + 1),
            Paramour.runtime = index[index.length - 1],
            (Paramour.support = index).indexOf(version) > -1;
        },
        emulate: function emulate(version) {
          var versions = [ "*", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.8.1", "1.8.5" ];
          return Paramour.support = versions.slice(0, (versions.indexOf(version) || versions.indexOf(runtime.is("*"))) + 1),
            (Paramour.runtime = runtime.emu = runtime.current = Paramour.support[Paramour.support.length - 1]) + ".*",
            Paramour.support
        },
        equals: function equals(version) {
          return runtime.current == (version + "");
        },
        original: undefined,
        emu: undefined,
        current: undefined,
        manned: JavaScript_Manager,
        unmanned: !JavaScript_Manager
      };

  // Paramour defined objects

  // Object: ...
  Tuple =
  Global.Tuple =
  Paramour.Tuple =
  (function() {
    function Tuple() {
      this.index = 0;
      this.arguments = arguments;
      this.length = arguments.length;

      return Tuple.last = this;
    }

    // Boolean: String|Number, Object, Object
    function find(common, a, b) {
      var r = false;
      for(var p in a)
        if("object" == typeof a[common] && a.hasOwnProperty(common))
          r = r || find(a[common], a, b);
        else if(a.hasOwnProperty(common) && a[common] == b[common])
          r = true;
        else
          r = r || a[common] == b[common];
      return r;
    }

    Tuple.prototype.every = function every() {
      var index, args = arguments, types = Paramour.types.apply(null, args).split(',');
      switch(types + '') {
        case ('Function'):
          return Tuple.prototype.every__Function.apply(this, args);
          break;
        default:
          throw TypeError('Tuple.prototype.every(' + types + ') is undefined')
          break;
      }
    }

    Tuple.prototype.every__Function = function every(__function__) {
      for(var iterator = 0, TupleArray = this.arguments, response = true; iterator < TupleArray.length && response; iterator++)
        response = __function__.apply(null, TupleArray[iterator]);
      return response
    }

    Tuple.prototype.forEach = function forEach() {
      var index, args = arguments, types = Paramour.types.apply(null, args).split(',');
      switch(types + '') {
        case ('Function'):
          return Tuple.prototype.forEach__Function.apply(this, args);
          break;
        default:
          throw TypeError('Tuple.prototype.forEach(' + types + ') is undefined')
          break;
      }
    }

    Tuple.prototype.forEach__Function = function forEach(__function__) {
      for(var iterator = 0, TupleArray = this.arguments, response; iterator < TupleArray.length; iterator++)
        response = __function__.apply(null, TupleArray[iterator]);
      return response
    }

    Tuple.prototype.indexOf = function indexOf(item) {
      for(var iterator = 0, TupleArray = this.arguments, response, index = -1; response = TupleArray[iterator++];)
        if("object" == typeof item && item == response) {
          return iterator - 1
        } else if(item.constructor == response.constructor) {
          if(item.constructor == Object) {
            for(var property in item)
              if(("object" != typeof item[property] && item.hasOwnProperty(property))? item[property] == response[property]: find(property, item, response))
                return iterator - 1
          } else if(item.constructor == Array) {
            for(var iter = 0; iter < item.length; iter++)
              if(("object" != typeof item[iter])? item[iter] == response[iter]: find(iter, item, response))
                return iterator - 1;
            if(item.length == 0 && response.length == 0)
              return iterator - 1;
          } else if(item.constructor == RegExp) {
            if(item.source == response.source && item.flags == response.flags)
              return iterator - 1
          }
        }

      return index
    }

    Tuple.prototype.lastIndexOf = function lastIndexOf(item) {
      for(var iterator = 0, TupleArray = this.arguments, response, index = -1; response = TupleArray[iterator++];)
        if(("object" != typeof item) && item == response) {
          index = iterator
        } else if(item.constructor == response.constructor) {
          if(item.constructor == Object) {
            for(var property in item)
              if(("object" != typeof item[property])? item[property] == response[property]: find(property, item, response))
                index = iterator
          } else if(item.constructor == Array) {
            for(var iter = 0; iter < item.length; iter++)
              if(("object" != typeof item[iter])? item[iter] == response[iter]: find(iter, item, response))
                index = iterator;
            if(item.length == 0 && response.length == 0)
              index = iterator;
          } else if(item.constructor == RegExp) {
            if(item.source == response.source && item.flags == response.flags)
              index = iterator
          }
        }
      return index - 1
    }

    Tuple.prototype.join = function join(symbols) {
      return this.arguments.join(symbols)
    }

    Tuple.prototype.next = function next() {
      return this.arguments[this.index++]
    }

    Tuple.prototype.toString = function toString() {
      return this.arguments.toString()
    }

    Tuple.from = function from() {
      for(var index = 0, object, array = []; (object = arguments[index++]) || index < arguments.length;)
        array.push(("function" == typeof object)? (object.name || object.toString()): (object == Global)? "Global": object);
      return eval("new Tuple(" + (array) + ")")
    }

    Tuple.__defineGetter__("next", function() {
      return Tuple.last.next()
    });

    return Tuple;
  })();

  // Object: String
  NewLine =
  Global.NewLine =
  Paramour.NewLine =
  (function() {
    function NewLine(sequence) {
      var sequences = {
        "\n": "\\n",
        "\r": "\\r",
        "\f": "\\f",
        "\n\r": "\\n\\r",
        "\r\n": "\\r\\n",
        "\n\f": "\\n\\f",
        "\f\n": "\\f\\n",
        "\f\r": "\\f\\r",
        "\r\f": "\\r\\f"
      };
      if(sequence == undefined || sequence == null || sequence == "")
        sequence = "\n";
      this.sequence  = sequence;
      this.unescaped = this.unesc = sequence;
      this.escaped   = this.esc   = sequences[sequence];
      return this
    };

    NewLine.prototype.toRegExp = function toRegExp(capture, flags) {
      return (capture)?
        new RegExp("(" + this.escaped + ")", flags):
      new RegExp("(?:" + this.escaped + ")", flags);
    };

    NewLine.prototype.toString = function toString(escape) {
      return (escape)?
        this.escaped:
      this.unescaped;
    };

    return NewLine;
  })();

  // Create the kids for the Phantom Object
  PN.kids = [];
  // Set the original runtime
  runtime.original = runtime.current = runtime.is("*");

  // Set the newline character
  input.replace(/\S(\n[\f\r]?|[\r\f]{1,2}\n?)$/);

  Global.newline = newline = new NewLine(RegExp.$1);

  navigator.__defineGetter__("newline", function() {
    return newline
  });

  // The operator function
  var Operator =
  Paramour.Operator =
    // Undefined: String, Array, String, Function, Object, String
  function(o, t, r, f, b, n) {
    Operator.__defineGetter__("constructor", function() {
      return Operator; // lie just in case of "fn(Operator o) => o;" or similar use
      // future feature, 23.1.1+
    });
    Operator.kids[o] = {
      "operator": o,
      "argument-types": t,
      "root": r,
      "function": f,
      "brace": b,
      "name": n
    };
  }
  Operator.kids = Operator.kids || {};

  // The "typeof" method: converts all given constructors' names into a usable string
  Types =
  Paramour.types =
    // String: *...
  function types() {
    for(var index = 0, results = [], args = [].slice.call(arguments), arg; index < args.length; index++)
      if(((arg = args[index]) != undefined && arg != null) && arg.constructor == Function && (arg.name != undefined && arg.name != null && arg.name != ""))
        results.push(arg.name);
      else if(arg != undefined && arg != null)
        results.push(arg.constructor.name);
      else
        results.push(typeof arg);
    return results.join(',')
  };

  // The saved type functions
  Paramour.NativeTypeFN = {}, Paramour.SubTypeFN = {}, Paramour.ClassTypeFN = {};
  /*
    * Native: "top" level functions
      fn(String string) {...}
    * Sub: "middle" level functions
      obj = {fn: (String string) {...}}
    * Class: "class" level functions
      cls {
        <init> {...}
        .fn(String string) {...}
      }
  */

  // "Pullers" pull saved functions from an object-array
  var Pull =
  Paramour.Pull =
    // Array: String, (String|Function), String
  function Pull(type, fn, vari) {
    var key = type.toLowerCase().replace(/\W|typefn$/gi, ""),
        suf = "TypeFN";
    key = key[0].toUpperCase() + key.slice(1, key.length);
    var typ = key + suf,
        tmp = Paramour[typ];
    fn = fn.name || fn;

    switch(key.toLowerCase()) {
      case "native":
        return tmp[fn];
        break;
      case "sub":
      case "class":
        return (vari == undefined || vari == null)?
          tmp[fn]:
        tmp[fn][vari];
        break;
      default:
        return undefined;
        break;
    }
  };

  // "Pushers" push saved functions to an object-array
  var Push =
  Paramour.Push =
    // Number: String, (String|Function), String, String
  function Push(type, fn, args, vari) {
    // HELP: console.log("\t\tPush:", [type, fn, args, vari]); // :HELP
    var key = type.toLowerCase().replace(/\W|typefn$/g, ""),
        suf = "TypeFN",
        spr = /^(?:([a-z\$_][\w\$]*)\s+)?(?:\.{3}([@\.a-z\$_][\w\$]*)|([@\.a-z\$_][\w\$]*)?\.{3})/gi,
        smp = /^([a-z\$_][\w\$]*)$/gi,
        end = /\s*,\s*/;
    key = key[0].toUpperCase() + key.slice(1, key.length);
    var typ = key + suf,
        tmp = Paramour[typ];
    fn = fn.name || fn;
    args = args.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ");

    for(var i = 0, j = [], k = args.split(end); i < k.length; i++)
      j.push(k[i].replace(smp, "Any").replace(spr, "Spread/$1").replace(/\//g, "$").split(" ")[0].replace(/\$$/g, ""));
    // HELP: console.log("\t\tPush[args]:", [args + "", j.join(";")]); // :HELP
    args = j;

    switch(key.toLowerCase()) {
      case "native":
        tmp[fn] = (tmp[fn] == undefined || tmp[fn].constructor != Array)?
          []:
        tmp[fn];
        return tmp[fn].push(args);
        break;
      case "sub":
      case "class":
        // for(vari = vari.replace(dol, "$1"); ths.test(vari);)
        //   vari = vari.replace(ths, "$1* $2$3");
        tmp[fn] = (tmp[fn] == undefined || tmp[fn].constructor != Object)?
          {}:
        tmp[fn];
        tmp[fn][vari] = (tmp[fn][vari] == undefined || tmp[fn][vari].constructor != Array)?
          []:
        tmp[fn][vari];
        return tmp[fn][vari].push(args);
        break;
      default:
        return undefined;
        break;
    }
  };

  // The DocStrings and Stamps
  var u, o = {}, D = DS; // meant to be undefined

  for(var p in o)
    o[p] = u;

  // setup the @DocString property
  Paramour["@DocStrings"] = (Paramour["@DocStrings"] || o);

  Paramour["@Stamps"] = Paramour["@DocStrings"]["@Stamps"] = (Paramour["@Stamps"] == undefined? [clock]: Paramour["@Stamps"].concat(clock));

  // .prototype methods (in case JavaScript manager is true)
  String.prototype.setDocString =
    // String: (String|Function)
  String.prototype.setDocString || function setDocString(fn) {
    var f = fn || "", P = Paramour || {}, D = D || [], newline = newline || "\r\n",
        n = (!(+this <= Infinity)? this: D[+this]) || "",
        d = P["@DocStrings"],
        t, s, u;
    u = d[t = (f != "")?
       (typeof f == "function")?
        f.name || "":
       f:
       "Anonymous Expression"] =
    (d[t] == undefined || d[t] == null || typeof d[t] != "object")? []: d[t];

    s = d[t].push(
      ("'" + t + newline.esc + "'+" + newline + "'" +
       n
       .replace(/\\/g, "\\\\")
       .replace(/'/g, "\\'")
       .replace(/(\n\r?|\r)/g, newline.esc + "'+" + newline + "'")
      + "'")
      .replace(/\+\s*''/g, "")
    );
    return f.DOCSTRING = eval(u[s - 1]);
  };

  String.prototype.repeat =
    // String: Number
  String.prototype.repeat || function repeat(times) {
    for(var r = []; times > 0; --times)
      r.push(this);
    return r.join("");
  };

  Object.assign =
    // Object: Object
  Object.assign || function assign(target) {
    var args = [].slice.call(arguments).slice(1, arguments.length);
    if(args.length < 1)
      return target;
    else
      for(var x = 0; x < args.length; x++)
        for(var prop in args[x])
          if(args[x].hasOwnProperty(prop))
            target[prop] = args[x][prop];
    return target;
  };

  options = Object.assign({
    "deps": true,
    "embed": false,
    "mini": false,
    "strict": false,
    "native": false
  }, options || {});

  Array.prototype.indexOfRegExp =
  Array.prototype.indexOfRegExp || function indexOfRegExp(regexp) {
    for(var index = 0; index < this.length; index++)
      if(regexp.test(this[index]))
        return index;
    return -1;
  };

  Array.prototype.lastIndexOfRegExp =
  Array.prototype.lastIndexOfRegExp || function lastIndexOfRegExp(regexp) {
    for(var index = 0, last = -1; index < this.length; index++)
      if(regexp.test(this[index]))
        last = index;
    return last;
  };

  // turn the string into an "argified" string
  // String: String[, (Array|String), String]
  function argify(args, types, spaces) {
    // HELP: console.log("\t\t\t\targify:", [args, types, spaces]); // :HELP
    if(types == undefined) {
      types = [];
      args = args.split(",");
      for(var i = 0, j; i < args.length; i++) {
        j = args[i]
          .replace(/^\s*([@\.a-z\$_][\w\$]*)\s*$/gi, "* $1")
          .replace(/([@a-z\$_][\w\$]*)(\*|\.{3})/g, "$2 $1")
          .replace(/(\*|\.{3})(\s*[@a-z\$_][\w\$]*)/g, "$1 $2")
          .split(/\s+/);
        if(j[1] == undefined)
          types.push("*"), args[i] = j[0];
        else
          types.push(j[0]), args[i] = j[1];
      }
    }
    types = types.join(",").replace(/\*/g, "Any").replace(/\.{3}/g, "Spread").replace(/\s/g, "").split(",");

    if(typeof args == "string")
      args = args.split(/\s*,\s*/);
    // String: Number
    function n(x) {
      return args.length - (x + 1) > 0? " - " + (args.length - (x + 1)): "";
    }

    for(var x = 0, y = [], f, i, k, j, h, l, q, r = /^\s*$/, g; x < args.length; x++) {
      f = x == args.length - 1; // is the last item
      i = (l = /^Spread(\$[@a-zA-Z\$_][\w\$]*)?/).test(types[x]); // is a spread
      k = "Spread" + (RegExp.$1 || ""); // spread + type
      j = types.indexOfRegExp(l); // index-of spread
      h = types.lastIndexOfRegExp(l); // last-index-of spread

      g = (j > -1) && j == h; // is the only spread
      h = (j > -1) && x > j; // after a spread
      j = g;
      l = /\s*\=\s*([^\=].*)/.test(args[x]);

/*
Is a Spread?
	Is the last item? // is a spread
		Is the only Spread? // last item
			"$1 = [].slice.call(arguments).slice({ x }, arguments.length)" // last item, and first spread
		: "$1 = [].slice.call(arguments).slice(arity++, arguments.length)" // last item, not first spread
	: Is the only Spread? // not last item
			"$1 = [].slice.call(arguments).slice({ x }, arity = arguments.length{ n(x) })" // not last item, but first spread
	: "$1 = [].slice.call(arguments).slice(arity, arity = arguments.length{ n(x) })" // not last item, nor first spread
// is not a spread
: Sets a variable?
	Is after any Spread? // last item, and sets a variable
		"$1 = (arguments[arity++] != undefined? arguments[arity-1]: $2)" // last item, after a spread's existence, and sets a variable
	: "$1 = (arguments[{ x }] != undefined? arguments[{ x }]: $2)" // last item, after a simple variable's existence, and sets a variable
: Is after any Spread? // not last item, and does not set a variable
	"$1 = arguments[arity++]" // not last item, but after a spread
: "$1 = arguments[{ x }]"; // not last item, and not after any spread
*/

      // HELP: console.log("argify: types[index] {types[x]}:", types[x], "\narguments[index] {args[x]}:", args[x], "\nIs a Spread:", i, "\nIs the last item:", f, "\nIs the only spread ('IaS' must be true)", j, "\nAfter a Spread:", h, "\nSets a varialbe:", l, "\nOutput:", w({head: (reserved.test(args[x])? "__": ""), neck: (reserved.test(args[x])? "__": ""), body: /^\./.test(args[x])? " = @": ""})); // :HELP

      q = "\\b(abstract|boolean|break|byte|ca(?:se|tch)|char|class|con(?:st|tinue)|de(?:bugger|fault|lete)|do(?:uble)?|else|enum|eval|ex(?:port|tends)|false|final(?:ly)?|float|for|function|goto|i[fn]|imp(?:lements|ort)|int(?:erface)?|long|native|new|null|package|pr(?:ivate|otected)|public|return|short|static|super|switch|synchronized|this|throws?|tr(?:ansient|ue|y)|(?:instance|type)?of|(?:un)?defined|var|vo(?:id|latile)|while|with|yield|[gsl]et|self)\\b";

   // w({head, neck, body})
  function w(s, t) {
    var r = "[].slice.call(arguments).slice",
        a = i, b = f, c = j, d = h, e = l;
    t = t || "undefined";
    // a = is a spread
    // b = is the last item
    // c = is the only spread
    // d = is after a spread
    // e = sets a variable
    // HELP: console.log("argify > w:", s, t, ["is a spread:", a, "is the last item:", b, "is the only item:", c, "is after a spread:", d, "sets a variable:", e]); // :HELP
    return ignore(
      (a?
       (b?
        (c? s + " = " + r + "(" + x + ", arguments.length)" : s + " = " + r + "(arity++, arguments.length)")
        : // b:
        (c? s + " = " + r + "(" + x + ", arity = arguments.length" + n(x) + ")" : s + " = " + r + "(arity, arity = arguments.length" + n(x) + ")")
       ) // b
       : // a:
       (e?
        (d? s + " = (arguments[arity++] != undefined? arguments[arity - 1]: " + t + ")" : s + " = (arguments[" + x + "] != undefined? arguments[" + x + "]: " + t + ")")
        : // e:
        (d? s + " = arguments[arity++]" : s + " = arguments[" + x + "]")
       ) // e
      ) // a
    );
  };

      y.push(args[x]
             .replace(/[\b]*\$[\b]*/g, "$")
             .replace(/\bthis\b/, "$" + (x + 1))

             // .reserved = value
             .replace(RegExp("^\\s*\\." + q + "\\s*(?:\\=\\s*([^\\=].*))?$"), function(__, _1, _2) {
               return w("__" + _1 + "__" + " = @[\"" + _1 + "\"]", _2);
             })
             // .variable = value
             .replace(/^\s*\.([@a-z\$_][\w\$]*)\s*(?:\=\s*([^\=].*))?$/i, function(__, _1, _2) {
               return w(_1 + " = @" + _1, _2);
             })

             // reserved = value
             .replace(RegExp("^\\s*" + q + "\\s*(?:\\=\\s*([^\\=].*))?$"), function(__, _1, _2) {
               return w("__" + _1 + "__", _2);
             })
             // variable = value
             .replace(/^\s*([@a-z\$_][\w\$]*)\s*(?:\=\s*([^\=].*))?$/i, function(__, _1, _2) {
               return w(_1, _2);
             })

             .replace(/\.slice\(0,\s*arguments\.length\)/g, "")
             .replace(/@([a-z\$_][\w\$]*)/gi, "this.$1")
             .replace(/@/g, "this")
             .replace(/,/g, "\b0X2c\b")
             .replace(/\$/g, "\b$\b"));
    }
    return y.join((spaces)? ', ': ',$1    ')
  }

  // String: String
  function ignore(t) {
    return "\b\bIG." + (IG.push(t) - 1) + "\b\b";
  }

  // get rid of everything before starting Paramour
  function unhandle(string, type, pattern_array) {
    if(type == undefined)
      type = global_expressions;
    else if(typeof type == "string")
      type = type.split(/\s|,/);
    if(pattern_array == undefined)
      pattern_array = (__patterns__[type] == undefined)? patterns: __patterns__;
    for(var pattern in pattern_array) {
      if(RegExp(type.join("|")).test(pattern)) {
        for(var o, l, p, k = pattern_array[pattern]; (o = /([MS]L|EM|PN|DS|SU)/.test(pattern)? "\b\b": ""), ((k.constructor == RegExp)? k.test(string): (k = RegExp((k + "").replace(/\\/g, "\\")).test(string)));) {
          p = pattern.replace(/!/, "");
          l = (eval("(" + p + ")")).push(RegExp.$1.replace(/\$/g, "\b$\b").replace(/(\s+)/g, ((o == "\b\b")? "\b$1": "$1"))) - 1;
          string = string.replace(k, o + p + "." + l + o);
        }
      }
    }
    return string
  }

  // format the string ["\#" -> #.toString 16]
  // String: String[, Boolean]
  function shock(string, s) {
    for(var x = /\\([^\d'_`])/; x.test(string);)
      string = string.replace(x, function(e, a) {
        return "\b0" + (s && !/\d/.test(a)? "X": "x") + a.charCodeAt(0).toString(16) + "\b"
      });
    for(var x = /([\$\\])(\d+|['_`])/; x.test(string);)
      string = string.replace(x, function(e, a, b) {
        return "\b" + a + "\b" + b + "\b"
      });
    return string
  }

  // format the string [#.toString 16 -> {"\#" | "#"}]
  // String: String
  function unshock(string) {
    for(var x = /[\b]0x([0-9a-f]{1,2})[\b]/; x.test(string);)
      string = string.replace(x, "\\" + String.fromCharCode(eval("0x" + RegExp.$1)));
    for(var x = /[\b]0X([0-9a-f]{1,2})[\b]/; x.test(string);)
      string = string.replace(x, String.fromCharCode(eval("0x" + RegExp.$1)));
    for(var x = /[\b](.+?)[\b]/; x.test(string);)
      string = string.replace(x, "$1");
    return string
  }

  for(var pattern in patterns)
    if(global_expressions.indexOf(pattern.replace(/!/, "")) == -1)
      global_expressions.push(pattern.replace(/!/, ""));

  input = shock(input);
  input = unhandle(input, undefined, patterns);
  input = unhandle(input, undefined, _patterns_);
  input = unhandle(input, undefined, __patterns__);

  // Stop execution here if "lazy" folding fails
  input = input.replace(/(.*)([\(\)\[\]\{\}"'`])(.*)/, function(e, p, h, s) {
    var error = new SyntaxError(), ut = "Unmatched token", us = "Unterminated stream", io = "indexOf", lio = "lastIndexOf", errors = {
      "{": [ut, io],
      "}": [ut, lio],
      "(": [ut, io],
      ")": [ut, lio],
      "[": [ut, io],
      "]": [ut, lio],
      '"': [us, lio],
      "'": [us, lio],
      "`": [us, lio]
    };
    for(var exp = RegExp("(" + global_expressions.join("|") + ")\\.(\\d+)"), g; exp.test(e);)
      e = e.replace(exp, ((SYMBOLS[g = RegExp.$1][0] || "") + (eval(g)[+RegExp.$2] || "") + (SYMBOLS[g][1] || "")));
    e = e.replace(/[\b]/g, "");

    findline:
    for(var x = 0, l = backup.replace(/[\b]/g, "").replace(/\$/g, "$\b").split(newline), c, q = e.split(newline), r; x < l.length; x++)
      for(var i = 0; r = q[i], i < q.length; i++)
        if(((l[x] == r) || (l[x] == r.slice(0, l[x].length))) && !/^\s*$/.test(l[x]) && (c = (r[errors[h][1] || "indexOf"](h))) > -1) {
          c = (c > -1)? c + 1: "?";
          break findline; // stop at the first error
        };

    if(c == undefined)
      c = l[--x][errors[h][1] || "indexOf"](h) - 1;

    function f(n) {
      return (++n) + ":" + (" ".repeat(((l.length + "").length - (n + "").length) + 1))
    }
    function j(n) {
      return (/^(\s*|undefined)$/.test(l[n = x + n] + ""))? "": f(n) + l[n] + "$1"
    }

    var y, m = (errors[h][0] || "Unexpected token sequence");
    Throw(error,
          "$1\tat <Paramour [Fold]>: [String -> Array]$1\tat <Paramour [Fold]>: [" + (x + 1) + ":" + c + "]$1$1" +
          j(-2) + // 2 lines before
          j(-1) + // 1 line before
          j(+0) + // the line with the error
          ((y = (" ".repeat(f(x).length + (c - 1)))),
           (y.length > m.length + 4)?
           (y.slice(0, y.length - (m.length + 3)) + "[" + m + "] ^"): // [Error] ^
           (y + "^ [" + m + "]")) + "$1" + // ^ [Error]
          j(+1) + // 1 line after
          j(+2) // 2 lines after
          .replace(/[\b]/g, ""), m);
  });

  // Start emulation
  for(var x = 0; x < EM.length; x++)
    runtime.emulate(EM[x]);

  // Set Options
  for(var x = 0, strict, deps, mini, embed; x < SU.length; x++)
    switch(SU[x].replace(/\W+/g, "")) {
      case "strict":
        strict = options.strict = true;
        break;
      case "deps":
        deps = options.deps = true;
        break;
      case "mini":
        mini = options.mini = true;
        break;
      case "embed":
        embed = options.embed = true;
        break;
    };

  // RegExp handler
  // String: String[, Boolean]
  function randle(r, e) {
    /* Reserved RegExp Escape Sequences
       . - [^\n\r\u2028\u2029]
      \d - [0-9]
      \D - [^0-9]
      \w - [A-Za-z0-9_]
      \W - [^A-Za-z0-9_]
      \s - [ \f\n\r\t\v\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]
      \S - [^ \f\n\r\t\v\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]
      \t - "horizontal tab"
      \r - "carriage return"
      \n - "newline feed"
      \v - "vertical tab"
      \f - "form feed"
      \b - "zero width word"
      \B - "zero width non-word"
      [\b] - "backspace" [\u0008]
      \0 - "NUL"
      \c# - (# = [A-Z]) "control-#"
      \x## - (# = [0-9a-f]) character code ##
      \u#### - (# = [0-9a-f]) character code ####

      Paramour Defined Escape Sequences
      \#++ - (# = [0-9abcdefjklnrstuvxABDEJKLNS]) "repeat a sequence"
      \a - "alpha characters" [a-zA-Z]
      \A - "non-alpha characters" [^a-zA-Z]
      \j - "JavaScript compliant name" [a-zA-Z\$_][\w\$]*
      \J - "non-JavaScript compliant name" [^a-zA-Z\$_][\w\$]*
      \l - "legal" [@\w\$\.]
      \L - "illegal" [^@\w\$\.]
      \e - "alpha/greek characters" [a-z\u03b1-\u03c9_A-Z\u0391-\u03a9]
      \E - "non-alpha/greek characters" [^a-z\u03b1-\u03c9_A-Z\u0391-\u03a9]
      \k[...] - "to lowercase"
      \K[...] - "to uppercase"
      \N - "number" [\-\+]?(?:[\d\.]+(?:[\-\+]?e[\-\+]?[\d\.]+)?|0(?:b[01]+|o[0-7]+|x[0-9a-f]+))
      \q - "terminating character" [\n\r,;\{\}\(\)\[\]]
      \Q - "non-terminating character" [^\n\r,;\{\}\(\)\[\]]
    */
    r = r
      .replace(/(\\.|[^\\]\[.*?[^\\]\]|[^\\]\(.*?[^\\]\))\+\+/g, "$1$1+")
      .replace(/\\a/g, "[a-zA-Z]")
      .replace(/\\A/g, "[^a-zA-Z]")
      .replace(/\\k\\j/g, (e)? "[\\b]?[@a-z\\$_][a-z\\d\\$_]*": "[a-z\\$_][a-z\\d\\$_]*")
      .replace(/\\k\\j/g, (e)? "[\\b]?[^@a-z\\$_][a-z\\d\\$_]*": "[^a-z\\$_][\\w\\$]*")
      .replace(/\\k\\e/g, "[a-z\\u03b1-\\u03c9]")
      .replace(/\\k\\E/g, "[^a-z\\u03b1-\\u03c9]")
      .replace(/\\K\\j/g, (e)? "[\\b]?[@A-Z\\$_][A-Z\\d\\$_]*": "[A-Z\\$_][A-Z\\d\\$_]*")
      .replace(/\\K\\J/g, (e)? "[\\b]?[^@A-Z\\$_][A-Z\\d\\$_]*": "[^A-Z\\$_][A-Z\\d\\$_]*")
      .replace(/\\K\\e/g, "[A-Z\\u0391-\\u03a9]")
      .replace(/\\K\\E/g, "[^A-Z\\u0391-\\u03a9]")
      .replace(/\\j/g, (e)? "[\\b]?[@a-zA-Z\\$_][\\w\\$]*": "[a-zA-Z\\$_][\\w\\$]*")
      .replace(/\\J/g, (e)? "[^@a-zA-Z\\$_][\\w\\$]*": "[^a-zA-Z\\$_][\\w\\$]*")
      .replace(/\\l/g, (e)? "[@\\w\\$\\.]": "\\l")
      .replace(/\\L/g, (e)? "[^@\\w\\$\\.]": "\\L")
      .replace(/\\e/g, "[A-Z\\u0391-\\u03a9_a-z\\u03b1-\\u03c9]")
      .replace(/\\E/g, "[^A-Z\\u0391-\\u03a9_a-z\\u03b1-\\u03c9]")

      .replace(/\\s/g, (e)? "[\\x20\\t\\v ]": "\\s")
      .replace(/\\z/g, (e)? "[\\x20\\t\\v\\n\\r ]": "\\z")
      .replace(/\\q/g, "[\\n\\r,;\\{\\}\\(\\)\\[\\]]")
      .replace(/\\Q/g, "[^\\n\\r,;\\{\\}\\(\\)\\[\\]]")
      .replace(/\\N/g, "[\\-\\+]?[\\d\\.]+[\\-\\+]?e?[\\-\\+]?[\\d\\.]*|0b[01]+|0o[0-7]+|0x[0-9a-f]+")
      .replace(/\\#/g, (e)? "(\\.\\d+)": "\\#");
    var k = /\\k(\[(?:[^\\]|\\.)*?\])/, K = /\\K(\[(?:[^\\]|\\.)*?\])/, j = /([^\\][a-z])/i;
    // \k
    for(; k.test(r);)
      r = r.replace(k, function(e, a) {
        return a.replace(j, function(e, b) {
          return b.toLowerCase()
        })
          .replace(/(\w(?:\-\w|.*)?)\1/g, "$1");
    });
    // \K
    for(; K.test(r);)
      r = r.replace(K, function(e, a) {
        return a.replace(j, function(e, b) {
          return b.toUpperCase()
        })
          .replace(/(\w(?:\-\w|.*)?)\1/g, "$1");
    });
    // ${...}
    for(var k = /\$\{([^\{\}]+?)\}/; e && k.test(r);)
      r = r.replace(k, function(e, a) {
        a = eval(a);
        if(a.constructor == RegExp)
          a = a.source.replace(/\\/g, '\\');
        return a
      });
    return r
  }

  // String: String, Number
  function handle(type, index) {
    var spil = (eval(type)[index] || "").replace(/([^\u0008])\$/g, "$1\b$\b");
    function h(s, n, d, m) {
      if(m) s = s
          .replace(/\\/g, "\\\\")
          .replace(/(\n\r?|\r\n?)/g, newline.esc)
          .replace(/'/g, "\\'");
      for(var k = /\$(BE\.\d+)/; k.test(s);)
        s = s.replace(k, n + " + " + unhandle("(" + (decompile(RegExp.$1).replace(/^\{|\}$/g, "")) + ")") + " + " + n);
      return ((n + s + n)
              .replace(((d)? /(DQ\.\d+)/g: /^(?!$)$/), '"' + n + ' +$1+ ' + n + '"')
              .replace(RegExp("^" + n + "{2}\\s*\\+|\\+\\s*" + n + "{2}$", "g"), "")
              .replace(/\b0x(.+?)\b/g, "\b0x$1\b")
              .replace(/^\s*|\s*$/g, "")
              .replace(/\$/g, "\b$\b"));
    }
    switch(type) {
      case 'DS':
        return DS[index] = unshock(spil), 'DS?=' + index
        break;
      case 'ML':
        return '\b/\b*\b' + spil + '\b*\b/\b';
        break;
      case 'VC':
        spil.replace(/^([\d\.]+)\?([\*\!])?\s*([\s\S]*)$/, "$1 $2");
        var v = RegExp.$1, c = RegExp.$2, s = RegExp.$3;
        if((c == "*")? runtime.has(v): (c == "!")? !runtime.equals(v): runtime.equals(v))
          return compile(unhandle(s));
        return unhandle("### @" + v + "?" + c + newline + decompile(s).replace(/#/g, "\b0X23\b") + "###");
        break;
      case 'EM':
        return ('\b/\b/\b JavaScript Emulation from "' + runtime.original + '" to "' + spil + '"\b')
        break;
      case 'PN':
        var r = /\->/, s = /\=>/, o = {};
        var R = spil.replace(/[\b]/g, "").split(/\s*\->\s*/, 2), S = spil.replace(/[\b]/g, "").split(/\s*\=>\s*/, 2);
        if(r.test(spil))
          PN.kids.push((o[R[0]] = decompile(R[1]), o));
        else if(s.test(spil))
          PN.kids.push((o[S[0]] = eval(unshock(decompile(S[1]))), o));
        return '\b/\b/\b ' + spil + '\b';
        break;
      case 'SL':
      case 'SU':
        return '\b/\b/\b' + spil + '\b';
        break;

      case 'TP':
        return "new Tuple(" + spil + ")";
        break;

      case 'DQ':
        spil = unshock(spil);
        spil = unhandle(decompile(spil.replace(/^"|"$/g, "")).replace(/[\b]\$[\b]/g, "$"), "BE");
        return h(spil, '"', false, false);
        break;
      case 'SQ':
        spil = unshock(spil);
        spil = unhandle(decompile(spil.replace(/^'|'$/g, "")).replace(/[\b]\$[\b]/g, "$"), "BE");
        return h(spil, "'", true, false);
        break;
      case 'QI':
        spil = unshock(spil);
        if(runtime.has("1.6"))
          return spil;
        spil = unhandle(decompile(spil.replace(/^`|`$/g, "")).replace(/[\b]\$[\b]/g, "$"), "BE");
        return h(spil, "'", true, true);
        break;
      case 'RX':
        return shock(randle(unshock(spil).replace(/^\/{2}([imguy]*)?$/, "/(?:)/$1").replace(/(@#)/g, "\\$1")));
        break;
      case 'Rq':
        spil = randle(unshock(spil).replace(/^\/{6}([imguy]*)?$/, "/(?:)/$1").replace(/(@#)/g, "\\$1"));
        spil = spil.replace(/^(\/{3})([\s\S]*?)\1([imguy]*)?$/g, "$2");
        var f = RegExp.$3 || "";
        for(var k = (options.native? /^((?:[^\\\/]|\\.)*?)\/\/.*/: /^((?:[^\\\#]|\\.)*?)#.*/); k.test(spil);)
          spil = spil.replace(k, "$1");
        spil = unhandle(decompile(spil.replace(/\s+/g, "")).replace(/[\b]\$[\b]/g, "$"), "BE");
        return "RegExp(" + h(spil, "'", true, true) + ", '" + f + "')";
        break;
      case 'Dq':
      case 'Sq':
      case 'Tq':
        var c;
        spil = unhandle(decompile(unshock(spil).replace(/^(["'`]{3})([\s\S]*?)\1$/g, "$2")).replace(/[\b]\$[\b]/g, "$"), "BE");
        return h(spil,  "'", true, true);
        break;

      case 'IG':
        return spil
        break;

      default:
        return compile(spil);
        break;
    }
    return input;
  }

  // String: String[, Array|String, Boolean|Number]
  function decompile(string, expressions, all) {
    var max = Infinity;
    if(typeof all == 'number')
      max = all;
    expressions =
      (expressions == undefined || all == true)?
      global_expressions:
    (expressions.constructor == Array)?
      expressions:
    expressions.split(" ");
    for(var expression = RegExp("(" + expressions.join("|") + ")\\.(\\d+)"); expression.test(string) && max > 0; --max)
      string = string.replace(expression, handle(RegExp.$1, +RegExp.$2));
    return string
  }

  // String: String
  function strip(string) {
    return (string || "").replace(/^\(|\)$/g, "")
  }

  // String: String, String
  function hand(string, root) {
    var o, m = ["", "Double_", "Triple_", "Quadruple_"], l = operator_names, h = operators.join("\\"), mock = string,
        u = function(v, t) {
          if(!(+v <= Infinity) && t != undefined)
            return m[v] + t;
        },
        n = function(v, t) {
          if(/^([\!\~\*\/%\+\-<>\&\^\|\?\:\=])\1*$/.test(v) && t != undefined) {
            return m[v.length - 1] + t
          } else {
            v = ((v || "") + "").replace(/\\/g, "").split("");
            for(var x = 0, y = {}; x < v.length; x++) {
              y[v[x]] = (y[v[x]] == undefined)? 0: y[v[x]];
              if(v[x] == v[x + 1])
                y[v[x]]++;
            }
            var z = [], q = 0;
            for(var o in y) {
              if(q++ > 3)
                break;
              z.push(u(y[o], l[o]));
            }
            return z.join("");
          }
        };
    var s = string[0];
    if(RegExp("^([\\" + s + "][\\" + h + "]{0,3})").test(string) && root == RTS.p)
      string = string.replace(RegExp("^\\" + (o = RegExp.$1.split("").join("\\")) + "(.*)$"), n(o, l[s]) + RTS.P + "Operator\v$1\v");
    else if(RegExp("([\\" + s + "][\\" + h + "]{0,3})$").test(string) && root == RTS.s)
      string = string.replace(RegExp("^(.*)\\" + (o = RegExp.$1.split("").join("\\")) + "$"), n(o, l[s]) + RTS.S + "Operator\v$1\v");
    else if(RegExp("^(.*?)([\\" + s + "][\\" + h + "]{0,3})(.*?)$").test(string))
      string = string.replace(RegExp("^(.*)\\" + (o = RegExp.$2.split("").join("\\")) + "(.*)$"), n(o, l[s]) + "Operator\v" + ((RegExp.$1 != undefined)? "$1,": "") + "$2\v");

    if(/(prefix|suffix|media)-/.test(root)) {
      root.replace(/^(\w)/, "");
      root = RTS[RegExp.$1.toUpperCase()];
      string = string.replace(root, (root != RTS.M)? root: "");
    }
    return string
  }

  PN.replace =
    // String: String
  function replace(s) {
    for(var x = 0; x < PN.kids.length; x++)
      for(var kid in PN.kids[x])
        for(var k = RegExp("([\\w\\$]*[\\b]*)?\\$[\\b]*" + kid + "\\b"), j = []; k.test(s);)
          s = s.replace(k, function(e, a) {
            if(a != undefined && /[\w\$]/.test(a))
              return "\bP." + (j.push(e) - 1) + "\b";
            return (a || "") + (PN.kids[x][kid] + "").replace(/\$/g, "\b$\b")
          });
    for(var k = /[\b]P\.(\d+)[\b]/; k.test(s);)
      s = s.replace(k, function(e, a) {
        return j[+a]
      });
    return s
  };

  // String: String, Number
  function compile(string, index) {
    var JU_A, JU_B, JU_C = 0, r = /(\*\s*|\.{3}\s*|[a-z\$_][\w\$]*\s+)([@\.a-z\$_][\w\$]*)/ig, R = /([@\.a-z\$_][\w\$]*)(\*|\.{3})/ig, K = /([a-z\$_][\w\$]*)\s+([@\.a-z\$_][\w\$]*)\.{3}/gi, P = PN.replace, vari = /\b(arguments|eval|false|null|this|true|undefined|void)\b/, argy = /((([a-z\$_][\w\$]*|\.{3})\s+|\*\s*)[a-z\$_][\w\$]*|[a-z\$_][\w\$]*(\*|\.{3})|\.{3}[a-z\$_][\w\$]*\s*[,\=])/i, urgy = /(?:[^\.]\.)?([@a-z\$_][\w\$]*)\s*\=/i, ergy = /^\.[@a-z\$_][\w\$]*|[^\.]\.[@a-z\$_][\w\$]*/i, irgy = /\.{3}\s+[@\.a-z\$_][\w\$]*|[@\.a-z\$_][\w\$]*\.{3}|\.{3}[@\.a-z\$_][\w\$]*\s*[,\=]?/i, orgy = /([a-z\$_][\w\$]*)\s+([@\.a-z\$_][\w\$]*)\.{3}/i;

    function C(s) {
      return s.replace(/^(.*?)\(\s*/, "$1(").replace(/\s*\)(.*?)$/, ")$1")
    };
    function N(e) {
      return ((((Math.random() * 22) + 10).toString(36) + Number(((Math.random() + "") + (Math.random() + "") + (Math.random() + "")).replace(/0\./g, "")).toString(36)).replace(/\.|0+$/g, "")).slice(0, e);
    };
    function S(p, g) {
      // HELP: console.log("\t\tS:", [p, g]); // :HELP
      // PR, BE
      p = strip(decompile(p, 'PR'));
      g = decompile(g, 'BE');
      /^\s*\{(\s*)/.test(g);
      var s = RegExp.$1.length < 1;
      return g.replace(/^\s*\{(\s*)/, (/^\s*$/.test(p)? "{$1": "{$1" + (/\.{3}/.test(p) || orgy.test(p)? "var arity;$1": "") + "var " + argify(p.replace(K, "$2").replace(R, "$1").replace(r, "$2"), p.replace(K, "Spread/$1").replace(/\//g, "$").replace(R, "$2").replace(r, "$1").split(','), s) + ";$1"));
    };
    function T(r) {
      // HELP: console.log("\t\t\tT:", [r]); // :HELP
      if(r == undefined) return "";
      for(var k = /@|\bthis\b/, j = 1, r = r || ""; k.test(r);)
        r = r.replace(k, function() {
          return "\b$\b" + j++
        });
      return r;
    };
    function U(s, t) {
      t = (
        (!t)?
        decompile(s, 'PR').replace(/[\b]/g, "").replace(/^(.*)\(/, "$1 ").replace(/\)(.*)$/, " $1").replace(/([^\.])\.[\(\s]*/g, "$1."):
        s.replace(K, "Spread/$1 $2").replace(/\//g, "$").replace(R, "$2 $1").replace(r, "$1 $2").replace(/\.{3}\s*\*/, "...").replace(/\(/g, " ").replace(/\)/g, "")
      )
        .replace(/<(\*|All)>/gi, "HTMLAllCollection")
        .replace(/<(\.{3}|Collection)>/gi, "HTMLCollection")
        .replace(/<Document>/gi, "HTMLDocument")
        .replace(/<Element>/gi, "HTMLElement")
        .replace(/<(Form)(?:\.{3}|Controls(?:\.{3})?)>/gi, "HTMLFormControlsCollection")
        .replace(/<(Options)\.{3}>/gi, "HTMLOptionsCollection");
      for(var k = /<([A-Z]\w*)>/i; k.test(t);)
        t = t.replace(k, function($_, $1) {
          return "HTML" + ($1.slice(0, 1).toUpperCase() + $1.slice(1, $1.length)) + "Element"
        });
      return t;
    };
    function I(s, i) {
      // HELP: console.log(s, ["argy[\\j \\j]: " + argy.test(s)], ["ergy[.\\j]: " + ergy.test(s)], ["irgy[\\j...]: " + irgy.test(s)], ["orgy[\\j \\j...]: " + orgy.test(s)], ["urgy[\\j =]: " + (!runtime.has("1.8.5") && urgy.test(s))]); // :HELP
      return eval([argy.test(s), ergy.test(s), irgy.test(s), orgy.test(s), (!runtime.has("1.8.5") && urgy.test(s))]
                  .slice((i? 1: 0), 5)
                  .join("||"));
    }
    function V(type, options, foreign) {
      // HELP: console.log("\tV:", [type, options, foreign]); // :HELP
      var a = options.a, b = options.b, c = options.c;
      function g(s){return s.replace(orgy, "Spread/$1 $2").replace(/\//g, "$");};
      // HELP: console.log("\tV[a,b,c] 0:", [a, b, c]); // :HELP
      if(options.C) {
        if(c != undefined)
          for(;orgy.test(c);)
            c = g(c);
        else
          for(;orgy.test(b);)
            b = g(b);
      }
      // HELP: console.log("\tV[a,b,c] 1:", [a, b, c]); // :HELP

      if(c != undefined && options.indie != undefined)
        c = U(c, options.indie);
      else
        b = U(b, options.indie);
      // HELP: console.log("\tV[a,b,c] 2:", [a, b, c]); // :HELP
      
      var t = V.t, u = V.u,
          x = ((!foreign)? Push(type, a, b.replace(u, "")): Push(type, a, c.replace(u, ""), b)) - 1,
          s = ((!foreign)? Pull(type, a): Pull(type, a, b))[x]
              .join("_")
              .replace(/\.{3}/g, "Spread")
              .replace(/\*/g, "Any"),
          i = I(c || b, true);
      // HELP: console.log("\tV[s]:", [b, c, s], i); // :HELP
      s = options.head + (options.strict? "": s) + (options.tail || "") +
        C(i?
        ("() " + S(options._[0], options._[1])):
      ("(" + T(options._[0]).replace(u, "").replace(r, "$2").replace(R, "$1").replace(t, "$1") + ") " + options._[1]));
      // HELP: console.log(s); // :HELP
      return (options.$)? s: X(s);
    };
    V.t = /\s*([,\)]|$)/g, V.u = /\s*\=\s*[^,]*/g;
    function W(s) {
      return argy.test(s) || ergy.test(s) || orgy.test(s) || (!runtime.has("1.8.5") && urgy.test(s)) || orgy.test(s)
    };
    function X(s) {
      return unhandle(decompile(s, "BE"))
    };
    function Y(a, b) {
      var c = a, d = b;
      return ((a = Paramour.ClassTypeFN)[c] != undefined && (b = Paramour.ClassTypeFN[c])[d] != undefined && a.hasOwnProperty(c) && b.hasOwnProperty(d))
    };
    function Z(a, b) {
      var c = b, d = a, e = {};
      return ((a = Paramour.NativeTypeFN)[c] != undefined && a.hasOwnProperty(c))? (Paramour.NativeTypeFN[d] = (e[d] = Array(a[c])[0], e[d]), a[c] = undefined, true): false
    };
    function J(t) {
      return t.replace(/(?:@@\.?|this\.(?:prototype|this)\.)?\b(toconsole|std(in|out)|assert(True|False|Fail|(Not)?(Equals|Null|NaN|Undefined))?)\b/g, "JSUNIT.$1").replace(/(?:@@\.?|this\.(?:prototype|this)\.)([a-zA-Z\$_][\w\$]*)/g, "JSUNIT.prototype.$1").replace(/(@@\.?|this\.(?:prototype|this))/g, "JSUNIT");
    };

    var patterns = {
      // rehandlers
      "class\\?=(\\j)\\s*(BE)\\.(\\d+)": function($_, $1, $2, $3) {
        return (strict? "const\b ": "var\b ") + $1 + " = (function(__super__, __Super__) " + eval($2)[+$3]
          .replace(/^\{(\s*)/, "{$1" + $1 + ".prototype = {constructor: " + $1 + "};" + newline + "$1")
          .replace(/(?:<init>|\.?\bconstructor)\s*(PR\.\d+)?(?:\:[a-zA-Z\$_][\w\$]*)?\s*(BE\.\d+)/, function(__, _1, _2) {
          return "constructor?=" + $1 + " [" + (_1 || "") + "] " + _2
        })
          .replace(/(?:\*\s*|\bstatic\s+)\.?([a-z\$_][\w\$]*)\s*(PR\.\d+)(?:\:[a-zA-Z\$_][\w\$]*)?\s*(BE\.\d+)/gi, "static?=prototype?=" + $1 + ":$1 [$2] $3")
          .replace(/\.?([a-z\$_][\w\$]*)\s*(PR\.\d+)(?:\:[a-zA-Z\$_][\w\$]*)?\s*(BE\.\d+)/gi, "prototype?=" + $1 + ":$1 [$2] $3")
          .replace(/(\s*)\}$/, "$1  -> " + $1 + ";$1})();")
      },
      "extends\\?=(\\j)\\:(\\j)\\s*(BE)\\.(\\d+)": function($_, $1, $2, $3, $4) {
        return (strict? "const\b ": "var\b ") + $2 + " = (function(__super__, __Super__) " + eval($3)[+$4]
          .replace(/^\{(\s*)/, "{$1" + $2 + ".prototype = Object.assign(__super__ = (__Super__ = " + $1 + ").prototype, {constructor: " + $2 + "});" + newline + "$1")
          .replace(/(?:<init>|\.?\bconstructor)\s*(PR\.\d+)?(?:\:[a-zA-Z\$_][\w\$]*)?\s*(BE\.\d+)/, function(__, _1, _2) {
          return "constructor?=" + $2 + " [" + (_1 || "") + "] " + _2
        })
          .replace(/(?:\*\s*|\bstatic\s+)\.?([a-z\$_][\w\$]*)\s*(PR\.\d+)(?:\:[a-zA-Z\$_][\w\$]*)?\s*(BE\.\d+)/gi, "static?=prototype?=" + $2 + ":$1 [$2] $3")
          .replace(/\.?([a-z\$_][\w\$]*)\s*(PR\.\d+)(?:\:[a-zA-Z\$_][\w\$]*)?\s*(BE\.\d+)/gi, "prototype?=" + $2 + ":$1 [$2] $3")
          .replace(/(\s*)\}$/, "$1  -> " + $2 + ";$1})();")
      },
      "constructor\\?=(\\j)\\s*\\[(PR\\.\\d+)?\\]\\s*(BE\\.\\d+)": function($_, $1, $2, $3) {
        // $1 Class, $2 PR, $3 BE
        $2 = ($2 != undefined)? $2: "()";
        $2 = unhandle(strip(decompile($2, "PR")));
        $3 = unhandle(decompile($3.replace(/\b(var|const|let)\s+super\b/g, "$1 __super__ = __super__.constructor").replace(/\bsuper\b/, "(__super__ = __super__.constructor)").replace(/\bsuper\b/g, "__super__"), "BE"));
        // HELP: console.log("constructor:", [$1, $2, $3]); // :HELP
        return V("class", {
          head: "function\b " + $1,
          a: $1,
          b: "constructor",
          c: $2,
          _: [$2, $3],
          strict: true
        }, true);
      },
      "(\\s*)(static\\?=|\\*\\s*)?prototype\\?=(\\j)\\:(\\j)\\s*\\[([^\\[\\]]*)\\]\\s*(BE\\.\\d+)": function($_, $1, $2, $3, $4, $5, $6) {
        // $1 Spaces, $2 Static, $3 Class, $4 method, $5 PR, $6 BE
        $2 = $2 != undefined;
        $5 = unhandle(strip(decompile($5.replace(/[\b]/g, ""), "PR")));
        $6 = decompile($6.replace(/[\b]/g, ""), "BE");
        // HELP: console.log("prototype:", [$1, $2, $3, $4, $5, $6]); // :HELP
        var spaces = $1.slice(0, -2), typed = (($2)? $3 + "." + $4: $3 + ".prototype." + $4);

        for(var k = /\bsuper\b\s*([^\(\)\[\]\.][^\n\r;]*)/; k.test($6);)
          $6 = $6.replace(k, function(__, _1) {
            _1 = strip(decompile(unhandle(_1), 'PR').replace(/^\((.*)\)(.*?)$/, "$1$2"));
            return (/^\s*(\.|(BK|PR)\.\d+)/.test(_1))?
              "__" + ($2? "S": "s") + "uper__" + $4 + _1:
            "__" + ($2? "S": "s") + "uper__." + $4 + ".call(this" + (/^\s*$/.test(_1)? "": ", " + _1) + ")"
          });
        $6 = unhandle(decompile($6.replace(/\b(var|const|let)\s+super\b/g, "$1 __super__ = __super__.constructor").replace(/\bsuper\b/, "(__super__ = __super__.constructor)").replace(/\bsuper\b/g, "__super__").replace(/\s*\}$/, newline + spaces + "  }"), "BE"));

        $2 = (($2)? "static?=": "");

        return ignore(I($5)?
          V("class", {
          head: $1 + $2 + "pocket?=" + $3 + ":" + $4 + newline + "  " + spaces + typed + "__",
          tail: " = function\b " + $4,
          a: $3,
          b: $4,
          c: $5,
          _: [$5, $6]
        }, true):
          newline + "  " + spaces + typed + " = function\b " + $4 + "(" + $5 + ") " + $6);
      },
     "(\\s*)(?:[\\b]*\\bfunction[\\b\\s]+|\\.\\s*)?(static(?:\\?=|\\s+)|\\*\\s*)?srototype\\?=(\\j)\\:(\\j)\\s*\\[([^\\[\\]]*)\\]\\s*(BE\\.\\d+)": function($_, $1, $2, $3, $4, $5, $6) {
       $4 = $4.replace(/__([a-z\$][\w\$]*)?$/i, "");
       $5 = ($5 || "").replace(/[\b]/g, "");
       $6 = decompile($6, "PR BK BE");
       $6 = decompile($6, "BE");
       $2 = $2 != undefined;
       var s, x, $6, t = V.t, u = V.u, A, B, D, E, Q = (($2)? "static " + $4: $4), H = $1;
       // HELP: console.log("srototype:", [$1, $2, $3, $4, $5, $6]); // :HELP

       for(var k = /\bsuper\b\s*([^\(\)\[\]\.][^\n\r;]*)/; k.test($6);)
         $6 = $6.replace(k, function(__, _1) {
           _1 = strip(decompile(unhandle(_1), 'PR').replace(/^\((.*)\)(.*?)$/, "$1$2"));
           return (/^\s*(\.|[\b]*(?:BK|PR)\.\d+[\b]*)/.test(_1))?
             "\bsup\ber\b" + _1:
           "\bsup\ber\b(" + _1 + ")"
         });
       $6 = unhandle($6, "BE");

       if((Y($3, $4) || Z($3, $4)) || I($5)) {
         return V("class", {
           head: (($1 == H)? ($1 = $1.slice(0, -2), H): $1) + (($2)? "static?=": "") + "socket?=" + $3 + ":" + $4 + newline + "  " + $1 + Q + "__",
           a: $3.replace(/^[\b]/, ""),
           b: $4,
           c: $5,
           _: [$5, $6],
           z: [A, B, D, E],
           $: true
         }, true);
       }

       return ($1 + Q + C(I($5)?
          "()\b " + S($5, $6):
        "(" + T($5).replace(r, "$2").replace(t, "$1") + ")\b " + $6));
      },
      "[\\b]([\\=\\-\\~\\+\\&])arrow\\?=\\[([^\\[\\]]*)\\]\\s*\\[([^\\[\\]]*)\\]\\s*(BE\\.\\d+|PR\\.\\d+|\\z*\\Q+)": function($_, $1, $2, $3, $4) {
        // HELP: console.log($_, [$1, $2, $3, $2], [$1, $2, decompile($3), decompile($4)]); // :HELP
        $1 = $1.replace("=", "-");
        $2 = ($2 || "").replace(/[\b]/g, "").replace(/([a-z\$_][\w\$]*)\s*$/i, "$1");

        var d = strip(decompile($3, "PR")), n = "", f = ((/[\=\:]/.test($2))? (n = "function\b ", ""): "function\b "),
            A, B, D, E, t = V.t, u = V.u, v = /\s*[\=\:]\s*/, w = v.test($2), x = "", y, l;

        // HELP: console.log("Native[" + $1 + ">] 0:", [$2, $3, $4]); // :HELP

        if(/^PR\.\d+$/.test($4))
          l = unhandle(f + $2 + n + (d != ""? "(" + T(d) + ")": "()") + " {" + $1 + ">\b " + decompile($4, 'PR') + "}");
        else if(/^BE\.\d+$/.test($4))
          l = unhandle(f + $2 + n + (I(d, true)?
            "() " + S($3, $4):
          "(" + T(d) + ")" + $4));
        else
          l = unhandle(f + $2 + n + $3 + " {" + $1 + ">\b" + (/^[\x20\t\v ]/.test($4)? "": " ") + decompile($4, 'PR') + "}");

        $3 = U($3);
        if((Paramour.NativeTypeFN[$1] != Paramour.SubTypeFN[$1] || Paramour.NativeTypeFN == undefined) || I($2)) {
          $2 = ((w)? (x = $2, ""): $2);
          // HELP: console.log("Native[" + $1 + ">] 1:", [$2, $3, $4]); // :HELP
          return V("native", {
            head: x + "\bfunction\b " + $2 + "__",
            a: $2.replace(/^[\b]/, ""),
            b: $3,
            z: [D, B, E],
            _: [$3, "{" + $1 + ">\b " + $4 + "}"],
            $: true,
            indie: true
          });
        }

        // HELP: console.log("Native[=>] 0:", [Paramour.NativeTypeFN[$1] != Paramour.SubTypeFN[$1], Paramour.NativeTypeFN == undefined, I($2)]); // :HELP
        return l;
      },
      // <thans>
      "<init>": function($_) {
        return ".constructor"
      },
      "(\\j)(@|[\\:\\.]{2})(\\j)": function($_, $1, $2, $3) {
        return $1 + ".prototype." + $3
      },
      "(\\j)\\s+get\\s+(\\j)\\z*(BE\\.\\d+)": function($_, $1, $2, $3) {
        return $1 + ".__defineGetter__(\"" + $2 + "\", function() " + $3 + ")"
      },
      "(\\j)\\s*get\\?\\s*(\\j)": function($_, $1, $2) {
        return $1 + ".__lookupGetter__(\"" + $2 + "\")"
      },
      "(\\j)\\s+set\\s+(\\j)\\z*(BE\\.\\d+)": function($_, $1, $2, $3) {
        return $1 + ".__defineSetter__(\"" + $2 + "\", function(" + $2.replace(reserved, "__$1__") + ") " + $3 + ")"
      },
      "(\\j)\\s*set\\?\\s*(\\j)": function($_, $1, $2) {
        return $1 + ".__lookupSetter__(\"" + $2 + "\")"
      },
      // reserved words
      // statement {}
      "\\b(do|else|finally|return|try|typeof|while)\\z*(BE\\.\\d+)": function($_, $1, $2) {
        return "\b" + $1 + "\b " + $2 + "\b"
      },
      // statement () {}
      "\\b(catch|for|function|if|switch|while|with|\\.\\j)\\z*(PR\\.\\d+)": function($_, $1, $2) {
        return "\b" + $1 + "\b" + $2 + "\b"
      },
      "(\\s*(?:case|default))\\z*(BK\\.\\d+)\\z*(BE\\.\\d+|\\z*([\\:]\\z*)?\\Q+)": function($_, $1, $2, $3) {
        $2 = decompile($2, "BK");
        var s = function(g) {
          return {"":10,"0b":2,"0o":8,"0x":16}[g.toLowerCase()];
        };
        if(!/\[((0[box])?[\da-f\.]+?)?\s*(\.{2,3})\s*((?:0[box])?[\da-f\.]+?)?\]/i.test($2))
          return ignore($_);
        else
          for(var i = +(RegExp.$1 || 0), u, t = s(u = RegExp.$2||""), e = +(RegExp.$4 || 1), n = (RegExp.$3 == ".."), j = [], k = i < e;
              (k?
               n? i < e + 1: i < e:
               n? i > e - 1: i > e);
              i += k? 1: -1)
          // HELP: console.log("[", i, (k?"<":">") + (n?"=":""), e, ";", (k?"++":"--"), "]"), // :HELP
          j.push(u + i.toString(t));
        return unhandle($1 + " (" + j.join(", ") + ") " + $3)
      },
      "(\\s*)case\\z*(PR\\.\\d+)\\z*(BE\\.\\d+|\\z*([\\:]\\z*)?\\Q+\\q)": function($_, $1, $2, $3) {
        var f = [];
        $2 = unhandle(strip(decompile($2, 'PR'))).split(/,\s*|\s+/);
        for(var x = 0; x < $2.length - 1; x++)
          if(!/^\s*$/.test($2[x]))
            f.push($1 + "case " + $2[x] + ":");
        f.push($1 + "case " + $2[x] + (/^\s*\:/.test($3)? "": ":" + newline + $1 + "  "));
        return f.join(newline) + decompile($3, 'BE').replace(/^\{\s*/, "").replace(/\s*(\}|;|\b|\B)$/, ";" + newline + $1 + "  break;") + newline;
      },
      "(\\s*)default\\z*(PR\\.\\d+)?\\z*(BE\\.\\d+|\\z*([\\:]\\z*)?\\Q+\\q)": function($_, $1, $2, $3) {
        var f = [];
        if($2 == undefined && /^\s*\:\s*/.test($3))
          return $1 + "\bdef\baul\bt\b" + $3;
        $2 = unhandle(strip(decompile($2, 'PR'))).split(/,\s*|\s+/);
        for(var x = 0; x < $2.length; x++)
          if(!/^\s*$/.test($2[x]))
            f.push($1 + "case " + $2[x] + ":");
        f.push($1 + "\bdef\baul\bt\b" + (/^\s*\:/.test($3)? "": ":" + newline + $1 + "  "));
        return f.join(newline) + decompile($3, 'BE').replace(/^\{\s*/, "").replace(/\s*(\}|;|\b|\B)$/, ";" + newline + $1 + "  break;") + newline;
      },
      // Custom Operators
      "(\\s*)?(\\j)?\\s*(BK\\.\\d+)(?:\\:\\j)?\\z*(BE\\.\\d+|\\=>\\z*\\Q+)": function($_, $1, $2, $3, $4) {
        $3 = decompile($3, 'BK');
        $1 = $1 || "";
        var t, d, n, f, g, k, p = RTS.p, P = RTS.P, m = RTS.m, M = RTS.M, s = RTS.s, S = RTS.S, C = $2 != undefined;

        $3 = ($3 || "").replace(/^\[\s*|\s*\]$/g, "");
        $2 = ($2 || "").replace(/[\b]/g, "");

        if(!operators_regexp.test($3))
          return unhandle($1 + $2 + " [" + $3 + "]," + newline + $1 + "  " + $4);

        if(!C) {
          $3 = $3
            .replace(/([a-z\$_][\w\$]*|\*|\.{3})?\s*([\!~\*\/%\+\-<>\&\^\|\?\:\=]{1,4})\s*([a-z\$_][\w\$]*|\*|\.{3})?/i, function(__, _1, _2, _3) {
          function y(n) {return n.replace(/\bSpread\b/g, "...")};
          if(_1 == undefined && _3 != undefined)
            t = P, d = p, k = false, g = [y(_3)];
          else if(_1 != undefined && _3 == undefined)
            t = S, d = s, k = false, g = [y(_1)];
          else if(_1 != undefined && _3 != undefined)
            t = M, d = m, k = true, g = [y(_1), y(_3)];
          $2 = _2.replace(/\s+/g, "");
          return __
        });
          n = hand($2, d).replace(/\([,\s]*\)$/, "");
        } else {
          $3 = $3
            .replace(/\(/g, " ")
            .replace(/\)/g, "")
            .replace(/([a-z\$_][\w\$]*)?(\s*;\s*|\s+[a-z\$_][\w\$]*\s+|\s+)?([a-z\$_][\w\$]*)?/i, function(__, _1, _2, _3) {
            var _d = RegExp("\\b" + $2 + "\\b|[;]");
            if(_d.test(_1) && !_d.test(_2) && !_d.test(_3))
              t = P, d = p, k = false, g = [_1];
            else if(!_d.test(_1) && !_d.test(_2) && _d.test(_3))
              t = S, d = s, k = false, g = [_3];
            else if(!_d.test(_1) && _d.test(_2) && !_d.test(_3))
              t = M, d = m, k = true, g = [_1, _3];
            return __
          })
          .replace(/\$/g, "\b$\b");
        }

        $2 = $2.replace(/\$/g, "\b$\b");

        for(var x = 0; x < g.length; x++)
          g[x] = g[x].replace(/^\s*(\*|\.{3}|[a-z\$\_][\w\$]*)/i, "$1 \b$\b" + (x + 1) + "\b");
        g = g.join(", ");

        f = (C? $2: n = n.replace(/^.*?([a-z\$_][\w\$]*).*?$/i, "$1")) + unhandle("(" + g + ")") + " " + (/^\=>/.test($4)? "\b": "") + $4;
        Operator($2, g, d, decompile(f, 'PR'), $4, (n || $2));
        return $1 + compile(f)
      },
      // JS-Unit
      "([\\b]*DS[\\.#]\\d+[\\b]*\\z*)?@(After|Before)\\z*(BE\\.\\d+)": function($_, $1, $2, $3) {
        eval("JU_" + $2[0] + " = true");
        return ($1 == undefined? "": $1.replace(/(\s)?$/, ".setDocString(JSUNIT." + $2 + ");$1" + newline)) + unhandle("JSUNIT." + $2 + " = () " + J(decompile($3, 'BE')));
      },
      "([\\b]*DS[\\.#]\\d+[\\b]*\\z*)?@Test\\z*(PR\\.\\d+)?(?:\\:\\j)?\\z*(BE\\.\\d+)(\\z*PR\\.\\d+)?": function($_, $1, $2, $3, $4) {
        var n = "JSUNIT.Test[" + (JU_C++) + "]";
        $1 = $1 || "";
        return (/^\s*$/.test($1)? "": $1.replace(/(\s)?$/, ".setDocString(" + n + ");$1" + newline)) + compile(unhandle("(" + (n + "\b = " + ($2 || "()")) + J(decompile($3, 'BE'))
        .replace(/^\{(\s*)/, JU_B? "{$1JSUNIT.Before();$1": "{$1")
        .replace(/(\s*)\}$/, JU_A? "$1  JSUNIT.After();$1}": "$1}") + ")" + ($4 || "()")));
      },
      // arrows and custom operators
      "(\\.)?(\\j\\z*[\\:\\=]?\\z*)?(PR\\.\\d+)(?:\\:\\j)?\\z*([\\b]*)?([\\=\\-\\~\\+\\&])>\\z*(BE\\.\\d+|PR\\.\\d+|\\Q+)": function($_, $1, $2, $3, $4, $5, $6) {
        // .\j = (...) => {...}
        var _1 = "", _2 = "", _3;
        $2 = $2 || "";
        $4 = $4 == undefined;
        if(reserved.test($2) && $1 == undefined && /^[\=\-]$/.test($5))
          return ignore($2 + $3 + "\b => \b" + $6);
        if(!runtime.has("1.6") && $_ != strip(string) && /^PR\.\d+$/.test($6) && $2 == "") {
          string.replace(/^(\(+)?(.+?)(\)+)?$/g, "$1$2$3");
          _1 = RegExp.$3.slice(0, RegExp.$1.length - 1);
          self.pattern.test(RegExp.$2.replace(/\)+$/, function(__) {
            return _2 = __
          }));
          $_ = RegExp.$_, $2 = (RegExp.$1 || ""), $3 = RegExp.$2, $6 = RegExp.$3;
        }
        _3 = strip(decompile($3, 'PR')).replace(/\(+/g, " ").replace(/\)+/g, "");
        return ($1 || "") + ((runtime.has("1.6") && !/([@a-z\$_][\w\$]*)\s+([@a-z\$_][\w\$]*)/i.test(_3) && $4 && !argy.test(_3) && !orgy.test(_3))?
          $2 + "(" + _3 + ") => " + $6 + _2:
        compile("\b" + $5 + "arrow?=[" + $2 + "] [" + $3 + "] " + $6) + _2)
      },
      "(\\s*)(\\.)?(\\j\\z*)?\\s*([~\\*%\\/\\+\\-\\^\\?\\:]|[\\!\\&\\|\\=]{1,2}|[<>]{1,3})?\\s*\\=>\\z*(${operators_regexp}+)?\\s*(PR\\.\\d+)(\\Q*)\\s*(${operators_regexp}+)?": function($_, $1, $2, $3, $4, $5, $6, $7, $8) {
        var hty = [];
        $3 = $3 || "";
        $4 = $4 || "";
        $5 = $5 || "";
        $7 = $7 || "";
        if($5 != "" || $7 != "")
          $6 = unhandle("(" + $5 + $6 + $7 + ")");
        $5 = "", $7 = "";

        for(var k = /([^\(]*?)\s*(PR\.\d+|[\!~\*%\/\+\-<>\&\^\|\?\:\=]+)\s*(.*)/i, j = $6; k.test(j);)
          j = j.replace(k, function(__, _1, _2, _3) {
            var k = /([\!~\*%\/\+\-<>\&\^\|\?\:\=]+)/, l = /^\(|\s+|\)$/g, o, g;
            if(/^(PR\.\d+)$/.test(_2))
              if(k.test(_1))
                (_1 = _1.replace((g = _2), _2 = RegExp.$1, "").replace(l, "")) + (_3 = g.replace(l, ""));
              else if(k.test(_3))
                (_1 = _2.replace(l, "")) + (_3 = _3.replace(_2 = RegExp.$1, "").replace(l, ""));
            if((o = Operator.kids[_2]) != undefined)
              return o.name + shock("\\(" + (_1 + ((_3 != "")? ((_1 != "")? ", ": "") + _3: "")) + "\\)", true);
            return _1 + "\b " + ((k.test(_2))? shock("\\" + _2.split("").join("\\"), true): decompile(_2, 'PR')) + "\b " + _3
          });

        j = unshock(j).replace(/^\s*(\(+)\s*(.*?)\s*(\)+)\s*$/, function($_, _1, _2, _3) {
          return _2 + _3.slice(0, -_1.length)
        });

        j = decompile(unhandle(j, "PR").replace(/\((?:\s*,)?|(?:,\s*)?\)/g, ""), "PR");

        for(var k = /\b([a-z\$_][\w\$]*)\s+([a-z\$_][\w\$]*)\s+([a-z\$_][\w\$]*)\b/i; k.test(j);)
          j = j.replace(k, function(__, _1, _2, _3) {
            var A, B, C, $2 = RTS.$2, m = RTS.m, $1 = RTS.$1, u = /[\b]/g;
            _1 = _1.replace(u, "");
            _2 = _2.replace(u, "");
            _3 = _3.replace(u, "");
            if((A = Operator.kids[_1]) != undefined || (B = Operator.kids[_2]) != undefined || (C = Operator.kids[_3]) != undefined)
              if((A || {}).root == $1 || (C || {}).root == $2)
                return _1 + "(" + _2 + ((_3 != "")? ", " + _3: "") + ")";
              else if((A || {}).root == $2 || (C || {}).root == $1)
                return 35 + "(" + _1 + ((_3 != "")? ", " + _2: "") + ")";
              else if((B || {}).root == m)
                return _2 + "(" + _1 + ((_3 != "")? ", " + _3: "") + ")";
              else return _1 + "\b" + _2 + "\b" + _3
          });

        for(k = /\b([a-z\$_][\w\$]*)\s+([a-z\$_][\w\$]*)\b/i; k.test(j);)
          j = j.replace(k, function(__, _1, _2) {
            var A, B, $2 = RTS.$2, m = RTS.m, $1 = RTS.$1, u = /[\b]/g;
            _1 = _1.replace(u, "");
            _2 = _2.replace(u, "");
            if((A = Operator.kids[_1]) != undefined || (B = Operator.kids[_2]) != undefined)
              if((A || {}).root == $1 || (B || {}).root == $2)
                return _1 + "(" + _2 + ")";
              else if((A || {}).root == $2 || (B || {}).root == $1)
                return _2 + "(" + _1 + ")";
              else
                return (reserved.test(_1))?
                  _1 + "\b" + _2 + "\b":
                (reserved.test(_2))?
                  _1 + "(" + _2 + ")":
                _1 + "\b" + _2 + "\b";
          });
        var f_ = "", _f = "", c_ = "", _c = "", h, h_, _h, o_, _o, c = $8, f = $7;
        f = (((h_ = (o_ = Operator.kids[f]) != undefined)? o_.name: f) || "").replace(/\(\s*\)/, "");
        f = (f != "" && h_)? (f_ = "(", _f = ")", f): f;
        c = (((_h = (_o = Operator.kids[c]) != undefined)? _o.name: c) || "").replace(/\(\s*\)/, "");
        c = (c != "" && _h)? (c_ = "(", _c = ")", c): c;
        // j = hand(j);

        if(h_ && _h)
          h = f + f_ + c + c_ + j + _c + _f; // f(c(j))
        else if(h_)
          h = c + c_ + f + f_ + j + _f + _c; // c f(j)
        else if(_h)
          h = f_ + c + c_ + j + _c + _f + f; // c(j) f
        else
          h = c + j + f; // c j f

        $1 = unshock($1 + ($2 || "") + ($3 == ""? "": (reserved.test($3) && $2 == undefined)? $3: $3 + $4 + "= ") + h).replace(/(\))?\s*,\s*\)/g, "$1)");

        return $1
      },
      // classes
      "(?:\\bclass\\s+)?(\\j)(?:\\s+extends\\s+|\\.|\\s+)(\\j)\\z*(BE\\.\\d+)": function($_, $1, $2, $3) {
        if(runtime.has("1.6")) {
          $3 = (unhandle(decompile($3, 'BE').replace(/^\{|\}$/g, "")) || "").replace(/(?:<init>|\bconstructor\b)\s*(BE\.\d+)/, "constructor PR." + (PR.push("()") - 1) + " $1");
          $3 = $3.replace(/\*[\b]*(\s*\.)?/g, "$1*");
          for(var k = /(?:\bfunction[\b]*\s+|\.)?((?:\*\s*|\bstatic[\b]*\s+)?[a-z\$_][\w\$]*)[\b]*\s*(PR\.\d+)(?:\:[a-zA-Z\$_][\w\$]*)?[\b]*\s*(BE\.\d+)/i; k.test($3);) {
            $3 = $3.replace(k, function(__, _1, _2, _3) {
              var _k = /(\*\s*|\bstatic\s+)/, _s = _k.test(_1)? "static?=": "";
              _1 = _1.replace(_k, "");
              if(/^\bfunction\b/.test(_1)) _1 = "";
              
              return compile(_s + "srototype?=" + $2 + ":" + _1 + " [" + strip(decompile(_2)) + "] " + _3);
            })
          }
          return "\bclass\b " + $2 + "\b extends\b " + $1 + " {" + $3.replace(/\.[\b]class[\b]\s*/g, "").replace(/\*\s*\./g, ".*") + "}"
        }
        return compile("extends?=" + $1 + ":" + $2 + " " + $3);
      },
      "(?:\\bclass\\s+)?(\\j)\\z*(BE\\.\\d+)": function($_, $1, $2) {
        var d = $1;
        if(runtime.has("1.6")) {
          $2 = (unhandle(decompile($2, 'BE').replace(/^\{|\}$/g, "")) || "").replace(/(?:<init>|\bconstructor\b)\s*(BE\.\d+)/, "constructor PR." + (PR.push("()") - 1) + " $1");
          $2 = $2.replace(/\*[\b]*(\s*\.)?/g, "$1*");
          for(var k = /(?:\bfunction[\b]*\s+|\.)?((?:\*\s*|\bstatic[\b]*\s+)?[a-z\$_][\w\$]*)[\b]*\s*(PR\.\d+)(?:\:[a-zA-Z\$_][\w\$]*)?[\b]*\s*(BE\.\d+)/i; k.test($2);) {
            $2 = $2.replace(k, function(__, _1, _2, _3) {
              var _k = /(\*\s*|\bstatic\s+)/, _s = _k.test(_1)? "static?=": "";
              _1 = _1.replace(_k, "");
              if(/^\bfunction\b/.test(_1)) _1 = "";

              return compile(_s + "srototype?=" + $1 + ":" + _1 + " [" + strip(decompile(_2)) + "] " + _3);
            })
          }
          return "\bclass\b " + $1 + " {" + $2.replace(/\.[\b]class[\b]\s*/g, "").replace(/\*\s*\./g, ".*") + "}"
        }
        return compile("class?=" + $1 + " " + $2, [$1]);
      },
      // functions
      "(?:\\b(?:function|[gs]et|static)[\\b]?\\s+|\\.)?(\\*?\\j\\z*[\\:\\=]?\\z*)?(PR\\.\\d+)(?:\\:\\j)?\\z*(BE\\.\\d+)": function($_, $1, $2, $3) {
        $1 = ($1 || "").replace(/[\b]/g, "").replace(/([a-z\$_][\w\$]*)\s*$/i, "$1");
        var A, B, D, E, t = V.t, u = V.u, v = /\s*[\=\:]\s*/, w = v.test($1), x = "", y;

        // HELP: console.log("Native[function]0:", [$1, $2, $3]); // :HELP

        if(/^[\b]*\./.test($_))
          if(w) // handle .= functions
            return (($3 = compile($1 + $2 + $3), reserved.test($1))? "." + $3: "\b.\b" + $3);
          else // ignore prototypes
            return "\b" + $1 + "\b" + $2 + "\b " + $3 + "\b";

        y = U($2);
        if(/^[\b]?\b(([gs]et|static|function)[\b]?\s+)/.test($_) && !I(y))
          return "\b" + RegExp.$1 + $1 + "\b" + $2 + "\b " + $3 + "\b";
        else
          $2 = y;

        // TODO: Setup "mototype?=" for methods of literal objects
        // Paramour:
        //   fn: (String message) => "'${message}' has been logged";
        // JavaScript:
        //   fn: function fn() { #{ Choose-Appropiate-Function }# };
        //   fn__String: function fn(message) {return "'" + (message) + "' has been logged"};
        if((Paramour.NativeTypeFN[$1] != Paramour.SubTypeFN[$1] || Paramour.NativeTypeFN == undefined) || I($2)) {
          $1 = ((w)? (x = $1, ""): $1);
          // HELP: console.log("Native[function]1:", [$1, $2, $3]); // :HELP
          return V("native", {
            head: x + "\bfunction\b " + $1 + "__",
            a: $1.replace(/^[\b]/, ""),
            b: $2,
            z: [D, B, E],
            _: [$2, $3],
            $: true,
            indie: true
          });
        }

        return C(I($2)?
          (w)?
            $1 + "function() " + S($2, $3):
          "function\b " + $1 + "() " + S($2, $3):
        (w)?
          $1 + "function(" + $2.replace(r, "$2").replace(t, "$1") + ") " + $3:
        "function\b " + $1 + "(" + T($2).replace(r, "$2").replace(t, "$1") + ") " + $3);
      },
      "([^\\-])\\->": function($_, $1) {
        return $1 + "return\b"
      },
      "\\~>": function($_) {
        return "throw\b"
      },
      "([^\\+])\\+>": function($_, $1) {
        return $1 + "throw\b new\b"
      },
      "\\&>": function($_) {
        return "yield\b"
      },
      "\\b((?:DQ|SQ|QI|Dq|Sq|Tq)\\.\\d+)\\s*(\\j)\\s*([\\=\\:])\\s*([^\\n\\r,;\\{\\}\\(\\)\\[\\]\\:]*)((\\s*\\:)\\s*\\Q*)?": function($_, $1, $2, $3, $4, $5, $6) {
        var q = (/\.\d+/.test($1)? ".name": ""),
            r = ($5 == undefined? " undefined": $5.replace($6, ""));
        if($3 == "=")
          return $2 + " = ((" + $2 + " = " + $4 + ").constructor" + q + " == " + $1 + ")? " + $2 + ":" + r;
        return $2 + ": ((Global['." + $2 + "'] = " + $4 + ").constructor" + q + " == " + $1 + ")? Global['." + $2 + "']:" + r;
      },
      "\\b((?:DQ|SQ|QI|Dq|Sq|Tq)\\.\\d+)\\s*(\\j|[\\b]*PR\\.\\d+)": function($_, $1, $2) {
        if(!/^(["'`]|["'`]{3})(boolean|function|null|number|object|string|symbol|undefined|defined)(["'`]|["'`]{3})$/.test($1 = decompile($1, "DQ SQ QI Dq Sq Tq")))
          return $1 + " + " + $2;
        return (RegExp.$2 == "defined")?
          unhandle($1.replace(RegExp.$2, "undefined")) + " != typeof\b " + $2:
          unhandle($1) + " == typeof\b " + $2
      },
      "\\b((un)?defined|null)\\s*(\\j(?:\\l*|\\#?))": function($_, $1, $2, $3, $4) {
       return shock((($2 == "un" || $1 == "null")?
         (strict)?
           "\\(" + $3 + " == " + $1 + "\\)":
           "\\(" + $3 + " == undefined || " + $3 + " == null\\)":
       "\\(" + $3 + " != undefined && " + $3 + " != null\\)"), true)
     },
     "\\bNaN(\\s+|\\s*\\={2,3}\\s*)([\\+\\-]{0,2}\\j\\l*)": function($_, $1, $2) {
       return unhandle(shock(("\\!(" + $2 + "" + ($1.replace(/^\s+$/, " <= ")) + "Infinity\\)"), true))
     },
     "([\\+\\-]{0,2}\\j\\l*)\\s*(\\={2,3})\\s*NaN": function($_, $1, $2) {
       return unhandle(shock("\\!(" + $1 + " <= Infinity\\)", true))
     },
      // variables
      "\\b(var|const|let)\\z*(PR\\.\\d+)(\\z*[\\:\\=]\\Q+)?": function($_, $1, $2, $3) {
        var c, s, d;
        $3 = $3 || "";
        $3 = $3.replace(/;$/, "").replace(/^\s*([\:\=])\s*/, "");
        c = RegExp.$1;
        s = (c == ":" || $1 == "const"? "const ": $1 + " ") + strip(decompile($2, 'PR')).replace(/(^\s*|,\s*)([a-z\$_][\w\$]*)(\s*,|\s*$)/gi, $3 == ""? "$1$2$3": "$1$2 = " + $3 + "$3").replace(/(^\s*|,\s*)([a-z\$_][\w\$]*)(\s*,|\s*$)/gi, $3 == ""? "$1$2$3": "$1$2 = " + $3 + "$3");
        s = unhandle(s);
        for(var k = /(?:\.BE|\bTP)\.(\d+)\b/, j, i = {}; k.test(s);)
          // HELP: console.log("set variable:", [$1, $2, $3], [s, j, i[j]]), // :HELP
          s = s.replace(k, function(__, _1) {
            if(i[j = __] == undefined)
              return i[j] = /\.BE\b/i.test(j)?
                "TP.\b" + (TP.push(BE[+_1].replace(/^\{|\}$/g, "")) - 1):
                decompile(__, "TP");
            return "Tuple.next"
          });
        return s.replace(/\.[\b]/g, ".")
      },
      // statements and handlers
      "@(\\j)\\#?": function($_, $1, $2) {
        if($2 != undefined && /^[A-Z_]+$/.test($1))
          return "this" + $1 + $2
        else if($2 != undefined)
          return "this." + $1 + $2
        else
          return "this." + $1
      },
      "@": function($_, $1) {
        return "this"
      },
      "(\\j)\\s*(PR\\.\\d+)": function($_, $1, $2) {
        return $1 + decompile($2, 'PR')
      },
      "(\\j)\\s*(BK\\.\\d+)\\z*(\\=\\z*[^\\=](?:BK\\.\\d+|\\j))?": function($_, $1, $2, $3) {
        $2 = decompile($2, "BK");
        $3 = $3 || "";
        var start, stop, type, from;
        if(!/\[([\w\$\-\.]+?)?\s*(\.{2,3})\s*([\w\$\-\.]+?)?\]/.test($2))
          return ignore($1 + "\b" + unhandle($2) + "\b" + $3);
        else
          start = RegExp.$1 || 0,
          stop = RegExp.$3 || 0,
          type = ((RegExp.$2 == ".." && $3 == "")? "slice": "splice"),
          from = ((/^[^\-,]*?\-\d+/.test(start) || (+start < 0 && +start < Infinity))? $1 + ".length " + (start + "").replace(/^\s*\-\s*/, "- "): start);
        return $1 + "." + type + "(" + (type == "slice"? from: start) + ", " + stop + (decompile($3, "BK").replace(/^(\=[\b\s]*)\[|\]\s*$/g, "$1").replace(/^\=[\b\s]*/, ", ")) + ")";
      },
      "((?:[\\:\\=,\\(\\[\\{]|\\b)\\z*)(BK\\.\\d+)": function($_, $1, $2) {
        $2 = decompile($2, "BK");
        var s = function(g) {
          return {"":10,"0b":2,"0o":8,"0x":16}[g.toLowerCase()];
        };
        if(!/\[((0[box])?[\da-f\.]+?)?\s*(\.{2,3})\s*((?:0[box])?[\da-f\.]+?)?\]/i.test($2))
          return ignore($_);
        else
          for(var i = +(RegExp.$1 || 0), u, t = s(u = RegExp.$2||""), e = +(RegExp.$4 || 1), n = (RegExp.$3 == ".."), j = [], k = i < e;
              (k?
               n? i < e + 1: i < e:
               n? i > e - 1: i > e);
              i += k? 1: -1)
          // HELP: console.log("[", i, (k?"<":">") + (n?"=":""), e, ";", (k?"++":"--"), "]"), // :HELP
          j.push(u + i.toString(t));
        return ignore($1 + "[" + j.join(", ") + "]");
      },
      // custom operators
      "(\\j\\#?|\\N)(\\s+)(\\j)(\\s+)(\\j\\#?|\\N)": function($_, $1, $2, $3, $4, $5, $6, $7) {
        var o, p, q, r = RTS.p, s = RTS.s, t = RTS.m;
        $2 = $2 || "";
        $7 = $7 || "";

        if((reserved.test($1) && !vari.test($1)) || (reserved.test($4) && !vari.test($4)) || (reserved.test($6) && !vari.test($6)))
          return ignore(decompile($_));

        if(Operator.kids != undefined)
          if((o = Operator.kids[$1]) != undefined || (p = Operator.kids[$4]) != undefined || (q = Operator.kids[$6]) != undefined)
            if((o = o || {}).root == s || o.root == r)
              return $4 + $5 + "\b" + $1 + "(" + $6 + ")";
            else if((q = q || {}).root == r || q.root == s)
              return $1 + $3 +  "\b" + $6 + "(" + $4 + ")";
            else if((p || {}).root == t)
              return $4 + "(" + $1 + ", " + $6 + ")";

        return decompile($1).replace($2, "") + "(" + $4 + " " + $5 + compile(decompile($6).replace($7, "")) + ")"
      },
      // etc.
      "([\\:\\=,\\(\\[\\{]\\z*)(\\.?(B[EK]|TP)\\.\\d+)": function($_, $1, $2, $3) {
        var l = {"BE": "{}", "BK": "[]", "TP": "()"}[$3], g = "", h = {"TP": "new Tuple"}[$3] || "";
        $2 = unhandle(decompile($2, "BE BK TP").replace(/^new\sTuple/, "").replace(/^[\{\[\(]|[\)\]\}]$/g, ""));
        if(/^\s*$/.test($2))
          return $1 + l;
        if($3 == "TP")
          $2 = decompile($2, "PR");
        $2 = $2.split(newline);
        for(var x = 0, y = 3, f, i = [], s = /^[\s\b]*$/; x < $2.length - 1; x++)
          if(!s.test($2[x]) || (s.test($2[x]) && !s.test($2[x + 1])))
            i.push($2[x].replace(/^(\s*)([^,]*?)?(,)?(\s*[\b]*(VC|[MS]L|DS|EM|PN)\.\d+[\b]*)?\s*?$/, function(__, _0, _1, _2, _3) {
              f = {
                a: _1 != undefined,
                b: _2 != undefined,
                c: _3 != undefined
              };
              y += +f.c;
              _1 = (_1 != undefined)? _1 + ",": "";
              g = g || _0;
              if(f.a && !f.b && !f.c)
                return _1 + newline;
              return _1 + (_3 || "") + newline
            }));
        if(i.length < 1)
          i = $2;
        return ignore(unhandle(
          $1 + h + (l[0] + ((i.length > 3)? newline + i.join(g).replace(/(\s*)$/, newline + "$1"): i.join(g)) + l[1])
          .replace(/,([\s\b]*(?:VC|ML|DS|EM|PN|SL)\.\d+[\b]*)?\s*[\)\]\}]$/,
                   "$1" + (i.length > 1? newline + g.slice(2, g.length): "") + l[1])
          .replace(/([\:\{\[\(]\s*),\s*/g, "$1")
        ).replace(/\s*([\(\)\{\}\[\]])/g, ""))
      },
      "\\.(BE\\.\\d+)": function($_, $1) {
        return "new\b Tuple(" + decompile($1, "BE").replace(/^\{|\}$/g, "") + ")"
      },
      "(\\j)\\s*((?:[STD][Qq]|QI)\\#)": function($_, $1, $2) {
        return $1 + "(" + $2 + ")"
      }
    },

    _patterns_ = {
      "\\.${reserved}": function($_, $1) {
        return '["' + $1 + '"]'
      },
      "${reserved}\\s*\\:": function($_, $1) {
        return '"' + $1 + '":'
      },
      "\\b(?:var|const|let)\\s+(\\j)\\.(\\j)": function($_, $1, $2) {
        return $1 + "." + $2
      },
      "([\\w\\$\\.]+)\\s*(${condition})\\s*([\\w\\$\\.]+)\\s*(${condition})\\s*([\\w\\$\\.]+)": function($_, $1, $2, $3, $4, $5) {
        return $1 + " " + $2 + " " + $3 + " && " + $3 + " " + $4 + " " + $5
      },
      "(\\j\\#?|\\N)(\\s+)(\\j(\\#|\\.{3})?|\\N)": function($_, $1, $2, $3, $4, $5) {
        var o, p, r = RTS.p, s = RTS.s;
        $2 = $2 || "";
        $5 = ($5 || "");
        var g = $5 == "...";

        if((reserved.test($1) && !vari.test($1)) || (reserved.test($4) && !vari.test($4)))
          return ignore(decompile($_));

        if(Operator.kids != undefined)
          if((o = Operator.kids[$1]) != undefined || (p = Operator.kids[$4]) != undefined)
            if((o = o || {}).root == s || o.root == r)
              return (g)? $1 + ".apply(null, " + $4 + ")": $1 + "(" + $4 + ")";
            else if((p = p || {}).root == r || p.root == s)
              return (g)? $4 + ".apply(null, " + $1 + ")": $4 + "(" + $1 + ")"
        if(number.test($1))
          return $1 + $3 + "*" + $3 + $4;

        $1 = decompile($1).replace($2, "");
        return (g)? $1 + ".apply(null, " + compile(decompile($4).replace($5, "")) + ")": $1 + "(" + $4 + ")";
      },
      "([\\!~\\*\\/\\%\\+\\-<>\\&\\^\\|\\?\\:\\=,;\\(\\[\\{\\}]|${reserved}\\s*)\\*[\\x20\\t\\v\\u0008 ]*": function($_, $1) {
        return ignore(($1 == "function")? $_: $1 + "\bnew\b ")
      }
    };

    function run(Patterns) {
      for(var pattern in Patterns) {
        var flags = "", reg = randle(pattern, true)
        .replace(/^\*([imguy]+)/, function(e) {
          flags = e
        })
        .replace(/^\*/, function() {
          Throw(new SyntaxError(), "$1\tat <Paramour [Special RegExp Handling]>: [String -> RegExp]", "'^*' in /" + pattern + "/" + flags);
        });

        for(reg = RegExp(reg, flags), string = unhandle(string, 'Dq Sq Tq Rq DQ SQ RX QI ML SL'); (self = Patterns[pattern], self.name = pattern, self.pattern = self.regexp = reg, reg.test(string));)
          string = P(string).replace(/[\b]\$[\b]/g, "$").replace(reg, self).replace(/\$/g, "\b$\b");

        if(IG.length > 0)
          for(var x = 0, y = /IG\.(\d+)/; y.test(string); x++)
            string = string.replace(y, function(e, a) {
              return IG[+a]
            });
      }
    };

    run([patterns, _patterns_][+index || 0]);

    return string;
  }; // End of compile

  var Reel = {}, SnapShot = Paramour.SnapShot = (Paramour.SnapShot || []);
  (SnapShot = SnapShot.length < 50? SnapShot: SnapShot.slice(1, 50)).push((Reel[(new Date).getTime()] = input, Reel));
  Global.SnapShot = Paramour.SnapShot = SnapShot;

  // Options
  if(options.mini)
    input = input.replace(/\b([DE]?[MS][LU]?|VC|PN)\.\d+\b/g, "");

  input = compile(input, 0);
  Reel[(new Date).getTime()] = input;

  input = decompile(input, 'Dq Sq Tq Rq DQ SQ RX QI ML SL TP BK PR BE');
  input = compile(input, 1);
  Reel[(new Date).getTime()] = input;

  input = decompile(input);
  input = unshock(input);

  // scope independent
  input = input
    .replace(/([\&\|\?\:\=,;\(\[\{\}]\s*)\*[\x20\t\v\u0008 ]*/g, "$1new\b ")
    .replace(RegExp("(" + reserved.source + "[\\x20\\t\\v\\u0008 ]+)\\*", "g"), "$1new\b ")
    .replace(/\bfunction\s+new\b/g, "function *");

  Reel[(new Date).getTime()] = input;

  input = PN.replace(input);

  Reel[(new Date).getTime()] = input;

  // Paramour typed functions
  // Native
  for(var fn in Paramour.NativeTypeFN) {
    if(Paramour.NativeTypeFN[fn] && Paramour.NativeTypeFN[fn].constructor == Array) {
      input +=
        "\tfunction \\type-fn() {\t" +
        "  var index = 0, args = arguments, types = Types.apply(null, arguments).split(','), check = Types.check, oftype = Types.oftype;\t" +
        "\t  switch(types + '') {\t";
      for(var l = Paramour.NativeTypeFN[fn], k = /\s*([@a-zA-Z_\$][\w\$]*)\.apply\b/, i = 0, m = []; i < l.length; i++) {
        m.push([]);
        for(var j = 0; j < l[i].length; j++)
          if(k.test(l[i][j]))
            m[i].push("Spread$" + RegExp.$1),
            j++; // ["Type.apply", "*" ...]
          else
            m[i].push(l[i][j]);
      }

      for(var x = 0, y = (Paramour.NativeTypeFN[fn] = m).sort().reverse(); x < y.length; x++) {
        // HELP: console.log("NativeType:", [fn]); // :HELP
        var k, g = (function(s) {
          var t = [];
          k = s.join('_').replace(/\s+/g, "").replace(/\*/g, "Any").replace(/\.{3}/g, "Spread");
          for(var e = 0, f, i, j, h, r, d; e < s.length; e++) {
            s[e] = s[e].replace(/\bundefined\b/g, "?").replace(/\bAny\b/g, "*").replace(/\bSpread\b(?:\$([@a-zA-Z_\$][\w\$]*))?/g, "$1..."); // current type
            d = RegExp.$1 || "";
            f = !(s.length > (e + 1)); // length > next index
            i = s[e] == (d + "..."); // is a spread (no type)
            j = s.indexOf(d + "..."); // first spread (no type)
            h = s.lastIndexOf(d + "..."); // (last spread, no type)
            r = h == e; // last spread = this index
            h = h == j; // last spread = first index
            j = j > -1 && j < e; // spread is neither first, nor last

            t.push(s[e]
              .replace(/\*/, function($_) {
                return "' + types[" + (j? "index++": e) + "] + '"
              })
              .replace(/([@a-z_\$][\w\d]*)\.{3}/i, function($_, $1) {
                return "' + " + (h? f? "oftype('" + $1 + "', types.slice(index, args.length))": "oftype('" + $1 + "', types.slice(" + e + ", args.length" + (f? "": " - " + (s.length - (e + 1))) + "))": j? f? "oftype('" + $1 + "', types.slice(index++, args.length))": r? "oftype('" + $1 + "', types.slice(index++, args.length - " + (s.length - (e + 1)) + "))": "oftype('" + $1 + "', types[index++])": "oftype('" + $1 + "', types[index = " + e + "])") + " + '"
              })
              .replace(/\.{3}/, function($_) {
                return "' + " + (h? f? "types.slice(" + e + ", args.length)": "types.slice(" + e + ", index = args.length" + (f? "": " - " + (s.length - (e + 1))) + ")": j? f? "types.slice(index++, args.length)": r? "types.slice(index++, args.length - " + (s.length - (e + 1)) + ")": "types[index++]": "types[index = " + e + "]") + " + '"
              }));
          }
          return t
        })(Pull("native", fn)[x]);

        g = g.join(";").replace(/\s*;\s*/g, ";").split(";").join(",").replace(/^\s*|\s*$/g, "");
        input +=
          "    case (" + ("'" + g + "'").replace(/^''\s*\+\s*|\s*\+\s*''$/g, "") + " + ''):\t" +
          "      return " + fn.replace(/\*/, "") + "__" + k + ".apply(null, args);\t" +
          "      break;\t";
      }
      input +=
        "    default:\t" +
        "      throw TypeError('" + fn + "(' + types + ') is undefined');\t" +
        "      break;\t" +
        "  }\t" +
        "};\t";
      input = input.replace(/\\type-fn/, fn || "__").replace(/\t/g, newline);
    }
  }
  Reel[(new Date).getTime()] = input;

  // Class
  for(var Class in Paramour.ClassTypeFN) {
    for(var fn in Paramour.ClassTypeFN[Class]) {
      if(Paramour.ClassTypeFN[Class] && Paramour.ClassTypeFN[Class][fn] && Paramour.ClassTypeFN[Class][fn].constructor != Array)
        break;
      // HELP: console.log("ClassType:", [Class, fn]); // :HELP
      var locket = RegExp("(static\\?=|\\*[\\b\\s]*)?([sp])ocket\\?=" + Class + ":" + fn);
      input = input.replace(locket,
        "\\statics\\type-fn() {\t" +
        "    var index = 0, args = arguments, types = Types.apply(null, arguments).split(','), check = Types.check, oftype = Types.oftype;\t" +
        "\t    switch(types + '') {\t\\locket");
      for(var l = Paramour.ClassTypeFN[Class][fn], k = /\s*([@a-zA-Z_\$][\w\$]*)\.apply\b/, i = 0, m = []; i < l.length; i++) {
        m.push([]);
        for(var j = 0; j < l[i].length; j++)
          if(k.test(l[i][j]))
            m[i].push("Spread$" + RegExp.$1),
              j++; // ["Type.apply", "*" ...]
          else
            m[i].push(l[i][j]);
      }
      var statiks, statik = ((statiks = RegExp.$1 != undefined && RegExp.$1 != "")? ".": ".prototype."), prototype = (RegExp.$2 == "p")? Class + statik + fn + " = function\b " + (fn  || ""): (fn || "");
      statiks = (statiks && runtime.has("1.6"))? "static ": "";
      for(var x = 0, y = (Paramour.ClassTypeFN[Class][fn] = m).sort().reverse(); x < y.length; x++) {
        var k, g = (function(s) {
          var t = [];
          k = s.join('_').replace(/\s+/g, "").replace(/\*/g, "Any").replace(/\.{3}/g, "Spread");
          for(var e = 0, f, i, j, h, r, d; e < s.length; e++) {
            s[e] = s[e].replace(/\bAny\b/g, "*").replace(/\bSpread\b(?:\$([@a-zA-Z_\$][\w\$]*))?/g, "$1..."); // current type
            d = RegExp.$1 || "";
            f = !(s.length > (e + 1)); // length > next index
            i = s[e] == (d + "..."); // is a spread (no type)
            j = s.indexOf(d + "..."); // first spread (no type)
            h = s.lastIndexOf(d + "..."); // (last spread, no type)
            r = h == e; // last spread = this index
            h = h == j; // last spread = first index
            j = j > -1 && j < e; // spread is neither first, nor last

            t.push(s[e]
              .replace(/\*/, function($_) {
                return "' + types[" + (j? "index++": e) + "] + '"
              })
              .replace(/([@a-z_\$][\w\d]*)\.{3}/i, function($_, $1) {
                return "' + " + (h? f? "oftype('" + $1 + "', types.slice(index = (Types.check.index || index), args.length))": "oftype('" + $1 + "', types.slice(" + e + ", args.length" + (f? "": " - " + (s.length - (e + 1))) + "))": j? f? "oftype('" + $1 + "', types.slice(index = (Types.check.index || index) + 1, args.length))": r? "oftype('" + $1 + "', types.slice(index = (Types.check.index || index) + 1, args.length - " + (s.length - (e + 1)) + "))": "oftype('" + $1 + "', types[index++])": "oftype('" + $1 + "', types[index = " + e + "])") + " + '"
              })
              .replace(/\.{3}/, function($_) {
                return "' + " + (h? f? "types.slice(" + e + ", args.length)": "types.slice(" + e + ", index = args.length" + (f? "": " - " + (s.length - (e + 1))) + ")": j? f? "types.slice(index++, args.length)": r? "types.slice(index++, args.length - " + (s.length - (e + 1)) + ")": "types[index++]": "types[index = " + e + "]") + " + '"
              }));
          }
          return t
        })(Pull("class", Class, fn)[x]);

        g = g.join(";").replace(/\s*;\s*/g, ";").split(";").join(",").replace(/^\s*|\s*$/g, "");
        input = input.replace("\\locket",
          "      case (" + ("'" + g + "'").replace(/^''\s*\+\s*|\s*\+\s*''$/g, "") + " + ''):\t" +
          "        return " + Class + statik + fn.replace(/\*/, "") + "__" + k + ".apply(this, args);\t" +
          "        break;\t\\locket");
      }
      input = input.replace("\\locket",
        "      default:\t" +
        "        throw TypeError('" + Class + statik + fn + "(' + types + ') is undefined');\t" +
        "        break;\t" +
        "    }\t" +
        "  };\t");
      input = input.replace(/\\type-fn/, prototype).replace(/\\statics/, statiks).replace(/\t/g, newline);
    }
  }
  Reel[(new Date).getTime()] = input;

  // DS
  var q = {
    "DS\\?=(\\d+)((?:\\z|\\u0008)*\\j(?:[\\.\\w]+)?)((?:\\z|\\u0008)+\\j(?:[\\.\\w]+)?)": function($_, $1, $2, $3) {
      return "(\"" + decompile(DS[+$1]).replace(/"/g, "\\\"").split(newline.toRegExp()).join(newline.esc + "\" +" + newline.unesc + "\"") + "\").setDocString(" + $3.replace(/\s/g, "") + ");" + newline + $2 + $3
    },
    "DS\\?=(\\d+)((?:\\z|\\u0008)*\\j(?:[\\.\\w]+)?)": function($_, $1, $2) {
      return "(\"" + decompile(DS[+$1]).replace(/"/g, "\\\"").split(newline.toRegExp()).join(newline.esc + "\" +" + newline.unesc + "\"") + "\")" + ".setDocString(" + $2.replace(/\s/g, "") + ");" + newline + $2
    },
    "DS\\?=(\\d+)": function($_, $1) {
      return "(\"" + decompile(DS[+$1]).replace(/"/g, "\\\"").split(newline.toRegExp()).join(newline.esc + "\" +" + newline.unesc + "\"") + "\")"
    }
  };

  for(var o in q)
    for(var k = RegExp(randle(o, true)); (!mini) && k.test(input);)
      input = input.replace(k, q[o]);
  Paramour.DocStrings = DS;

  Reel[(new Date).getTime()] = input;

  /* End of Paramour's "Brain"
    Add-ons and other goodies
  */

  var p = {
    "get": {
      form: {
        data: function data(property) {
          var data = Global.location.search + "";
          if(!/^\?/.test(data))
            return {};
          data = data
            .replace(RegExp.$1, "")
            .replace(/\\/g, "\\\\\\")
            .replace(/(["'])/g, "\\$1");
          if(data == "")
            return {};
          data = '{"' + (
            (encodeURI(data).split("&").join('","')) || "="
          ).replace(/=/g, '":"')
            .replace(/,(\n\r?|\r\n?)+/g, ",")
            + '"}';
          return JSON.parse(decodeURI(data));
        }
      }
    },
    storage: {
      "set": function set() {
        if(undefined != Storage)
          for(var index = 0, length = arguments.length; index < length; index++)
            localStorage.setItem(arguments[index], arguments[++index]);
        else
          return !1;
        return !0;
      },
      check: function check(name) {
        return Paramour.storage.get(name) != undefined
      },
      "get": function get(name) {
        return localStorage.getItem(name)
      },
      "delete": function del(name) {
        localStorage.setItem(name, undefined);
        return !Paramour.storage.check(name)
      }
    },
    Qy: function Qy(selector, index) {
      return selector = document.querySelectorAll(selector),
        (index == undefined)? selector: selector[+index];
    },
    save: function save(name, data) {
      var location = Global.location.pathname + "";
      name = data? encodeURI(name): name;
      data = data || location.substring(location.lastIndexOf("/") + 1, location.length) + ".cache";
      return Paramour.storage.set(data, name);
    },
    load: function load(name, data) {
      var location = Global.location.pathname + "";
      name = data? encodeURI(name): name;
      name = name || location.substring(location.lastIndexOf("/") + 1, location.length) + ".cache";
      return Paramour.storage.get(name);
    },
    "delete": function del(name, data) {
      var location = Global.location.pathname + "";
      name = data? encodeURI(name): name;
      name = name || location.substring(location.lastIndexOf("/") + 1, location.length) + ".cache";
      return Paramour.storage["delete"](name);
    },
    "typeof": function type(parameter) {
      if(arguments.length > 1)
        return Paramour.typeOf.apply(null, arguments);
      var r = "";
      switch (typeof parameter) {
        case typeof Boolean():
          r = "";
          break;

        case typeof Function():
          r = "";
          break;

        case typeof Number():
          padding = "";
          break;

        case typeof Object():
          switch (e.constructor) {
            case RegExp:
              padding = "";
              break;

            case Array:
              padding = "[]";
              break;

            default:
              padding = "{}";
          }
          break;

        case typeof String():
          padding = '""';
          break;

        case typeof Symbol():
          padding = [ "(@@", ")" ];
          parameter = parameter + "";
          break;

        case "undefined":
          padding = "";
          break;

        default:
          padding = "";
      }
      return (padding[0] || "") + parameter + (padding[1] || "");
    },
    typeOf: Paramour.types,
    random: function random() {
      return Boolean(Math.round(Math.random()));
    }
  };

  /* JSUNIT functions
  e - expected
  r - recieved
  c - comment
  f - function name
  */
  JSUNIT =
  Global.JSUNIT =
  Paramour.JSUNIT = {
    assert: function assert(e, r) {
      JSUNIT.count = JSUNIT.count || 0;
      JSUNIT.log("Message: [" + e + "]\v\tat <Test " + (JSUNIT.count++) + ">" + ((r != undefined)? "\v\tassert:\v\t[" + r + "]": ""));
    },
    assertTrue: function assertTrue(r, c) {
      JSUNIT.assertEquals(true, r, c, "True");
    },
    assertFalse: function assertFalse(r, c) {
      JSUNIT.assertEquals(false, r, c, "False");
    },
    assertEquals: function assertEquals(e, r, c, f) {
      JSUNIT.count = JSUNIT.count || 0;
      if(r == e) return JSUNIT.count++;
      JSUNIT.out("Exception in assert" + (f || "Equals") + ((c != undefined? " [" + c + "]": "")) + "\v\tat <Test " + (JSUNIT.count++) + ">\v\texpected: '" + (e + "").slice(0, 12) + ((e + "").length > 12? "...": "") + "'\v\treceived: '" + (r + "").slice(0, 12) + ((r + "").length > 12? "...": "") + "'");
    },
    assertNotEquals: function assertNotEquals(e, r, c, f) {
      JSUNIT.count = JSUNIT.count || 0;
      if(r != e) return JSUNIT.count++;
      JSUNIT.out("Exception in assertNot" + (f || "Equals") + ((c != undefined? " [" + c + "]": "")) + "\v\tat <Test " + (JSUNIT.count++) + ">\v\tunexpected: '" + (e + "").slice(0, 12) + ((e + "").length > 12? "...": "") + "'");
    },
    assertNull: function assertNull(r, c) {
      JSUNIT.assertEquals(null, r, c, "Null");
    },
    assertNotNull: function assertNotNull(r, c) {
      JSUNIT.assertNotEquals(null, r, c, "Null");
    },
    assertUndefined: function assertUndefined(r, c) {
      JSUNIT.assertEquals(undefined, r, c, "Undefined");
    },
    assertNotUndefined: function assertNotUndefined(r, c) {
      JSUNIT.assertNotEquals(undefined, r, c, "Undefined");
    },
    assertNaN: function assertNaN(r, c) {
      JSUNIT.assertEquals("NaN", (r + ""), c, "NaN");
    },
    assertNotNaN: function assertNotNaN(r, c) {
      JSUNIT.assertNotEquals("NaN", (r + ""), c, "NaN");
    },
    assertFail: function assertFail(c) {
      JSUNIT.out("Exception in assertFail" + ((c != undefined? " [" + c + "]": "")) + "\v\tat <Test " + (JSUNIT.count++) + ">\v\t undefined Error");
    },
    count: 0,
    out: function out(c) {
      if(!JSUNIT.toconsole && (JSUNIT.toconsole = (JSUNIT.html = document.querySelector("#jsunit-stdout")) != null))
        JSUNIT.html.innerHTML += c
          .replace(/([\n\v]\r?|\r)\s\s/g, "<br>&nbsp;&nbsp;")
          .replace(/([\n\v]\r?|\r)/g, "<br>");
      else
        console.error(c.replace(/\v/g, newline));
    },
    log: function log(c) {
      if(!JSUNIT.toconsole && (JSUNIT.toconsole = (JSUNIT.html = document.querySelector("#jsunit-stdout")) != null))
        JSUNIT.html.innerHTML += c
          .replace(/([\n\v]\r?|\r)\s\s/g, "<br>&nbsp;&nbsp;")
          .replace(/([\n\v]\r?|\r)/g, "<br>");
      else
        console.log(c.replace(/\v/g, newline));
    },
    stderr: function stderr(c) {
      JSUNIT.out(c)
    },
    stdout: function stdout(c) {
      JSUNIT.log(c)
    },
    stdin: function stdin(c, e) {
      return prompt(c, e)
    },
    Test: {},
    prototype: {},
    toconsole: false
  };

  for(var o in p)
    Paramour[o] = p[o];

  function n(s) {
    return s
      .replace(/\btrue\b/g, "!0")
      .replace(/\bfalse\b/g, "!1")
      .replace(/\bundefined\b/g, "void 0")
      .replace(/[\b]+/g, " ")
      .replace(/\s*(\W)\s*/g, "$1");
  }

  // Options
  for(var option in options)
    if(options[option])
      switch(option) {
        case "strict":
          input = input.split(/[\b]*#BARRIER#[\b]*/);
          if(input.length > 1)
            input = input.slice(0, input.length - 1) + "(function() {" + newline + input[input.length - 1] + newline + "}).call(this);";
          else
            input = "(function() {" + newline + input.join("") + newline + "}).call(this);";
          break;
        case "embed":
          if(!miniature && !mini && !min)
            input += "\b#SEA-REPORT#\b";
          break;
        case "mini":
          input = decompile(n(unhandle(input, "DQ SQ RX QI")));
          break;
        case "deps":
          var m = "var Paramour = Paramour || {prototype: {}}, JSUNIT = JSUNIT || {prototype: {}}, Tuple = Tuple || {prototype: {}}, Types;" + newline;

          // Type Controlled Functions
          types:
          for(var p = [Paramour.NativeTypeFN, Paramour.SubTypeFN, Paramour.ClassTypeFN], i = 0, j, a; i < p.length; i++)
            for(var q in p[i])
              if(j = p[i].hasOwnProperty(q))
                break types;
          a = newline + "Types=" + n(Types.toString().replace(/function(?:\s+types\b\s*|\s*)\((.*)\)/i, "function Types($1)"))
              + ";" + newline + n(
                  "Types.check = function(a, b) {"+
                    "var c = RegExp(\"^(\\\\b\" + a + \"\\\\b,?)+$\").test(b),"+
                    "d = (c)? RegExp.$_: b.replace(RegExp(\"^(\\\\b\" + a + \"\\\\b,?)+\"), \"\").split(\",\"),"+
                    "i = Types.check.failIndex = ((c)? -1: ((b = b.split(\",\")).length - d.length));"+
                    "return Types.check.fail = ((c)? \"\": b.slice(i, b.length) + \"\"), c};"+
                  "Types.oftype = function(a,b) {"+
                    "return Types.check.index = null,"+
                    "Types.check(a, b + \"\")? b: b.slice(0, Types.check.index = Types.check.failIndex)};"
                  ) + newline;
          if(j)
            if(!strict)
              input += newline + newline + m;
            else
               input = m + "\b#BARRIER#\b" + newline + input;
          input += a;

          // DocStrings
          if(DS.length > 0)
            input += newline + n("String.prototype.setDocString = String.prototype.setDocString || function setDocString(){return this}") + ";";

          // .prototype methods
          for(var p = "String. Object. Tuple Tuple. NewLine JSUNIT Array.".split(" "),
                  q = [/(?:["'`][\s\)]*|\bString\.prototype)\.(repeat)\b/,
                       /(?:\}[\s\)]*|\bObject\.prototype)\.(assign)\b/,
                       /(?:\bTuple(?:\([\s\S]*?\))?)\.(from)\b/,
                       /(?:\bTuple(?:\([\s\S]*?\)|\.prototype))\.(constructor|every|forEach|(?:last)?indexOf|join|next|toString)\b/,
                       /(?:\bNewLine(?:\([\s\S]*?\)|\.prototype)?)\.(constructor|to(?:RegExp|String))\b/,
                       /(?:\bJSUNIT\.)(std(?:in|out|err)|log|out|toconsole|assert(?:Not)?(?:Equals|NaN|Null|Undefined|True|False)?)\b/,
                       /(?:\][\s\)]*|\bArray\.prototype)\.((?:last)?[iI]ndexOfRegExp)\b/],
                  i = 0, r, s, t = {}, u = input, v = [];
              i < p.length;
              i++)
            for((q[i] = q[i] || q[i - 1]).test(u);
                q[i].test(u) && t[r = (p[i] = p[i] || p[i - 1]).replace(".", ".prototype") + "." + RegExp.$1] == undefined;
                t[r] = true)
              u = u.replace(RegExp("\\b" + r + "\\b", "g"), "") + eval(r),
              v.push(r);

          for(var i = 0, j, k, l; i < v.length; i++)
            if((k = !/\bfunction\s+([a-zA-Z$_][\w\$]*)\s*\{\s*\[(native\scode|Command\sLine\sAPI)\]\s*\}/.test(j = eval(v[i])))
              && (l = !RegExp("(\\b" + (v[i].replace(/\./g, "\\.")) + "\\s*=[^=]\\s*)\\bfunction\\b").test(input)))
              input += newline + n(v[i] + " = " + j) + ";";

          // END options
          break;
      };

  t = function(n, b) {
    var ms = 1, sec = 1000, min = 60, hr = 60, dy = 24, yr = 365, Y = Infinity;
    for(var x = 0, y = "ms sec min hr dy yr Y".split(" "), z; x < y.length && n >= (z = eval(y[x])); x++)
      n /= z;
    return n + " " + y[x - 1];
  };

  // stop and count the clock
  clock.stop = (new Date).getTime();
  clock.span = clock.stop - clock.start;
  clock.start = new Date(clock.start);
  clock.stop = new Date(clock.stop);
  clock.span = t(clock.span, true);

  var j = input.split(newline).length, p = backup.split(RegExp["$&"]).length, J = input.length, P = backup.length, d, e, i = [], r = 0;

  function f(n) {
    return Math.round(+n)
    .toString()
    .split("")
    .reverse()
    .join("")
    .replace(/(\d{3})/g, "$1,")
    .replace(/,$/, "")
    .split("")
    .reverse()
    .join("")
  }

  function h(n, l, m) {
    for(var k = "YZEPTGMK\b".split(""), s = +n > 0? 1: -1, n = Math.abs(+n); n >= Math.pow((m = (m == true)? 1000: 1024), (l || 0) + 1) && k.length > 1; n /= m)
      k.pop();
    return ((s*n) + "").replace(/\.(\d{3}).*/, ".$1") + (k.reverse()[0]) + (m == 1000? "": "b")
  }

  function c(a, b) {
    return ["1%", "10%", "20%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "99%"][Math.round((a/b) > 1? (a/b)/100: 10 * (a/b))]
  }

  function s() {
    for(var a = arguments, b = [], c = 0, d, e; c < a.length; c++)
      b.push((d = (e = (a[c] + "").replace(/[\b]/g, "")).length) <= 12? e + " ".repeat(12 - d): e.slice(0, 9) + "..." );
    return b.join("| ").replace(/[\b]/g, "")
  }

  function w(d) {
    return d? (r++, "Paramour"): "JavaScript"
  }

  Paramour.SEA = Paramour.SEA || [];
  Paramour.SEA.push(
    Paramour.report =
    ("\t/* Paramour Self Evaluation Article (SEA)\t\t * How useful was Paramour?\t\t " +
    (d = s("Category", "Paramour", "JavaScript", "Difference", "Winner", "Ranking")) + "\t " +
    ("-".repeat(d.length)) + "\t " +
    s("Version", Paramour.version, (runtime.emu || runtime.original) + " - " + (runtime.emu == undefined? "RAW": "EMU"), "", "", Paramour.versionName) + "\t " +
    s("Lines", f(p), f(j), (e = j - p), w(e > 0), "~ " + c(p, j)) + "\t " +
    s("Characters", f(P), f(J), (e = J - P), w(e > 0), "~ " + c(P, J)) + "\t " +
    s("Size x1024", h(P), h(J), h(e = J - P), w(e > 0), (c(P, J), "  N/A")) + "\t " +
    s("Size x1000", h(P, 0, true), h(J, 0, true), h(e = J - P, 0, true), w(e > 0), (c(P, J), "  N/A")) + "\t " +
    s("Benefits", r, 4 - r, Math.abs(r - (4 - r)), w(r > 1), "~ " + c(r, 5)) + "\t " +
    s("Compile Time", clock.span) + "\t\t" +
    " " + (r > 2? "Paramour": "JavaScript") + " was ~ " + (100 - eval(c(4 - ((p/j) + (3 * (P/J))), 4) + "+100")) + "% useful\t " +

    ("=".repeat(d.length)) + "\t\t " +

    "* What was compiled?\t\t " +

    // Comments
    s("U. Literals", "Docstrings", "Multiline", "Single line", "Phantoms", "Ver. Control", "Ver. Query") + "\t " +
    s("Amount", DS.length, ML.length, SL.length, PN.length, EM.length, VC.length) + "\t " +
    s("Total", i[0] = DS.length + ML.length + SL.length + PN.length + EM.length + VC.length) + "\t " +
    ("-".repeat(d = 123)) + "\t " +

    // Non-Escapable Literals
    s("N. Literals", "Braces", "Brackets", "Parenthesis", "Tuples") + "\t " +
    s("Amount", BE.length, BK.length, PR.length, TP.length) + "\t " +
    s("Total", i[1] = BE.length + BK.length + PR.length + TP.length) + "\t " +
    ("-".repeat(d)) + "\t " +

    // Escapable Literals
    s("E. Literals", "\" Strings", "' Strings", "` Strings", "/ RegExps", "\"\"\" Strings", "''' Strings", "``` Strings", "/// RegExps") + "\t " +
    s("Amount", DQ.length, SQ.length, QI.length, RX.length, Dq.length, Sq.length, Tq.length, Rq.length) + "\t " +
    s("Total", i[2] = DQ.length + SQ.length + QI.length + RX.length + Dq.length + Sq.length + Tq.length + Rq.length) + "\t " +
    ("-".repeat(d)) + "\t " +
    s("Grand Total", eval(i.join("+")) + " items") + "\t\t */").replace(/\t/g, newline));

  // Paramour toTime
  Number.prototype.toTime = function toTime(format) {return t(this, format)}
  Paramour.toTime = function toTime(){return t.apply(null, arguments)};
  ("(Number time)/Number time - the time (in milliseconds) to be converted/\\\\ example//toTime(1234)///\\\\ returns 1.234 sec"
    .replace(/(\/+)/g, function(e) {
      return newline + ("  ").repeat(e.length)
    }).replace(/\\/g, "/"))
    .setDocString(Number.prototype.toTime)
    .setDocString(Paramour.toTime);

  // Paramour SI
  Paramour.SI = function SI(){return h.apply(null, arguments)};
  ("(Number number, Number leaps, Boolean mode)/Number number - the number to convert/Number leaps - the number of untis to suppress\\skip/Boolean mode - use 1024 (false) or 1000 (true) counting mode/\\\\ example//SI(1024)///\\\\ returns 1Kb//SI(2440)///\\\\ returns 2Kb//SI(2440, 1)///\\\\ returns 2440"
    .replace(/(\/+)/g, function(e) {
      return newline + ("  ").repeat(e.length)
    }).replace(/\\/g, "/"))
    .setDocString(Paramour.SI);

  // Paramour toTable
  Array.prototype.toTable = function toTable() {return s.apply(null, this)};
  String.prototype.toTable = function toTable(character) {return this.split(character || "|").toTable()};
  Paramour.toTable = function toTable(){return s.apply(null, arguments)};
  ("(* content...)/* content - any value to be put into the table/\\\\ note - the content must be less than 12 characters in length/\\\\ example//.toTable('abc', 'def', 'abcdefghijklmnopqrstuvwxyz')///\\\\ returns 'abc         | def         | abcdefghi...'"
    .replace(/(\/+)/g, function(e) {
      return newline + ("  ").repeat(e.length)
    }).replace(/\\/g, "/"))
    .setDocString(Array.prototype.toTable)
    .setDocString(String.prototype.toTable)
    .setDocString(Paramour.toTable);

  // Array Prototypes
  ("(RegExp pattern)\nRegExp pattern - the pattern to look for\n// example\n\n['apple', 'taco', 'dew', 'money', 'gas', 'random'].indexOfRegExp(/^(\\w{3})$/) // returns 2, for 'dew'")
  .setDocString(Array.prototype.indexOfRegExp);
  ("(RegExp pattern)\nRegExp pattern - the pattern to look for\n// example\n\n['apple', 'taco', 'dew', 'money', 'gas', 'random'].lastIndexOfRegExp(/^(\\w{3})$/) // returns 4, for 'gas'")
  .setDocString(Array.prototype.indexOfRegExp);

  // Tabs
  if(tabs)
    input = input.replace(/(^\s*)[\x20 ]{2}/g, "$1\t");

  input = unshock(input);
  input = input.replace(errors, "").replace(/[\t\v]/g, "");
  input = input.replace(/[\b]*#SEA-REPORT#[\b]*/, Paramour.report);

  Paramour.protect(Paramour, {Paramour: Paramour});

  return input;
}; // End of Paramour

// By "CoffeeScript"
Paramour.compile = function compile(run) {

  Paramour.run = function run(code, embed) {
    return Paramour(code, {embed: false});
  };

  Paramour["eval"] = function evl(code, embed) {
    return eval(Paramour(code, {embed: false}));
  };

  if(Global == undefined || Global == null) return;

  Paramour.load = function load(url, callback, options, hold) {
    var xhr = Global.ActiveXObject ? new Global.ActiveXObject('Microsoft.XMLHTTP') : new Global.XMLHttpRequest();
    hold = hold || false;
    options = options || {};
    options.sourceFiles = [url];
    xhr.open('GET', url, true);

    if('overrideMimeType' in xhr)
      xhr.overrideMimeType('text/plain');

    xhr.onreadystatechange = function onreadystatechange() {
      var sts;
      if(xhr.readyState == 4) {
        if((sts = xhr.status) == 0 || sts == 200) {
          if(!hold && !run)
            Paramour(xhr.responseText);
          else if(!hold && run)
            eval(Paramour(xhr.responseText));
        } else {
          var error = new SyntaxError();
          error.stack = error.stack.replace(/(\n\r?|\r)[\s\S]*$/, "$1\tat <Paramour>: [URL -> String]");
          error.message = "Unable to load: " + url;
          throw error
        }
        if(callback)
          return callback(xhr.responseText);
      }
    };
    return xhr.send(null);
  };

  function runScripts() {
    var paramours, types, execute, fn, index = 0, scripts;
    scripts = Global.document.getElementsByTagName('script');
    types = ['text/paramour', 'text/par'];
    paramours = (function() {
      for(var j = 0, k, r = [], s; j < scripts.length; j++)
        if(k = (s = scripts[j]).type, types.indexOf(k) > -1)
          r.push(s);
      return r;
    })();

    function execute() {
      var input = paramours[index];
      if(input != undefined && input.constructor == String) {
        eval(Paramour(input));
        index++;
        return execute();
      }
    };

    function fn(script, i) {
      var options, source, compile, input;
      options = {
        short: script.type == types[1]
      };
      source = script.src || script.getAttribute('data-src');
      input = script.value || script.innerText || script.innerHTML || "";
      if(source)
        return Paramour.load(source, function(input) {
          return paramours[i] = input, execute();
        }, options, true);
      else if(run)
        return options.sourceFiles = ['embedded'], paramours[i] = input, script.options = options, execute();
      else
        return options.sourceFiles = ['embedded'], paramours[i] = [input, options], execute();
    };

    for(var i = 0, j = 0, len = paramours.length; j < len; i = ++j)
      fn(paramours[i], i);

    return execute();
  };

  if(Global.addEventListener)
    Global.addEventListener('DOMContentLoaded', runScripts, false);
  else
    Global.attachEvent('onload', runScripts);
};

Paramour.protect = function protect() {
  for(var x = 0, y, p, n, fn; (p = arguments[x], y = x < arguments.length); x++)
    for(var o in p)
      if((p == Tuple? o != "next": true) && p.hasOwnProperty(o) && typeof (fn = p[o]) == "function")
        fn.toString = function toString() { return "function " + ((n = this.name || fn.name) || "*") + "() { " + (n || "Anonymous") + ": Protected }" };
  return !y
};