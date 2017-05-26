/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .filter('filterBlank', ['SCHEMA_CONST', function (SCHEMA_CONST) {

    function filterBlankFilter (input, schema) {
      
      // filter out blank entries
      var out = [];

      angular.forEach(input, function (obj) {
        
        schema.forEachField(function(idx, fieldProp) {
          var empty = true,
            model = fieldProp[SCHEMA_CONST.MODEL_PROP];
          for (var j = 0; empty && (j < model.length); ++j) {
            var objVal = obj[model[j]];
            if (objVal) {
              empty = false;
            }
          }
          if (!empty) {
            out.push(obj);
          }
          return empty;
        });
      });

      return out;
    }

    return filterBlankFilter;
  }])

  .filter('filterMisc', [function () {

    function filterMiscFilter (input, filter) {

      // filter out blank entries
      var out = [];

      angular.forEach(input, function (obj) {
        if (filter(obj)) {
          out.push(obj);
        }
      });

      return out;
    }

    return filterMiscFilter;
  }])

  .factory('filterFactory', filterFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

filterFactory.$inject = ['$filter', '$injector', 'miscUtilFactory', 'consoleService', 'SCHEMA_CONST'];

function filterFactory ($filter, $injector, miscUtilFactory, consoleService, SCHEMA_CONST) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'filterFactory',
    newResourceFilter: newResourceFilter,
    getFilteredArray: getFilteredArray,
    getFilteredList: getFilteredList
  };
  
//  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Create a new ResourceFilter object
   * @param   {object}  schema     Schema object for which filter will be used
   * @param   {object}  base       Base object to filter by
   * @param   {boolean} allowBlank Allow blank entries 
   * @returns {object}  new ResourceFilter object
   */
  function newResourceFilter (schema, base, allowBlank) {
    return $injector.instantiate(ResourceFilter, {
      schema: schema, base: base, allowBlank: allowBlank
    });
  }

  /**
   * Filter an array
   * @param {string}   filterName Name of filter to apply
   * @param {Array}    list       Array object to filter
   * @param {boolean}  allowBlank Allow blanks flag
   * @param {object}   schema     Schema object to use
   * @param {object}   filter     Filter object to use (not ResourceFilter)
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}    filtered list
   */
  function getFilteredArray (filterName, list, allowBlank, schema, filter, xtraFilter) {
    var output = list;

    if (!allowBlank) {
      // remove blanks if necessary
      if (schema) {
        output = $filter('filterBlank')(output, schema);
      } else {
        output = $filter('filterMisc')(output, function (obj) {
          return !miscUtilFactory.isEmpty(obj);
        });
      }
    }
    // apply filter
    if (output.length) {
      output = $filter(filterName)(output, schema, filter);
    }
    if (output.length && xtraFilter) {
      // apply extra filter if necessary
      output = $filter('filterMisc')(output, xtraFilter);
    }
    return output;
  }

  /**
   * Generate a filtered list
   * @param {string}   filterName Name of filter to apply
   * @param {object}   reslist    ResourceList object to filter
   * @param {object}   filter     Filter object to use (not ResourceFilter)
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}    filtered list
   */
  function getFilteredList (filterName, reslist, filter, xtraFilter) {
    return getFilteredArray(filterName, reslist.list, reslist.filter.allowBlank, reslist.filter.schema, filter, xtraFilter);
  }

  /**
   * Filter for a ResourceList object
   * @param {object}  schema     Schema object for which filter will be used
   * @param {object}  base       Base object to filter by
   * @param {boolean} allowBlank Allow blank entries 
   */
  function ResourceFilter (SCHEMA_CONST, schema, base, allowBlank) {
    this.schema = schema; // keep a ref to field array
    this.filterBy = {};
    this.lastFilter = undefined;  // last filter used
    if (miscUtilFactory.isNullOrUndefined(allowBlank)) {
      this.allowBlank = true;
    } else {
      this.allowBlank = allowBlank;
    }

    if (base) {
      // filter utilises dialog fields
      this.schema.forEachField(function (idx, fieldProp) {
        var filterVal = base[fieldProp[SCHEMA_CONST.DIALOG_PROP]];
        if (filterVal) {
          this.filterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]] = filterVal;
        }
      }, this);
    }
  }

  ResourceFilter.$inject = ['SCHEMA_CONST', 'schema', 'base', 'allowBlank'];

  /**
   * toString method for a filter for a ResourceList object
   * @param   {string} prefix Prefix dtring
   * @returns {string} string representation
   */
  ResourceFilter.prototype.toString = function (prefix) {
    var str,
      filterBy = (this.lastFilter ? this.lastFilter : this.filterBy);
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



