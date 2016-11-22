/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .constant('RESOURCE_CONST', (function () {
    return {
      STORE_LIST: 'list',
      STORE_OBJ: 'obj'
    };
  })())

  .factory('resourceFactory', resourceFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

resourceFactory.$inject = ['$resource', '$filter', '$injector', 'baseURL', 'storeFactory', 'miscUtilFactory', 
  'consoleService', 'SCHEMA_CONST', 'RESOURCE_CONST'];

function resourceFactory ($resource, $filter, $injector, baseURL, storeFactory, miscUtilFactory, 
  consoleService, SCHEMA_CONST, RESOURCE_CONST) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    getResources: getResources,
    getCount: getCount,
    storeServerRsp: storeServerRsp,
    newResourceList: newResourceList,
    duplicateList: duplicateList,
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
    compareNumberFields: compareNumberFields,
    compareBooleanFields: compareBooleanFields,
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
   * Store a response from the server
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array} objId      id/array of ids of object to save response data to
   *    {string}       storage    save as list or object flag; STORE_LIST, STORE_OBJ, default depends on response
   *    {number}       flags      storefactory flags
   *    {object}       factory    factory to handle saving of objects/lists
   *    {function}     next       function to call after processing
   * @return {object}  ResourceList object
   */
  function storeServerRsp(response, args) {

    var flags = (args.flags || storeFactory.NOFLAG),
      idArray = miscUtilFactory.toArray(args.objId),
      resp,
      asList;

    if (args.storage === RESOURCE_CONST.STORE_LIST) {
      asList = true;
    } else if (args.storage === RESOURCE_CONST.STORE_OBJ) {
      asList = false;
    } else {
      asList = Array.isArray(response);
    }

    if (asList) {
      // process a query response
      resp = args.factory.setList(idArray[0], response, flags);
      // if multiple objId's secondary ids are set to copies
      for (var i = 1; i < idArray.length; ++i) {
        args.factory.duplicateList(idArray[i], idArray[0], storeFactory.DUPLICATE_OR_EXIST);
      }
    } else {
      // process a get response
      resp = args.factory.setObj(idArray[0], response, flags);
      // if multiple objId's secondary ids are set to copies
      for (var i = 1; i < idArray.length; ++i) {
        args.factory.duplicateObj(idArray[i], idArray[0], storeFactory.DUPLICATE_OR_EXIST);
      }
    }

    if (args.next) {
      args.next(resp);
    }
    return resp;
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
   * Create a new ResourceList object by duplicating an existing object
   * @param {string} storeId      Id string to use in storeFactory
   * @param {string} srcStoreId   storeFactory Id string of object to duplicate
   * @param {number} flags  storefactory flags
   */
  function duplicateList(storeId, srcStoreId, flags) {
    return storeFactory.duplicateObj(storeId, srcStoreId, flags);
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
   * @param   {object} [filter={}] Filter object to use, ResourceFilter object or no filter
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
   * @param   {object} pager   pagerFactory object
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
   * @param   {object} filter filter to use or preset filter is used if undefined
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
   * @param   {object} schema Schema object for which filter will be used
   * @param   {object} base   Base object to filter by
   * @returns {object} new ResourceFilter object
   */
  function newResourceFilter (schema, base) {
    return $injector.instantiate(ResourceFilter, {schema: schema, base: base});
  }
  
  /**
   * Get the sort function
   * @param   {object} sortOptions  List of possible sort option
   * @param   {object} sortBy       Key to sort by
   * @returns {function} sort function or id to retrieve sort function
   */
  function getSortFunction(sortOptions, sortBy) {
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

  /**
   * Check if sort key is descending order
   * @param   {object} sortBy   Key to sort by
   * @returns {boolean} true if is descending order, false otherwise
   */
  function isDescendingSortOrder(sortBy) {
    return (sortBy.charAt(0) === SCHEMA_CONST.SORT_DESC);
  }

  /**
   * Compare object's using 'index' property
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareIndices(a, b) {
    return (a.index - b.index);
  }

  /**
   * Compare strings
   * @param {string}  a   First string to compare
   * @param {string}  b   Second string to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareStrings(a, b) {
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  }

  /**
   * Compare boolean, i.e. false before true
   * @param {boolean}  a   First boolean to compare
   * @param {boolean}  b   Second boolean to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareBoolean(a, b) {
    if (!a && b) {
      return -1;
    }
    if (a && !b) {
      return 1;
    }
    return 0;
  }

  /**
   * Compare objects based on schema fields that have string values
   * @param {object}  schema  Schema object
   * @param {number}  index   Index of Schema field to use
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareStringFields(schema, index, a, b) {
    var result = 0,
      array = schema.getField(index, SCHEMA_CONST.MODEL_PROP);
    for (var j = 0; (j < array.length) && (result === 0) ; ++j) {
      result = compareStrings(a[array[j]], b[array[j]]);
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
  function compareNumberFields(schema, index, a, b) {
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
  function compareBooleanFields(schema, index, a, b) {
    var result = 0,
      array = schema.getField(index, SCHEMA_CONST.MODEL_PROP);
    for (var j = 0; (j < array.length) && (result === 0); ++j) {
      result = compareBoolean(a[array[j]], b[array[j]]);
    }
    return result;
  }

  /**
   * Generate a query object
   * @param {function}  forEachSchemaField  Schema field callback function 
   * @param {object}    filter              object to filter by
   * @returns {object} query object
   */
  function buildQuery(forEachSchemaField, filter) {
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
 * @param {object}   pagerFactory    pagerFactory
 * @param {string}   id              id string
 * @param {string}   title           title string
 * @param {Array}    list            base list to use
 * @param {number}   flags           storeFactory flags
 */
function ResourceList ($filter, storeFactory, miscUtilFactory, pagerFactory, id, title, list, flags) {
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
    var toSet = list;
    if (toSet) {
      toSet = miscUtilFactory.toArray(list);
      if (storeFactory.doCopy(flags)) {
        toSet = angular.copy(toSet);
      }
    }
    this.list = toSet;       // unfiltered list
    this.filterList = toSet; // filtered list
    if (toSet) {
      this.count = toSet.length;       // total number of possibilities
      this.filterCount = toSet.length; // total after filter
    } else {
      this.count = 0;
      this.filterCount = 0;
    }
    if (storeFactory.doApplyFilter(flags)) {
      this.applyFilter();
    }
    this.exeChanged();
  };

  /**
   * Add an entry to the base list
   * @param {object} entry Entry to add to list
   * @param {number} flags storeFactory flags; the following are used
   *                       - COPY: to add a copy of the entry argument to the list
   *                       - APPLY_FILTER: to immediately filter list
   *                       - other flags ignored
   */
  this.addToList = function (entry, flags) {
    if (!this.list) {
      this.setList([entry], flags);
    } else {
      if (storeFactory.doCopy(flags)) {
        entry = angular.copy(entry);
      }

      this.list.push(entry);
      ++this.count;

      if (storeFactory.doApplyFilter(flags)) {
        this.applyFilter();
      }
    }
    this.exeChanged();
  };

  this.exeChanged = function () {
    if (this.onChange) {
      for (var i = 0; i < this.onChange.length; ++i) {
        this.onChange[i](this);
      }
    }
  };

  this.addOnChange = function (toExe) {
    this.onChange.push(toExe);
  };

  /**
   * Call the callback function for each of the entries in this objects list
   * @param {function} callback   function to callback
   */
  this.forEachInList = function (callback) {
    this.list.forEach(function (entry) {
      callback(entry);
    });
  };

  /**
   * Call the callback function for each of the entries in this objects list
   * @param {function} predicate   function to test entries in list
   */
  this.findInList = function (predicate, start) {
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    // If argument start was passed let n be ToInteger(start); else let n be 0.
    var n = +start || 0;
    if (Math.abs(n) === Infinity) {
      n = 0;
    }

    var length = this.list.length >>> 0,
      value;

    for (var i = n; i < length; i++) {
      value = this.list[i];
      if (predicate(value, i, this.list)) {
        return value;
      }
    }
    return undefined;
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
      pagerFactory.updatePager(this.pager.id, this.filterList);
    }

    return this;
  };

  this.toString = function () {
    return 'ResourceList{ id: ' + this.id +
    ', title: ' + this.title +
    ', list: ' + this.list.toString() +
    ', count: ' + this.count +
    ', filterList: ' + this.filterList.toString() +
    ', filterCount: ' + this.filterCount +
    ', filter: ' + this.filter.toString() +
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
  this.onChange = [];       // functions to be executed when contents are changed
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




