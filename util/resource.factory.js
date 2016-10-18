/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .factory('resourceFactory', resourceFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

resourceFactory.$inject = ['$resource', '$filter', '$injector', 'baseURL', 'storeFactory', 'miscUtilFactory', 'SCHEMA_CONST'];

function resourceFactory ($resource, $filter, $injector, baseURL, storeFactory, miscUtilFactory, SCHEMA_CONST) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    getResources: getResources,
    getCount: getCount,
    newResourceList: newResourceList,
    delResourceList: delResourceList,
    setResourceList: setResourceList,
    getResourceList: getResourceList,
    initResourceList: initResourceList,
    setFilter: setFilter,
    setPager: setPager,
    applyFilter: applyFilter,
    newResourceFilter: newResourceFilter,
    getSortFunction: getSortFunction,
    isDescendingSortOrder: isDescendingSortOrder,
    compareStringFields: compareStringFields,
    buildQuery: buildQuery
  };
  
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Get basic REST resource 
   * @param   {string} url url relative to baseUrl
   * @returns {object} REST resource
   */
  function getResources (url) {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };

      add custom update method
    */
    return $resource(baseURL + url + '/:id', {id:'@id'}, {'update': {method: 'PUT'}});
  }

  /**
   * Get basic count resource
   * @param   {string} url url relative to baseUrl
   * @returns {object} REST resource
   */
  function getCount (url) {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };
    */
    return $resource(baseURL + url + '/count', null, null);
  }
  
  /**
   * Create a new ResourceList object
   * @param   {string} storeId                     Id string to use in storeFactory
   * @param   {string} id                          Id of list
   * @param   {string} title                       Title of list
   * @param   {Array}  list                        base list to use
   * @param   {number} [flags=storeFactory.NOFLAG] storeFactory flags
   * @returns {object} ResourceList object
   */
  function newResourceList (storeId, id, title, list, flags) {
    // jic no native implementation is available
    miscUtilFactory.arrayPolyfill();
    
    if (Array.isArray(title)) {
      flags = list;
      list = title;
      title = undefined;
    }
    if (typeof list === 'number') {
      flags = list;
      list = undefined;
    }
    flags = flags || storeFactory.NOFLAG;
    var resourceList = $injector.instantiate(ResourceList, {id: id, title: title, list: list, flags: flags});
    return storeFactory.newObj(storeId, resourceList, flags);
  }
  
  /**
   * Delete a ResourceList object
   * @param {string}   storeId Id string to use in storeFactory
   * @param {number}   flags storeFactory flags; the following are used
   *                         - COPY: to return copy of list
   *                         - other flags ignored
   * @returns {object|boolean} Copy of deleted ResourceList object, or true if successful
   */
  function delResourceList (storeId, flags) {
    return storeFactory.delObj(storeId, flags);
  }
  
  /**
   * Set the base list for a ResourceList object
   * @param {string}   storeId Id string to use in storeFactory
   * @param {Array}    list    base list to use
   * @param   {number}   flags   storefactoryFlags
   * @param   {function} newList Optional list creator function
   * @returns {object} ResourceList object
   */
  function setResourceList (storeId, list, flags, newList) {
    var resourceList = getResourceList(storeId);
    if (!resourceList && storeFactory.doCreate(flags)) {
      resourceList = newList(storeFactory.CREATE);
    }
    if (resourceList) {
      resourceList.setList(list, flags);
    }
    return getResourceList(storeId, flags);
  }

  /**
   * Get an existing ResourceList object
   * @param {string}   storeId Id string to use in storeFactory
   * @param   {number}   flags   storefactoryFlags
   * @returns {object} ResourceList object
   */
  function getResourceList(storeId, flags) {
    return storeFactory.getObj(storeId, flags);
  }

  /**
   * Initialise a ResourceList object to an emply base list
   * @param {string}   storeId Id string to use in storeFactory
   * @param   {number}   flags   storefactoryFlags
   * @returns {object} ResourceList object
   */
  function initResourceList (storeId, flags) {
    // include only required fields
    return setResourceList(storeId, [], flags);
  }

  /**
   * Set the filter for a ResourceList object
   * @param {string} storeId    Id string to use in storeFactory
   * @param   {object} [filter={] Filter object to use, ResourceFilter object or  no filter
   * @param   {number} flags      storefactoryFlags
   * @returns {object} ResourceList object
   */
  function setFilter (storeId, filter, flags) {
    if (typeof filter === 'number') {
      flags = filter;
      filter = {};
    }
    filter = filter || {};

    var resourceList = getResourceList(storeId);
    if (resourceList) {
      resourceList.filter = filter;
      if (storeFactory.doApplyFilter(flags)) {
        resourceList.applyFilter(filter);
      }
    }
    return getResourceList(storeId, flags);
  }

  /**
   * Set the pager for the ResourceList object
   * @param {string} storeId Id string to use in storeFactory
   * @param   {object} pager   pagerService object
   * @param   {number} flags   storefactoryFlags
   * @returns {object} ResourceList object
   */
  function setPager (storeId, pager, flags) {
    if (typeof pager === 'number') {
      flags = pager;
      pager = undefined;
    }

    var resourceList = getResourceList(storeId);
    if (resourceList) {
      resourceList.pager = pager;
    }
    return getResourceList(storeId, flags);
  }

  /**
   * Apply a filter to a ResourceList object, and update the associated pager if applicable
   * @see ResourceList.applyFilter()
   * @param {string} storeId Id string to use in storeFactory
   * @param   {object} filter filter to use or preset filter used if undefined
   * @param   {number} flags   storefactoryFlags
   * @returns {object} this object to facilitate chaining
   */
  function applyFilter (storeId, filter, flags) {
    var resourceList = getResourceList(storeId);
    if (resourceList) {
      resourceList.applyFilter(filter);
    }
    return getResourceList(storeId, flags);
  }

  /**
   * Create a new ResourceFilter object
   * @param   {Array} schema [[Description]]
   * @param   {[[Type]]} base       [[Description]]
   * @returns {[[Type]]} [[Description]]
   */
  function newResourceFilter (schema, base) {
    return $injector.instantiate(ResourceFilter, {schema: schema, base: base});
  }
  
  function getSortFunction (sortOptions, sortBy) {
    var sortFxn;
    for (var i = 0; (i < sortOptions.length) && !sortFxn; ++i) {
      var option = sortOptions[i].value;
      if (option === sortBy) {
        for (var j = 0; j < SCHEMA_CONST.BASIC_SORT_OPTIONS.length; ++j) {
          if (option === SCHEMA_CONST.BASIC_SORT_OPTIONS[j].value) {
            sortFxn = compareIndices;
            break;
          }
        }
        if (!sortFxn) {
          sortFxn = sortOptions[i].id;  // return id
        }
      }
    }
    return sortFxn;
  }

  function isDescendingSortOrder (sortBy) {
    return (sortBy.charAt(0) === SCHEMA_CONST.SORT_DESC);
  }

  function compareIndices (a, b) {
    return (a.index - b.index);
  }

  function compareStrings (a, b) {
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  }

  function compareStringFields (schema, index, a, b) {
    var result = 0,
      array = schema.getField(index, SCHEMA_CONST.MODEL_PROP);
    for (var j = 0; (j < array.length) && (result === 0); ++j) {
      result = compareStrings(a[array[j]], b[array[j]]);
    }
    return result;
  }

  function buildQuery (forEachSchemaField, filter) {
    var query = {};
    if (filter) {
      // using the dialog fields to build an object based on the model fields
      forEachSchemaField(function (idx, dialog, display, models) {
        var filterVal = filter[dialog];
        if (filterVal) {
          var field = '';
          for (var i = 0; i < models.length; ++i) {
            if (i > 0) {
              field += ' ';
            }
            field += models[i];
          }
          query[field] = filterVal;
        }
      });
    }
    return query;
  }


}


