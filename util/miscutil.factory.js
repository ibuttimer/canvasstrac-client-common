/*jslint node: true */
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
    isEmpty: isEmpty,
    toArray: toArray,
    arrayPolyfill: arrayPolyfill
  };
  
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Copy properties from one object to another
   * @param {object}   from Object to copy from
   * @param {object [Description]]
   * @param {[[Type]]} list [[Description]]
   */
  function copyProperties(from, to, list) {
    if (from) {
      if (!list) {
        list = Object.getOwnPropertyNames(from);
      }
      angular.forEach(list, function(prop) {
        to[prop] = from[prop];
      });
    }
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
//        'use strict';
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
//        'use strict';
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
  }

  
}
