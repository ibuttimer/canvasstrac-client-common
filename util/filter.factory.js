/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .factory('filterFactory', filterFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

filterFactory.$inject = ['$filter', '$injector', 'consoleService', 'SCHEMA_CONST'];

function filterFactory ($filter, $injector, consoleService, SCHEMA_CONST) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'filterFactory',
    newResourceFilter: newResourceFilter,
    getFilteredList: getFilteredList
  };
  
//  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Create a new ResourceFilter object
   * @param   {object} schema Schema object for which filter will be used
   * @param   {object} base   Base object to filter by
   * @returns {object} new ResourceFilter object
   */
  function newResourceFilter (schema, base) {
    return $injector.instantiate(ResourceFilter, {schema: schema, base: base});
  }

  /**
   * Generate a filtered list
   * @param {string}   filterName Name of filter to apply
   * @param {object}   reslist    ResourceList object to filter
   * @param {object}   filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}    filtered list
   */
  function getFilteredList (filterName, reslist, filter, xtraFilter) {
    var output = $filter(filterName)(reslist.list, reslist.filter.schema, filter);
    if (output && xtraFilter) {
      var input = output;
      output = [];
      input.forEach(function (element) {
        if (xtraFilter(element)) {
          output.push(element);
        }
      });
    }
    return output;
  }

  /**
   * Filter for a ResourceList object
   * @param   {object} schema Schema object for which filter will be used
   * @param   {object} base   Base object to filter by
   */
  function ResourceFilter (SCHEMA_CONST, schema, base) {
    this.schema = schema; // keep a ref to field array
    this.filterBy = {};

    if (base) {
      // filter utilises dialog fields
      var newfilterBy = {};
      this.schema.forEachField(function (idx, fieldProp) {
        var filterVal = base[fieldProp[SCHEMA_CONST.DIALOG_PROP]];
        if (filterVal) {
          newfilterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]] = filterVal;
        }
      });
      this.filterBy = newfilterBy;
    }
  }

  /**
   * toString method for a filter for a ResourceList object
   * @param   {string} prefix Prefix dtring
   * @returns {string} string representation
   */
  ResourceFilter.prototype.toString = function (prefix) {
    var str,
      filterBy = this.filterBy;
    if (!prefix) {
      str = '';
    } else {
      str = prefix;
    }
    this.schema.forEachField(function (idx, fieldProp) {
      var filterVal = filterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]];
      if (filterVal) {
        if (str.length > 0) {
          str += '\n';
        }
        str += fieldProp[SCHEMA_CONST.MODEL_PROP] + ': ' + filterVal;
      }
    });
    if (str.length === 0) {
      str = 'No filter';
    }
    return str;
  };

  // need the return here so that object prototype functions are added
  return factory;

}



