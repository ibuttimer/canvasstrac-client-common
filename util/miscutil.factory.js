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
    isObject: isObject,
    isNullOrUndefined: isNullOrUndefined,
    readSafe: readSafe,
    toArray: toArray,
    findArrayIndex: findArrayIndex,

    listForEach: listForEach,
    listFind: listFind,

    initSelected: initSelected,
    selectAll: selectAll,
    setSelected: setSelected,
    getSelectedList: getSelectedList,
    countSelected: countSelected,
    toggleSelection: toggleSelection,
    findSelected: findSelected,
    findUnselected: findUnselected,
    addSelectionCmds: addSelectionCmds,
    SET_SEL: 's',
    CLR_SEL: 'c',
    TOGGLE_SEL: 't',
    
    toInteger: toInteger,
    call: call,
    arrayToMap: arrayToMap
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
  function isEmpty(object) {
    var empty = true;
    if (!isNullOrUndefined(object)) {
      if (Object.getOwnPropertyNames(object).length > 0) {
        empty = false;
      }
    }
    return empty;
  }

  /**
   * Check if argument is an object
   * @param   {object}  object object to test
   * @returns {boolean} true if object is empty
   */
  function isObject(object) {
    return (angular.isObject(object) && !angular.isArray(object));
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
    if (object && angular.isArray(path)) {
      for (var i = 0, ll = path.length; (i < ll) && !isNullOrUndefined(read); ++i) {
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
    var n = toInteger(start),
      length = array.length >>> 0;

    for (var i = n; i < length; i++) {
      if (predicate(array[i], i, array)) {
        return i;
      }
    }
    return undefined;
  }

  /**
   * Initialise the 'selected' property of all objects in an array
   * @param {Array|ResourceList} list     ResourceList or Array of objects to initialise
   * @param {function} callback Optional function to call with each element
   */
  function initSelected(list, callback) {
    return setSelected(list, factory.CLR_SEL, callback);
  }
  
  /**
   * Set the 'selected' property of all objects in an array
   * @param {Array|ResourceList} list     ResourceList or Array of objects to set
   * @param {function} callback Optional function to call with each element
   */
  function selectAll(list, callback) {
    return setSelected(list, factory.SET_SEL, callback);
  }

  /**
   * Set the 'selected' state of all the entries in the array
   * @param {Array|ResourceList} list     ResourceList or Array of objects to set
   * @param {boolean}  set      Value to set; one of factory.SET_SEL, factory.CLR_SEL or factory.TOGGLE_SEL
   * @param {function} callback Optional function to call with each element
   */
  function setSelected(list, set, callback) {
    var selCount = 0;
    if (list) {
      var forceSet = (set === factory.SET_SEL),
        forceClr = (set === factory.CLR_SEL),
        toggle = (set === factory.TOGGLE_SEL);
      if (forceSet || forceClr || toggle) {

        listForEach(list, function (entry) {
          if (forceSet || (toggle && !entry.isSelected)) {
            entry.isSelected = true;
          } else if (entry.isSelected) {
            delete entry.isSelected;
          }
          if (entry.isSelected) {
            ++selCount;
          }
          if (callback) {
            callback(entry);
          }
        });
      }
    }
    return selCount;
  }

  /**
   * Return an array of 'selected' entries 
   * @param {Array|ResourceList} list ResourceList or Array of objects to extract selected items from
   * @param {function}           func Function to apply to each selected entry
   * @returns {Array}              Array of selected items
   */
  function getSelectedList(list, func) {
    var selectedList = [];

    listForEach(list, function (entry) {
      if (entry.isSelected) {
        if (func) {
          selectedList.push(func(entry));
        } else {
          selectedList.push(entry);
        }
      }
    });

    return selectedList;
  }

  /**
   * Process each entry in the list
   * @param {Array|ResourceList} list     ResourceList or Array of objects to count selected items from
   * @param {function} func   Function to process entry with
   */
  function listForEach (list, func) {
    if (list.isResourceList) {
      // process as ResourceList
      list.forEachInList(function (entry) {
        func(entry);
      });
    } else {
      // process as array
      angular.forEach(list, function (entry) {
        func(entry);
      });
    }
  }

  
  /**
   * Return number of 'selected' entries
   * @param {Array|ResourceList} list     ResourceList or Array of objects to count selected items from
   * @returns {number} Number of selected items
   */
  function countSelected(list) {
    var count = 0;

    listForEach(list, function (entry) {
      if (entry.isSelected) {
        ++count;
      }
    });
    return count;
  }

  /**
   * Find the first selected entry in the list
   * @param {Array|ResourceList} list     ResourceList or Array of objects to search
   * @param {number}   start     offset to start from
   */
  function findSelected(list, start) {
    return listFind(list, function (entry) {
      return entry.isSelected;
    }, start);
  }


  /**
   * Find the first unselected entry in the list
   * @param {Array|ResourceList} list     ResourceList or Array of objects to search
   * @param {number}   start     offset to start from
   */
  function findUnselected(list, start) {
    return listFind(list, function (entry) {
      return !entry.isSelected;
    }, start);
  }


  /**
   * Find an entry in the list
   * @param {Array|ResourceList} list     ResourceList or Array of objects to count selected items from
   * @param {function} func   function to test entries in list
   * @param {number}   start     offset to start from
   */
  function listFind(list, func, start) {
    var item;
    if (list.isResourceList) {
      // process as ResourceList
      item = list.findInList(function (entry) {
        return func(entry);
      }, start);
    } else {
      // process as array
      // If argument start was passed let n be ToInteger(start); else let n be 0.
      var n = toInteger(start),
        length = list.length >>> 0,
        value;

      for (var i = n; i < length; i++) {
        value = list[i];
        if (func(value)) {
          item = value;
          break;
        }
      }
    }
    return item;
  }


  /**
   * Toggle an object's 'selected' state
   * @param   {object} entry Object to toggle state of
   * @param   {number} count Current selected count
   * @returns {number} Updated selected count
   */
  function toggleSelection (entry, count) {
    if (count === undefined) {
      count = 0;
    }
    if (!entry.isSelected) {
      entry.isSelected = true;
      count += 1;
    } else {
      entry.isSelected = false;
      count -= 1;
    }
    return count;
  }
  
  /**
   * Convenience methos to add selection commands to a scope
   * @param {object} scope Scope to add commands to
   */
  function addSelectionCmds (scope) {
    scope.SET_SEL = factory.SET_SEL;
    scope.CLR_SEL = factory.CLR_SEL;
    scope.TOGGLE_SEL = factory.TOGGLE_SEL;
  }

  /**
   * Get the toInteger value 
   * @param   {number} value Value to convert
   * @returns {number} integer value
   */
  function toInteger (value) {
    // If argument value was passed let n be ToInteger(value); else let n be 0.
    var n = +value /* unary plus */ || 0;
    if (Math.abs(n) === Infinity) {
      n = 0;
    }
    return n;
  }

  /**
   * Safely call a function
   * @param {function} func Numction to call
   */
  function call(func) {
    if (typeof func === 'function') {
      var args;
      if (arguments.length > 1) {
        args = Array.prototype.slice.call(arguments, 1);
      }
      func.apply(null, args);
    }
  }

  /**
   * Create an object with propertry names being the value of the specified property,
   * and values being the corresponding array object
   * @param {array} array Array to convert
   * @param {string} prop Name of property to use as key
   * @return {object} object mapping property values to array objects
   */
  function arrayToMap(array, prop) {
    var map = {},
      forEach;

    if (array.isResourceList) {
      forEach = 'forEachInList';  // resource list forEach function
    } else {
      forEach = 'forEach';     // Array forEachfunction
    }
    array[forEach](function (entry) {
      if (entry.hasOwnProperty(prop)) {
        if (map.hasOwnProperty(entry[prop])) {
          throw new Error('Map already has property ' + entry[prop]);
        } else {
          map[entry[prop]] = entry;
        }
      } else {
        throw new Error('Entry missing property ' + prop);
      }
    });
    return map;
  }


}
