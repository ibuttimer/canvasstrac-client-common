/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .factory('queryFactory', queryFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

queryFactory.$inject = ['miscUtilFactory', 'SCHEMA_CONST', 'RESOURCE_CONST'];

function queryFactory (miscUtilFactory, SCHEMA_CONST, RESOURCE_CONST) {


  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'queryFactory',
    getQueryParam: getQueryParam,
    buildSchemaQuery: buildSchemaQuery,
    buildModelPropQuery: buildModelPropQuery,
    buildMultiValModelPropQuery: buildMultiValModelPropQuery,
    multiValToObject: multiValToObject
  };
  
  // need to return factory as end so that object prototype functions are added

  /* function implementation
    -------------------------- */

  /**
   * Create a query param string
   * @param   {string}   op    Query operation: one of RESOURCE_CONST.QUERY_*
   * @param   {string}   value Param value
   * @returns {[[Type]]} [[Description]]
   */
  function getQueryParam (op, value) {
    var query = value;
    switch (op) {
      case RESOURCE_CONST.QUERY_NE:  // inverse i.e. not equal
      case RESOURCE_CONST.QUERY_GT:  // greater than
      case RESOURCE_CONST.QUERY_LT:  // less than
      case RESOURCE_CONST.QUERY_GTE: // greater than or equal
      case RESOURCE_CONST.QUERY_LTE: // less than or equal
        if (!miscUtilFactory.isNullOrUndefined(value)) {
          query = op + value;
        }
        break;
      case RESOURCE_CONST.QUERY_BLANK: // blank
      case RESOURCE_CONST.QUERY_NBLANK:// not blank
        query = op;
        break;
    }
    return query;
  }
  
  /**
   * Generate a query object, with a multifield path e.g.'field1|field2=value'.
   * @param {function}        processFunc    Function to build query
   * @param {function|array}  forEachElement Element callback function or array of elements
   * @param {object}          thisArg        Optional, value to use as this when executing callback.
   * @returns {object}          query object
   */
  function processBuildQuery (processFunc, forEachElement, thisArg) {
    if (Array.isArray(forEachElement)) {
      // process as array
      forEachElement.forEach(processFunc, thisArg);
    } else {
      // process as function
      forEachElement(processFunc, thisArg);
    }
  }

  /**
   * Generate a query object, with a multifield path e.g.'field1|field2=value'.
   * @param {function}        processFunc    Function to build query
   * @param {function|array}  forEachElement Element callback function or array of elements
   * @param {object|function} filter         object to filter by or function to call get return values
   * @param {string}          multiJoin      Join for multi fields
   * @param {object}          thisArg        Optional, value to use as this when executing callback.
   * @returns {object}          query object
   */
  function processBuildQueryArgs (filter, multiJoin, thisArg) {
    var filterFunc,
      func;
    if (typeof filter === 'string') {
      thisArg = multiJoin;
      multiJoin = filter;
      filter = undefined;
    }
    if (typeof multiJoin !== 'string') {
      if (!miscUtilFactory.isNullOrUndefined(multiJoin)) {
        thisArg = multiJoin;
      }
      multiJoin = undefined;
    }
    if (!multiJoin) {
      multiJoin = RESOURCE_CONST.QUERY_OR_JOIN;
    }
    if (!miscUtilFactory.isNullOrUndefined(filter)) {
      if (typeof filter === 'function') {
        filterFunc = filter;  // get value from function
      } else if (typeof filter === 'object') {
        func = function (prop) {
          return this[prop];
        };
        filterFunc = func.bind(filter); // get value from filter object
      } else {
        func = function () {
          return this;
        };
        filterFunc = func.bind(filter); // value the filter
      }
    }
    return {
      filter: filterFunc,
      multiJoin: multiJoin,
      thisArg: thisArg
    };
  }

  /**
   * Generate a query object, with a multifield path e.g.'field1|field2=value'.
   * @param {function}        forEachSchemaField Schema field callback function 
   * @param {object|function} filter             object to filter by or function to call get return values
   * @param {string}          multiJoin          Join for multi fields        
   * @param {object}          thisArg        Optional, value to use as this when executing callback.
   * @returns {object}          query object
   */
  function buildSchemaQuery (forEachSchemaField, filter, multiJoin, thisArg) {
    var query = {},
      args = processBuildQueryArgs(filter, multiJoin, thisArg);
    
    if (args.filter) {
      // using the dialog fields to build an object based on the model fields
      processBuildQuery(function (fieldProp) {
          var filterVal = args.filter(fieldProp[SCHEMA_CONST.DIALOG_PROP]);

          if (!miscUtilFactory.isNullOrUndefined(filterVal)) {
            var models = fieldProp[SCHEMA_CONST.MODEL_PROP],
              field = models.join(args.multiJoin);
            query[field] = filterVal;
          }
        }, forEachSchemaField, args.thisArg);
    }
    return query;
  }

  /**
   * Generate a query object, e.g.'field=value'.
   * @param {function|array}  forEachModelPropField ModelProp callback function or array of ModelProps
   * @param {object|function} filter                object to filter by or function to call get return values
   * @param {object}          thisArg        Optional, value to use as this when executing callback.
   * @returns {object}          query object
   */
  function processBuildModelPropQuery (valSetFunc, forEachModelPropField, filter, thisArg) {
    var args = processBuildQueryArgs(filter, undefined, thisArg);
    if (args.filter) {
      // using the ModelProps to build an object based on the model fields
      processBuildQuery(function (modelProp) {
          var modelName = modelProp.modelName,
            filterVal = args.filter(modelName);

          if (!miscUtilFactory.isNullOrUndefined(filterVal)) {
            valSetFunc(modelName, filterVal);
          }
        }, forEachModelPropField, thisArg);
    }
  }

  
  /**
   * Generate a query object, e.g.'field=value'.
   * @param {function|array}  forEachModelPropField ModelProp callback function or array of ModelProps
   * @param {object|function} filter                object to filter by or function to call get return values
   * @param {object}          thisArg        Optional, value to use as this when executing callback.
   * @returns {object}          query object
   */
  function buildModelPropQuery (forEachModelPropField, filter, thisArg) {
    var query = {};
      // using the ModelProps to build an object based on the model fields
    processBuildModelPropQuery(function (modelName, filterVal) {
        query[modelName] = filterVal;
      }, forEachModelPropField, filter, thisArg);
    return query;
  }

  
  /**
   * Generate a query OR/AND/NOR object, with a multifield value e.g.'$or=field1=value1,field2=value2'.
   * @param {function}        forEachSchemaField Schema field callback function 
   * @param {object|function} filter             object to filter by or function to call get return values
   * @param {object}          thisArg        Optional, value to use as this when executing callback.
   * @returns {object}          query object
   */
  function buildMultiValModelPropQuery (key, forEachModelPropField, filter, thisArg) {
    var query = {};
      // using the ModelProps to build an object based on the model fields
    processBuildModelPropQuery(function (modelName, filterVal) {
      if (query[key]) {
        query[key] += RESOURCE_CONST.QUERY_COMMA_JOIN;
      } else {
        query[key] = '';
      }
      query[key] += modelName + RESOURCE_CONST.QUERY_EQ + filterVal;
      }, forEachModelPropField, filter, thisArg);
    return query;
  }

  /**
   * Convert a multi-value string to an object
   * @param   {string} multiVal   String to convert
   * @param   {string} multiJoin  Join character for values
   * @param   {string} keyvalJoin Join character to key/value pairs
   * @returns {object} Object with key/value properties
   */
  function multiValToObject (multiVal, multiJoin, keyvalJoin) {
    var obj = {},
      values = multiVal.split(multiJoin);
    if (values.length) {
      values.forEach(function (value) {
        var keyVal = value.split(keyvalJoin);
        switch (keyVal.length) {
          case 1:
            obj[keyVal[0]] = undefined;
            /* fall through */
          case 0:
            break;
          default:
            obj[keyVal[0]] = keyVal.slice(1).join(keyvalJoin);
            break;
        }
      });
    }
    return obj;
  }

  // need the return here so that object prototype functions are added
  return factory;
}



