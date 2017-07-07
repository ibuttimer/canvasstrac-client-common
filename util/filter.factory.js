/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .filter('filterBlank', ['SCHEMA_CONST', function (SCHEMA_CONST) {

    function filterBlankFilter (input, schema) {
      
      // filter out blank entries
      var out = [];

      angular.forEach(input, function (obj) {
        
        schema.forEachField(function(fieldProp) {
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

  .filter('filterSchema', ['miscUtilFactory', 'SCHEMA_CONST', 'RESOURCE_CONST', function (miscUtilFactory, SCHEMA_CONST, RESOURCE_CONST) {

    function filterSchemaFilter (input, schema, filterBy, type) {

    var out = [];

    if (!miscUtilFactory.isEmpty(filterBy)) {
      var testCnt = 0,  // num of fields to test as speced by filter
        testedCnt,      // num of fields tested
        matchCnt,       // num of fields matching filter
        continueNext;   // continue to process schema fields flag
      schema.forEachField(function(schemaField) {
        if (filterBy[schemaField[SCHEMA_CONST.DIALOG_PROP]]) {  // filter uses dialog properties
          ++testCnt;
        }
      });
      angular.forEach(input, function (element) {
        matchCnt = 0;
        testedCnt = 0;
        continueNext = true;
        schema.forEachField(function(schemaField) {
          var filterVal = filterBy[schemaField[SCHEMA_CONST.DIALOG_PROP]],  // filter uses dialog properties
            filterTransform = schemaField[SCHEMA_CONST.TRANSFORM_PROP],
            filterTest = schemaField[SCHEMA_CONST.TEST_PROP],
            refSchema = schemaField[SCHEMA_CONST.REF_SCHEMA_PROP],
            refField = schemaField[SCHEMA_CONST.REF_FIELD_PROP],
            addToOut = false;

          if (filterVal) {
            var elementObj = miscUtilFactory.readSafe(element, schemaField[SCHEMA_CONST.PATH_PROP]);
            if (elementObj) {
              if (filterTransform) {
                // transform filter value
                filterVal = filterTransform(filterVal);
              }

              // apply OR logic to multiple model fields
              var match = false,
                model = schemaField[SCHEMA_CONST.MODEL_PROP];
              for (var j = 0; !match && (j < model.length); ++j) {
                var elementVal = elementObj[model[j]];

                if (refSchema && (refField >= 0)) {
                  // read actual value to compare from embedded doc
                  var modelName = refSchema.SCHEMA.getModelName(refField);
                  if (modelName) {
                    elementVal = elementVal[modelName];
                  }
                }

                if (elementVal) {
                  if (filterTransform) {
                    // transform filter value
                    elementVal = filterTransform(elementVal);
                  }
                  if (filterTest) {
                    match = filterTest(elementVal, filterVal);
                  } else {
                    match = (elementVal === filterVal);
                  }
                }
              }

              ++testedCnt;
              
              if (match) {
                ++matchCnt;
                if (type === RESOURCE_CONST.QUERY_AND) {
                  // logical AND, need to match all filter criteria
                  addToOut = (matchCnt === testCnt);
                } else if (type === RESOURCE_CONST.QUERY_OR) {
                  // logical OR, need to match at least 1 filter criteria
                  addToOut = (matchCnt > 0);
                }
              } else {
                if (type === RESOURCE_CONST.QUERY_AND) {
                  // logical AND, need to match all filter criteria
                  continueNext = false; // doesn't match at least one field, found result so finish
                } else if (type === RESOURCE_CONST.QUERY_NOR) {
                  // logical NOR, must match none of the filter criteria
                  addToOut = (testedCnt === testCnt);
                }
              }

              if (addToOut) {
                out.push(element);
                continueNext = false; // found result so finish
              }
            }
          }
          return continueNext;
        });
      });
    } else {
      out = input;
    }
    return out;
    }

    return filterSchemaFilter;
  }])

  .factory('filterFactory', filterFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

filterFactory.$inject = ['$filter', '$injector', 'miscUtilFactory', 'consoleService', 'SCHEMA_CONST', 'RESOURCE_CONST'];

function filterFactory ($filter, $injector, miscUtilFactory, consoleService, SCHEMA_CONST, RESOURCE_CONST) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'filterFactory',
    newResourceFilter: newResourceFilter,
    getFilteredArray: getFilteredArray,
    getFilteredList: getFilteredList,
    filterArray: filterArray
  };
  
//  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Create a new ResourceFilter object
   * @param   {object} schema  Schema object for which filter will be used
   * @param   {object} base    Base object to filter by
   * @param   {object} options Additional options
   * @returns {object} new ResourceFilter object
   */
  function newResourceFilter (schema, base, options) {
    return $injector.instantiate(ResourceFilter, {
      schema: schema, base: base, options: options
    });
  }

  /**
   * Filter an array
   * @param {string}   filterName Name of filter to apply
   * @param {Array}    list       Array object to filter
   * @param {boolean}  allowBlank Allow blanks flag
   * @param {object}   schema     Schema object to use
   * @param {object}   filterBy   Filter object to use (not ResourceFilter)
   * @param {strimg}   type        Filter type; RESOURCE_CONST.QUERY_OR etc.
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}    filtered list
   */
  function getFilteredArray (filterName, list, allowBlank, schema, filterBy, type, xtraFilter) {
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
      output = $filter(filterName)(output, schema, filterBy, type);
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
   * @param {object}   filterBy   Filter object to use (not ResourceFilter)
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}    filtered list
   */
  function getFilteredList (filterName, reslist, filterBy, xtraFilter) {
    return getFilteredArray(filterName, reslist.list, reslist.filter.allowBlank, reslist.filter.schema, filterBy, reslist.filter.type, xtraFilter);
  }
  
  /**
   * Filter an array
   * @param {Array}    array           Array to filter
   * @param {function} compareFunction Function that defines the sort order. If omitted, the array is sorted according to each character's Unicode code point value, according to the string conversion of each element.
   * @param {function} expression      The predicate to be used for selecting items from array.
   * @param {function} comparator       Comparator which is used in determining if values retrieved using expression (when it is not a function) should be considered a match
   * @see https://docs.angularjs.org/api/ng/filter/filter
   * @returns {Array}    New array with filtered values
   */
  function filterArray (array, compareFunction , expression, comparator) {
    var list = array;
    if (angular.isArray(array)) {
      // sort list
      list = array.slice().sort(compareFunction);

      // filter list so only have newest results for each address
      list = $filter('filter')(list, expression, comparator);
    }
    return list;
  }
  
  /**
   * Filter for a ResourceList object
   * @param {object} schema  Schema object for which filter will be used
   * @param {object} base    Base object to filter by
   * @param {object} options Additional options
   */
  function ResourceFilter (schema, base, options) {
    var noOpts = miscUtilFactory.isNullOrUndefined(options);
    
    this.schema = schema; // keep a ref to field array
    this.filterBy = {};
    this.lastFilter = undefined;  // last filter used
    [
      { name: 'allowBlank', dflt: true },
      { name: 'customFunction', dflt: undefined },
      { name: 'type', dflt: RESOURCE_CONST.QUERY_AND },
      { name: 'dispTransform', dflt: undefined },
      { name: 'hiddenFilters', dflt: undefined }
    ].forEach(function (property) {
      this[property.name] = property.dflt;
      if (!noOpts) {
        if (!miscUtilFactory.isNullOrUndefined(options[property.name])) {
          this[property.name] = options[property.name];
        }
      }
    }, this);

    if (base) {
      // filter utilises dialog fields
      this.schema.forEachField(function (fieldProp) {
        var filterVal = base[fieldProp[SCHEMA_CONST.DIALOG_PROP]];
        if (filterVal) {
          this.filterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]] = filterVal;
        }
      }, this);
    }
  }

  ResourceFilter.$inject = ['schema', 'base', 'options'];

  /**
   * Identify this object as a ResourceFilter
   */
  ResourceFilter.prototype.isResourceFilter = true;

  /**
   * Return the filter values object
   * @returns {object} filter values
   */
  ResourceFilter.prototype.getFilterValue = function (name) {
    if (!name) {
      return this.filterBy;
    }
    return this.filterBy[name];
  };

  /**
   * Adds a value to the filter values object
   * @param {string} name  Name of value to add
   * @param {*}      value Value to add
   * @returns {object} filter values
   */
  ResourceFilter.prototype.addFilterValue = function (name, value) {
    this.filterBy[name] = value;
    return this.filterBy;
  };

  /**
   * Removes a value from the filter values object
   * @param {string} name  Name of value to remove
   * @returns {object} filter values
   */
  ResourceFilter.prototype.delFilterValue = function (name) {
    delete this.filterBy[name];
    return this.filterBy;
  };

  /**
   * toString method for a filter for a ResourceList object
   * @param   {string}   prefix        Prefix dtring
   * @param {function} dispTransform  Function to transform display values
   * @returns {string}   string representation
   */
  ResourceFilter.prototype.toString = function (prefix, dispTransform) {
    var str,
      hiddenFilters,
      filterBy = (this.lastFilter ? this.lastFilter : this.filterBy);
    if (typeof prefix === 'function') {
      dispTransform = prefix;
      prefix = undefined;
    }
    if (!prefix) {
      str = '';
    } else {
      str = prefix;
    }
    if (!dispTransform) {
      dispTransform = this.dispTransform;
    }
    if (this.hiddenFilters && (this.hiddenFilters.length > 0)) {
      hiddenFilters = this.hiddenFilters;
    } else {
      hiddenFilters = [];
    }
    this.schema.forEachField(function (fieldProp) {
      var dialog = fieldProp[SCHEMA_CONST.DIALOG_PROP],
        idx = hiddenFilters.findIndex(function (hide) {
          return (hide === dialog);
        }),
        filterVal = filterBy[dialog];
      if ((idx < 0) && filterVal) {
        if (str.length > 0) {
          str += ', ';
        }
        if (dispTransform) {
          filterVal = dispTransform(dialog, filterVal);
        }
        str += fieldProp[SCHEMA_CONST.DISPLAY_PROP] + ': ' + filterVal;
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



