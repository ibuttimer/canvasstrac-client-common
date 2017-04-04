/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .factory('miscUtilFactory', miscUtilFactory);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

miscUtilFactory.$inject = [];

function miscUtilFactory () {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    copyProperties: copyProperties,
    copyAndAddProperties: copyAndAddProperties,
    removeProperties: removeProperties,
    isEmpty: isEmpty,
    isNullOrUndefined: isNullOrUndefined,
    readSafe: readSafe,
    toArray: toArray,
    findArrayIndex: findArrayIndex,
    arrayPolyfill: arrayPolyfill
  };
  
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Copy properties from one object to another
   * @param {object}  from  Object to copy from
   * @param {object   to    Object to copy to
   * @param {Array}   list  list of properties to copy, or all if omitted
   * @return {object} updated to object
   */
  function copyProperties (from, to, list) {
    if (from) {
      if (!list) {
        list = Object.getOwnPropertyNames(from);
      }
      angular.forEach(list, function (prop) {
        to[prop] = from[prop];
      });
    }
    return to;
  }

  /**
   * Create a copy of an object and add additional properties from another object
   * @param {object}  from    Object to copy
   * @param {object   add     Object to add properties from
   * @param {Array}   list    list of properties to copy from 'add', or all if omitted
   * @return {object} new object
   */
  function copyAndAddProperties (from, add, list) {
    var to;
    if (from) {
      to = angular.copy(from);
    } else {
      to = {};
    }
    copyProperties(add, to, list);
    return to;
  }

  /**
   * Remove properties from an object
   * @param {object}  from  Object to remove from
   * @param {Array}   list  list of properties to remove, or all if omitted
   * @return {object} updated to object
   */
  function removeProperties (from, list) {
    if (from) {
      if (!list) {
        list = Object.getOwnPropertyNames(from);
      }
      angular.forEach(list, function (prop) {
        delete from[prop];
      });
    }
    return from;
  }

  /**
   * Check if an object is empty
   * @param   {object}  object object to test
   * @returns {boolean} true if object is empty
   */
  function isEmpty (object) {
    var empty = true;
    if (object) {
      if (Object.getOwnPropertyNames(object).length > 0) {
        empty = false;
      }
    } 
    return empty;
  }
  
  /**
   * Check if an object is null or undefined
   * @param   {object}  object object to test
   * @returns {boolean} true if object is null or undefined
   */
  function isNullOrUndefined (object) {
    return ((object === null) || (object === undefined));
  }
  
  /**
   * Return object as an array
   * @param   {object} input object to array-ify
   * @returns {array}   object if already an array, or new array containing object
   */
  function toArray (input) {
    var array;
    if (!Array.isArray(input)) {
      array = [input];
    } else {
      array = input;
    }
    return array;
  }
  
  /**
   * Read a property from a multi-layered object without a read error if a layer is undefined
   * @param   {object}   object Object to read from
   * @param   {Array}    path   property name on path to required value
   * @returns property value or undefined if can't read it
   */
  function readSafe (object, path) {
    var read = object;
    if (object && path) {
      for (var i = 0; (i < path.length) && !isNullOrUndefined(read); ++i) {
        read = read[path[i]];
      }
    }
    return read;
  }

  /**
   * Find the index of an entry in an array using the callback function to test each of the entries 
   * @param {array}    array     array to search
   * @param {function} predicate function to test entries in array
   * @param {number}   start     offset to start from
   */
  function findArrayIndex (array, predicate, start) {

    if (!Array.isArray(array)) {
      throw new TypeError('array must be an array');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    // If argument start was passed let n be ToInteger(start); else let n be 0.
    var n = +start || 0;
    if (Math.abs(n) === Infinity) {
      n = 0;
    }

    var length = array.length >>> 0;

    for (var i = n; i < length; i++) {
      if (predicate(array[i], i, array)) {
        return i;
      }
    }
    return undefined;
  }

  
  /**
   * Provides polyfill implementations of some Array functions
   * @throws {TypeError} [[Description]]
   * @returns {[[Type]]} [[Description]]
   */
  function arrayPolyfill () {
    // only implement if no native implementation is available
    // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
    if (typeof Array.isArray === 'undefined') {
      Array.isArray = function (obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
      };
    }
    // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    if (!Array.prototype.find) {
      Array.prototype.find = function(predicate) {
        //'use strict';
        if (this === null) {
          throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
          value = list[i];
          if (predicate.call(thisArg, value, i, list)) {
            return value;
          }
        }
        return undefined;
      };
    }
    // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
    if (!Array.prototype.findIndex) {
      Array.prototype.findIndex = function(predicate) {
        //'use strict';
        if (this === null) {
          throw new TypeError('Array.prototype.findIndex called on null or undefined');
        }
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
          value = list[i];
          if (predicate.call(thisArg, value, i, list)) {
            return i;
          }
        }
        return -1;
      };
    }
    // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
    if (!Array.prototype.filter) {
      Array.prototype.filter = function(fun/*, thisArg*/) {
        //'use strict';
        if (this === void 0 || this === null) {
          throw new TypeError();
        }

        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== 'function') {
          throw new TypeError();
        }

        var res = [];
        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        for (var i = 0; i < len; i++) {
          if (i in t) {
            var val = t[i];

            // NOTE: Technically this should Object.defineProperty at
            //       the next index, as push can be affected by
            //       properties on Object.prototype and Array.prototype.
            //       But that method's new, and collisions should be
            //       rare, so use the more-compatible alternative.
            if (fun.call(thisArg, val, i, t)) {
              res.push(val);
            }
          }
        }

        return res;
      };
    }
    // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fill
    if (!Array.prototype.fill) {
      Array.prototype.fill = function(value) {

        // Steps 1-2.
        if (this === null) {
          throw new TypeError('this is null or not defined');
        }

        var O = Object(this);

        // Steps 3-5.
        var len = O.length >>> 0;

        // Steps 6-7.
        var start = arguments[1];
        var relativeStart = start >> 0;

        // Step 8.
        var k = relativeStart < 0 ?
          Math.max(len + relativeStart, 0) :
          Math.min(relativeStart, len);

        // Steps 9-10.
        var end = arguments[2];
        var relativeEnd = end === undefined ?
          len : end >> 0;

        // Step 11.
        var final = relativeEnd < 0 ?
          Math.max(len + relativeEnd, 0) :
          Math.min(relativeEnd, len);

        // Step 12.
        while (k < final) {
          O[k] = value;
          k++;
        }

        // Step 13.
        return O;
      };
    }
  }

  
}
