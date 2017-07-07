/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .factory('compareFactory', compareFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

compareFactory.$inject = ['$injector', 'consoleService', 'miscUtilFactory', 'SCHEMA_CONST'];

function compareFactory ($injector, consoleService, miscUtilFactory, SCHEMA_CONST) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'compareFactory',
    newComparinator: newComparinator,
    compareIndices: compareIndices,
    compareStrings: compareStrings,
    compareBoolean: compareBoolean,
    compareDate: compareDate,
    compareStringFields: compareStringFields,
    compareNumberFields: compareNumberFields,
    compareBooleanFields: compareBooleanFields,
    compareDateFields: compareDateFields,
    compareTypeFields: compareTypeFields,
    compareFields: compareFields
  };
  
  /* function implementation
    -------------------------- */

  /**
   * Create a new Comparinator object
   * Compare objects based on schema fields that have numeric values
   * @param {object} schema Schema object
   * @param {number} index  Index of Schema field to use
   * @param {string} type   Type of fiels, @see SCHEMA_CONST.FIELD_TYPES
   * @returns {object} new Comparinator object
   */
  function newComparinator (schema, index, type) {
    if (!schema) {
      throw new Error('Missing argument: schema');
    }
    if (!index) {
      if (typeof index === 'undefined') {
        throw new Error('Missing argument: index');
      }
    }
    return $injector.instantiate(Comparinator, {
      schema: schema, index: index, type: type
    });
  }
  
  /**
   * Compare object's using 'index' property
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareIndices (a, b) {
    return (a.index - b.index);
  }

  /**
   * Compare items
   * @param {string}  a   First item to compare
   * @param {string}  b   Second item to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function basicCompare (a, b) {
    var aNa = miscUtilFactory.isNullOrUndefined(a),
      bNa = miscUtilFactory.isNullOrUndefined(b),
      result = 0; // no diff by default
    if (aNa && !bNa) {
      result = -1;  // null/undefined before value
    } else if (!aNa && bNa) {
      result = 1;  // null/undefined before value
    } else if (a < b) {
      result = -1;
    } else if (a > b) {
      result = 1;
    }
    return result;
  }

  /**
   * Compare strings
   * @param {string}  a   First string to compare
   * @param {string}  b   Second string to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareStrings (a, b) {
    return basicCompare(a, b);
  }

  /**
   * Compare boolean, i.e. false before true
   * @param {boolean}  a   First boolean to compare
   * @param {boolean}  b   Second boolean to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareBoolean (a, b) {
    if (!a && b) {
      return -1;
    }
    if (a && !b) {
      return 1;
    }
    return 0;
  }

  /**
   * Convert to date
   * @param {string} value Date string to convert
   * @returns {object}  Date object
   */
  function toDate (value) {
    if (!angular.isDate(value)) {
      value = new Date(value);
    }
    return value;
  }

  /**
   * Compare dates
   * @param {object|string} a     First date/date string to compare
   * @param {object|string} b     Second date/date string to compare
   * @param {string}        order '+' ascending sort (default) i.e. older dates first
   *                              or '-' descending sort i.e. newer dates first
   * @returns {number}        < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareDate (a, b, order) {
    var timeA = toDate(a).getTime(),
      timeB = toDate(b).getTime(),
      result;
    if (isFinite(timeA) && isFinite(timeB)) {
      result = timeA - timeB; // default, ascending result
      if (order === '-') {
        result = -result;
      }
    } else {
      // valid time before invalid
      if (timeA === timeB) {
        result = 0;
      } else if (isFinite(timeA)) {
        result = -1;
      } else {
        result = 1;
      }
    }
    return result;
  }

  /**
   * Compare object properties to compare
   * @param {object}       obj    Object to get property from 
   * @param {string|Array} path   path to property
   * @param {model}        model  name of property
   * @returns {object|string|number}  object property
   */
  function getCompareItem (obj, path, model) {
    var item = obj;
    if (path) {
      for (var i = 0; !miscUtilFactory.isNullOrUndefined(item) && (i < path.length); ++i) {
        item = item[path[i]];
      }
    }
    if (!miscUtilFactory.isNullOrUndefined(item)) {
      item = item[model];
    }
    return item;
  }

  /**
   * Compare objects based on schema fields that have string values
   * @param {object}  schema  Schema object
   * @param {number}  index   Index of Schema field to use
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareStringFields (schema, index, a, b) {
    var result = 0,
      path = schema.getField(index, SCHEMA_CONST.PATH_PROP),
      array = schema.getField(index, SCHEMA_CONST.MODEL_PROP);
    for (var j = 0; (j < array.length) && (result === 0) ; ++j) {
      result = compareStrings(
        getCompareItem(a, path, array[j]), 
        getCompareItem(b, path, array[j]));
    }
    return result;
  }

  /**
   * Compare objects based on schema fields that have numeric values
   * @param {object}  schema  Schema object
   * @param {number}  index   Index of Schema field to use
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareNumberFields (schema, index, a, b) {
    var result = 0,
      array = schema.getField(index, SCHEMA_CONST.MODEL_PROP);
    for (var j = 0; (j < array.length) && (result === 0) ; ++j) {
      result = a[array[j]] - b[array[j]];
    }
    return result;
  }

  /**
   * Compare objects based on schema fields that have boolean values
   * @param {object}  schema  Schema object
   * @param {number}  index   Index of Schema field to use
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareBooleanFields (schema, index, a, b) {
    var result = 0,
      array = schema.getField(index, SCHEMA_CONST.MODEL_PROP);
    for (var j = 0; (j < array.length) && (result === 0); ++j) {
      result = compareBoolean(a[array[j]], b[array[j]]);
    }
    return result;
  }

  /**
   * Compare objects based on schema fields that have date values
   * @param {object}  schema  Schema object
   * @param {number}  index   Index of Schema field to use
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareDateFields (schema, index, a, b) {
    var result = 0,
      array = schema.getField(index, SCHEMA_CONST.MODEL_PROP);
    for (var j = 0; (j < array.length) && (result === 0); ++j) {
      result = compareDate(a[array[j]], b[array[j]]);
    }
    return result;
  }

  /**
   * Compare objects based on schema fields
   * @param {object} schema Schema object
   * @param {number} index  Index of Schema field to use
   * @param {string} type   Type of field, @see SCHEMA_CONST.FIELD_TYPES
   * @param {object} a      First object to compare
   * @param {object} b      Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareTypeFields (schema, index, type, a, b) {
    var result = 0;
    switch (type) {
      case SCHEMA_CONST.FIELD_TYPES.STRING:
        result = compareStringFields(schema, index, a, b);
        break;
      case SCHEMA_CONST.FIELD_TYPES.DATE:
        result = compareDateFields(schema, index, a, b);
        break;
      case SCHEMA_CONST.FIELD_TYPES.BOOLEAN:
        result = compareBooleanFields(schema, index, a, b);
        break;
      case SCHEMA_CONST.FIELD_TYPES.NUMBER:
        result = compareNumberFields(schema, index, a, b);
        break;
    }
    return result;
  }

  /**
   * Compare objects based on schema fields
   * @param {object} schema Schema object
   * @param {number} index  Index of Schema field to use
   * @param {object} a      First object to compare
   * @param {object} b      Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareFields (schema, index, a, b) {
    return compareTypeFields(schema, index, 
                schema.getField(index, SCHEMA_CONST.TYPE_PROP), a, b);
  }



  /**
   * Configurable object to compare schema fields
   * @param {object} schema   Schema object
   * @param {number} index    Index of Schema field to use
   * @param {string} type     Type of fiels, @see SCHEMA_CONST.FIELD_TYPES
   */
  function Comparinator (SCHEMA_CONST, schema, index, type) {
    this.schema = schema;
    this.index = index;
    this.type = type;

  }

  Comparinator.$inject = ['SCHEMA_CONST', 'schema', 'index', 'type'];

  /**
   * Compare objects based on schema fields that have string values
   * @param {object} a First object to compare
   * @param {object} b Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  Comparinator.prototype.compareStringFields = function (a, b) {
    return compareStringFields(this.schema, this.index, a, b);
  };

  /**
   * Compare objects based on schema fields that have numeric values
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  Comparinator.prototype.compareNumberFields = function (a, b) {
    return compareNumberFields(this.schema, this.index, a, b);
  };

  /**
   * Compare objects based on schema fields that have boolean values
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  Comparinator.prototype.compareBooleanFields = function (a, b) {
    return compareBooleanFields(this.schema, this.index, a, b);
  };

  /**
   * Compare objects based on schema fields that have date values
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  Comparinator.prototype.compareDateFields = function (a, b) {
    return compareDateFields(this.schema, this.index, a, b);
  };

  /**
   * Compare objects based on schema fields
   * @param {object} a      First object to compare
   * @param {object} b      Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  Comparinator.prototype.compareFields = function (a, b) {
    return compareFields(this.schema, this.index, a, b);
  };

  // need the return here so that object prototype functions are added
  return factory;
}