/**
 * A resource list object containing base and filtered lists
 * @param {function} $filter         Angular filter service
 * @param {function} storeFactory    storeFactory service
 * @param {object}   miscUtilFactory miscUtilFactory service
 * @param {object}   pagerService    pagerService
 * @param {string}   id              id string
 * @param {string}   title           title string
 * @param {Array}    list            base list to use
 * @param {number}   flags           storeFactory flags
 */
function ResourceList ($filter, storeFactory, miscUtilFactory, pagerService, id, title, list, flags) {
  if (!list) {
    list = [];
  }

  /**
   * Set the base list
   * @param {Array}  list  base list to use
   * @param {number} flags storeFactory flags; the following are used
   *                       - COPY: to set list to a copy of the argument
   *                       - APPLY_FILTER: to immediately filter list
   *                       - other flags ignored
   */
  this.setList = function (list, flags) {
    if (storeFactory.doCopy(flags)) {
      list = angular.copy(list);
    }
    this.list = list;       // unfiltered list
    this.filterList = list; // filtered list
    if (list) {
      this.count = list.length;       // total number of possibilities
      this.filterCount = list.length; // total after filter
    } else {
      this.count = 0;
      this.filterCount = 0;
    }
    if (storeFactory.doApplyFilter(flags)) {
      this.applyFilter();
    }
  };

  /**
   * Apply a filter to the list, and update the associated pager if applicable
   * @param   {object} filter filter to use or preset filter used if undefined
   * @returns {object} this object to facilitate chaining
   */
  this.applyFilter = function (filter) {
    if (typeof filter === 'undefined') {
      // use preset filter object
      filter = this.filter.filterBy;
    }

    filter = filter || {};
    if (!flags) {
      flags = storeFactory.NOFLAG;
    }

    if (!miscUtilFactory.isEmpty(filter)) {
      if (this.filter.customFunction) {
        // use the specific filter function
        this.filter.customFunction(this, filter);
      } else {
        // use the filter object
        this.filterList = $filter('filter')(this.list, filter);
      }
    } else {
      this.filterList = this.list;
    }
    this.filterCount = this.filterList.length;

    if (this.pager) {
      pagerService.updatePager(this.pager.id, this.filterList);
    }

    return this;
  };

  this.toString = function () {
    return 'ResourceList{ id: ' + this.id +
    ', title: ' + this.title +
    ', list: ' + this.list +
    ', count: ' + this.count +
    ', filterList: ' + this.filterList +
    ', filterCount: ' + this.filterCount +
    ', filter: ' + this.filter +
    ', pager: ' + this.pager +
    ', selCount: ' + this.selCount +
    ', sortBy: ' + this.sortBy + '}';
  };
  
  // configure object
  this.id = id;
  this.title = title;
  this.setList(list, flags);
  this.filter = {};         // filter
  this.pager = undefined;   // pager
  this.selCount = 0;        // selected count
  this.sortBy = undefined;  // sort by option is filled in appropriate controller
}


/**
 * Filter for a ResourceList object
 * @param   {object} schema Schema object for which filter will be used
 * @param   {object} base   Base object to filter by
 */
function ResourceFilter (schema, base) {
  
  this.schema = schema; // keep a ref to field array
  this.filterBy = {};
  
  if (base) {
    // filter utilises dialog fields
    var newfilterBy = {};
    this.schema.forEachField(function (idx, dialog, display, model, id) {
      var filterVal = base[dialog];
      if (filterVal) {
        newfilterBy[dialog] = filterVal;
      }
    });
    this.filterBy = newfilterBy;
  }
  
  this.toString = function (prefix) {
    var str,
      filterBy = this.filterBy;
    if (!prefix) {
      str = '';
    } else {
      str = prefix;
    }
    this.schema.forEachField(function (idx, dialog, display, model, id) {
      var filterVal = filterBy[dialog];
      if (filterVal) {
        if (str.length > 0) {
          str += '\n';
        }
        str += display + ': ' + filterVal;
      }
    });
    if (str.length === 0) {
      str = 'No filter';
    }
    return str;
  };
}




