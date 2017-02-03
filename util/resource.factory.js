/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .constant('RESOURCE_CONST', (function () {
    var schemaPathTYpe = ['path', 'type', 'schema', 'schemaId'],
      stdArgs = schemaPathTYpe.concat(['objId', 'flags', 'subObj', 'customArgs']);
    return {
      STORE_LIST: 'list',
      STORE_OBJ: 'obj',
      
      SCHEMA_PATH_TYPE_ARGS: schemaPathTYpe,
      STD_ARGS: stdArgs
    };
  })())

  .factory('resourceFactory', resourceFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

resourceFactory.$inject = ['$resource', '$filter', '$injector', 'baseURL', 'storeFactory', 'miscUtilFactory', 'pagerFactory', 'compareFactory',
  'consoleService', 'SCHEMA_CONST', 'RESOURCE_CONST'];

function resourceFactory ($resource, $filter, $injector, baseURL, storeFactory, miscUtilFactory, pagerFactory, compareFactory,
  consoleService, SCHEMA_CONST, RESOURCE_CONST) {

  // jic no native implementation is available
  miscUtilFactory.arrayPolyfill();

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'resourceFactory',
    getResources: getResources,
    getCount: getCount,
    storeServerRsp: storeServerRsp,
    standardiseArgs: standardiseArgs,
    standardisePathTypeArgs: standardisePathTypeArgs,
    copyPathTypeArgs: copyPathTypeArgs,
    removeSchemaPathTypeArgs: removeSchemaPathTypeArgs,
    getServerRsp: getServerRsp,
    
    registerStandardFactory: registerStandardFactory,
    
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
    sortResourceList: sortResourceList,
    isDescendingSortOrder: isDescendingSortOrder,
    buildQuery: buildQuery
  },
  standardFactories = {};
  
//  return factory;

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
   * Registger a standard factory
   * @param   {string}   name         Name of the new factory
   * @param   {object}   args         Optional srguments:
   * @param   {function} storeId      Function to generate store ids for objects created by the factory
   * @param   {object}   schema       Schema associated with the factory
   * @param   {object}   addInterface Object ro add standard factory interface to
   * @returns {object}   new factory 
   */
  function registerStandardFactory (name, args) {
    var factory = standardFactories[name];
    if (!factory) {
      factory = $injector.instantiate(StandardFactory, {
        name: name,
        storeId: args.storeId,
        schema: args.schema
      });
      standardFactories[name] = factory;

      if (args.addInterface) {
        for (var prop in Object.getPrototypeOf(factory)) {
          args.addInterface[prop] = factory[prop].bind(factory);
        }
      }
    }
    return factory;
  }

  /**
   * Store a response from the server
   * @param {object}       response Server response
   * @param {object}       args     process arguments object with following properties:
   *  @param {string|Array} objId    id/array of ids of object to save response data to
   *  @param {string}       storage  save as list or object flag; STORE_LIST, STORE_OBJ, default depends on response
   *  @param {string}       path     path within response object to object to store
   *  @param {string}       type     object type, @see SCHEMA_CONST.FIELD_TYPES
   *  @param {object}       schema   Schema to use to retrieve object path & type
   *  @param {number}       schemaId Schema id to use to retrieve object path & type
   *  @param {number}       flags    storefactory flags
   *  @param {object|string} factory  factory (or factory name) to handle saving of objects/lists
   *  @param {function}     next     function to call after processing
   *  @param {Object|array} subObj   additional set(s) of arguments for sub objects
   * @return {object}       ResourceList or object
   */
  function storeServerRsp (response, args) {

    var stdArgs = standardiseArgs(args),
      factory = stdArgs.factory,
      idArray = stdArgs.objId,
      resp,
      asList, i,
      toSave = response;

    if (stdArgs.path) {
      // drill down to get obj to save
      var splits = stdArgs.path.split('.');
      splits.forEach(function (split) {
        if (toSave) {
          toSave = toSave[split];
        }
      });
    }

    if (stdArgs.storage === RESOURCE_CONST.STORE_LIST) {
      asList = true;
    } else if (stdArgs.storage === RESOURCE_CONST.STORE_OBJ) {
      asList = false;
    } else {
      asList = Array.isArray(toSave);
    }

    if (asList) {
      // process a query response
      if (toSave) {
        resp = factory.setList(idArray[0], toSave, stdArgs.flags);
      } else {
        resp = factory.initList(idArray[0], stdArgs.flags);
      }
      // if multiple objId's secondary ids are set to copies
      for (i = 1; i < idArray.length; ++i) {
        factory.duplicateList(idArray[i], idArray[0], storeFactory.DUPLICATE_OR_EXIST);
      }
    } else {
      // process a get response
      if (toSave) {
        resp = factory.setObj(idArray[0], toSave, stdArgs.flags);
      } else {
        resp = factory.initObj(idArray[0], stdArgs.flags);
      }
      // if multiple objId's secondary ids are set to copies
      for (i = 1; i < idArray.length; ++i) {
        factory.duplicateObj(idArray[i], idArray[0], storeFactory.DUPLICATE_OR_EXIST);
      }
    }
    
    if (stdArgs.subObj) {
      // recursive call to save sub objects
      var subObjArray = miscUtilFactory.toArray(stdArgs.subObj);
      subObjArray.forEach(function (subObj) {
        storeServerRsp(response, subObj);
      });
    }

    if (stdArgs.next) {
      stdArgs.next(resp);
    }
    return resp;
  }

  /**
   * Standardise a server response argument object
   * @param {object}       args     process arguments object with following properties:
   * @see storeServerRsp()
   * @return {object}       arguments object
   */
  function standardiseArgs (args) {

    var stdArgs = angular.copy(args);

    if (typeof args.factory === 'string') {
      // get factory instance from injector
      stdArgs.factory = $injector.get(args.factory);
    }
    if (stdArgs.objId) {
      stdArgs.objId = miscUtilFactory.toArray(stdArgs.objId);
    } else {
      stdArgs.objId = [];
    }
    stdArgs.flags = (args.flags || storeFactory.NOFLAG);

    copySchemaPathTypeArgs(
      standardisePathTypeArgs(copySchemaPathTypeArgs(args)), stdArgs);

    if (stdArgs.subObj) {
      if (Array.isArray(stdArgs.subObj)) {
        for (var i = 0; i < stdArgs.subObj.length; ++i) {
          stdArgs.subObj[i] = standardiseArgs(stdArgs.subObj[i]);
        }
      } else {
        stdArgs.subObj = [standardiseArgs(stdArgs.subObj)];
      }
    }

    return stdArgs;
  }

  /**
   * Standardise a server response argument object
   * @param {object}       args     process arguments object with following properties:
   * @see storeServerRsp()
   * @return {object}       arguments object
   */
  function standardisePathTypeArgs (args, makeCopy) {
    
    makeCopy = (typeof makeCopy === 'undefined' ? true : makeCopy);

    var stdArgs = args;
    if (makeCopy) {
      stdArgs = copySchemaPathTypeArgs(args);
    }

    if (stdArgs.schema && 
        (typeof stdArgs.schemaId === 'number') && (stdArgs.schemaId >= 0)) {
      if (!stdArgs.path) {
        // path not explicitly provided, retrieve from schema & schemaId
        stdArgs.path = stdArgs.schema.getModelName(stdArgs.schemaId);
      }
      if (!stdArgs.type) {
        // path not explicitly provided, retrieve from schema & schemaId
        stdArgs.type = stdArgs.schema.getType(stdArgs.schemaId);
      }
    }

    return stdArgs;
  }

  /**
   * Copy schema/path/type arguments from an argument object if not set
   * @param {object}       args     process arguments object
   * @param {object}       from     process arguments object to copy from
   * @return {object}       arguments object
   */
  function copyPathTypeArgs (args, from) {

    var stdArgs = args;

    if (!args.path) {
      stdArgs = copySchemaPathTypeArgs(args);
      if (from.path) {
        stdArgs.path = from.path;
        if (!stdArgs.type && from.type) {
          stdArgs.type = from.type;
        }
      } else {
        if (!stdArgs.schema && from.schema) {
          stdArgs.schema = from.schema;
        }
        if (!stdArgs.schemaId && from.schemaId) {
          stdArgs.schemaId = from.schemaId;
        }
      }
    }

    return stdArgs;
  }

  /**
   * Copy the standard schema/path/type arguments
   * @param {object}       args     process arguments object to copy from
   * @param {object}       to       process arguments object to copy to
   * @return {object}       arguments object
   */
  function copySchemaPathTypeArgs (args, to) {
    if (!to) {
      to = {};
    }
    return miscUtilFactory.copyProperties(args, to, 
                          RESOURCE_CONST.SCHEMA_PATH_TYPE_ARGS);
  }

  /**
   * Remove the standard schema/path/type arguments
   * @param {object}       args     process arguments object to remove from
   * @return {object}       arguments object
   */
  function removeSchemaPathTypeArgs (args) {
    return miscUtilFactory.removeProperties(args,
                          RESOURCE_CONST.SCHEMA_PATH_TYPE_ARGS);
  }

  /**
   * Get a stored response from the server
   * @param {object}       args     process arguments object with following properties:
   * @see storeServerRsp()
   * @return {object}       ResourceList or object
   */
  function getServerRsp (args) {

    var stdArgs = standardiseArgs(args),
      factory = stdArgs.factory,
      idArray = stdArgs.objId,
      resp = [],
      asList = true,
      asObj = true,
      read;

    if (stdArgs.storage === RESOURCE_CONST.STORE_LIST) {
      asObj = false;
    } else if (stdArgs.storage === RESOURCE_CONST.STORE_OBJ) {
      asList = false;
    } 
    // else no type specified so try both

    if (asList) {
      idArray.forEach(function (id) {
        read = factory.getList(id, stdArgs.flags);
        if (read) {
          resp.push(read);
        }
      });
    } 
    if (asObj) {
      idArray.forEach(function (id) {
        read = factory.getObj(id, stdArgs.flags);
        if (read) {
          resp.push(read);
        }
      });
    }

    if (stdArgs.next) {
      stdArgs.next(resp);
    }
    return resp;
  }

  /**
   * Create a new ResourceList object
   * @param {string} storeId Id string to use in storeFactory
   * @param {object} args    Argument object with the following properties:
   *   {string} id                          Id of list
   *   {string} title                       Title of list
   *   {Array}  list                        base list to use
   *   {number} [flags=storeFactory.NOFLAG] storeFactory flags
   *   {string} factory                     name of factory
   * @returns {object} ResourceList object
   */
  function newResourceList (storeId, args) {
    // jic no native implementation is available
    miscUtilFactory.arrayPolyfill();
    
    var listArgs,
      resourceList,
      newList;

    if (args) {
      listArgs = angular.copy(args);
    } else {
      listArgs = {};
    }
    if (!listArgs.id) {
      listArgs.id = '';
    }
    if (!listArgs.title) {
      listArgs.title = '';
    }
    if (!listArgs.list) {
      listArgs.list = [];
    }
    if (!listArgs.flags) {
      listArgs.flags = storeFactory.NOFLAG;
    }

    resourceList = $injector.instantiate(ResourceList, listArgs);
    newList = storeFactory.newObj(storeId, resourceList, listArgs.flags);

    if (typeof listArgs.factory === 'string') {
      newList.factory = $injector.get(listArgs.factory);
    }
    
    return newList;
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
    if (!resourceList && storeFactory.doCreateAny(flags)) {
      resourceList = newList(flags);
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
   * @returns {function|object} sort function or sort option
   */
  function getSortFunction (sortOptions, sortBy) {
    var sortFxn;
    for (var i = 0; (i < sortOptions.length) && !sortFxn; ++i) {
      var option = sortOptions[i].value;
      if (option === sortBy) {
        for (var j = 0; j < SCHEMA_CONST.BASIC_SORT_OPTIONS.length; ++j) {
          if (option === SCHEMA_CONST.BASIC_SORT_OPTIONS[j].value) {
            sortFxn = compareFactory.compareIndices;
            break;
          }
        }
        if (!sortFxn) {
          sortFxn = sortOptions[i];  // return sort option
        }
      }
    }
    return sortFxn;
  }

  /**
   * Sort a ResourceList
   * @param   {object}   resList         List to sort
   * @param   {function} getSortFunction Function to return  sort function
   * @param   {object}   sortOptions     List of possible sort option
   * @param   {object}   sortByValue     Key to sort by
   * @returns {Array}    sorted list
   */
  function sortResourceList (resList, getSortFunction, sortOptions, sortByValue) {
    var sortList,
        sortFxn;
    
    if (resList && resList.factory) {
      if (!getSortFunction) {
        if (resList.factory) {
          getSortFunction = resList.factory.getSortFunction;
        }
      }
      if (!sortOptions) {
        sortOptions = resList.sortOptions;
      }
      if (!sortByValue) {
        if (resList.sortBy) {
          sortByValue = resList.sortBy.value;
        }
      }

      if (getSortFunction && sortOptions && sortByValue) {
        sortList = resList.list;

        sortFxn = getSortFunction(sortOptions, sortByValue);
        if (sortFxn) {
          sortList.sort(sortFxn);
          if (isDescendingSortOrder(sortByValue)) {
            sortList.reverse();
          }

          if (resList.pager) {
            pagerFactory.updatePager(resList.pager.id, sortList);
          }
        }
      }
    }
    return sortList;
  }

  
  /**
   * Check if sort key is descending order
   * @param   {object} sortBy   Key to sort by
   * @returns {boolean} true if is descending order, false otherwise
   */
  function isDescendingSortOrder (sortBy) {
    return (sortBy.charAt(0) === SCHEMA_CONST.SORT_DESC);
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
      forEachSchemaField(function (idx, fieldProp) {
        var filterVal = filter[fieldProp[SCHEMA_CONST.DIALOG_PROP]];
        if (filterVal) {
          var field = '',
            models = fieldProp[SCHEMA_CONST.MODEL_PROP];
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



  /**
   * StandardFactory object
   * @throws {TypeError} on incorrect argument type
   * @param {string}   name    Name of factory
   * @param {function} storeId Function to make store ids for objects created by the factory
   * @param {object}   schema  Schema associated with this factory
   */
  function StandardFactory (storeFactory, name, storeId, schema) {
    this.name = name;
    this.storeId = storeId;
    if (typeof storeId !== 'function') {
      throw new TypeError('Incorrect argument type: storeId');
    }
    this.schema = schema;
  }
  
  /**
   * Create a new object
   * @param {string} id     Factory id of new object
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.newObj = function (id, flags) {
    return storeFactory.newObj(this.storeId(id), this.schema.getObject(), flags);
  };
  
  /**
   * Create a new object by duplicating an existing object
   * @param {string} id     Factory id of new object
   * @param {string} srcId  Factory id of object to duplicate
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.duplicateObj = function (id, srcId, flags) {
    return storeFactory.duplicateObj(this.storeId(id), this.storeId(srcId), flags);
  };
  
  /**
   * Delete an object
   * @param {string} id     Factory id of object to delete
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.delObj = function (id, flags) {
    return storeFactory.delObj(this.storeId(id), flags);
  };

  /**
   * Set an object
   * @param {string} id     Factory id of object to set
   * @param {object} data   data to set
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.setObj = function (id, data, flags) {
    return storeFactory.setObj(this.storeId(id), data, flags, this.schema.getObject());
  };
  
  /**
   * Get an object
   * @param {string} id     Factory id of object to get
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.getObj = function (id, flags) {
    return storeFactory.getObj(this.storeId(id), flags);
  };
  
  /**
   * Initialise an object
   * @param {string} id     Factory id of object to init
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.initObj = function (id, flags) {
    return this.setObj(id, this.schema.getObject(), flags);
  };

  /**
   * Create a new ResourceList object
   * @param   {string} id   Id of list
   * @param {object} args Argument object with the following properties:
   *   {string} id                          Id of list
   *   {string} title                       Title of list
   *   {Array}  list                        base list to use
   *   {number} [flags=storeFactory.NOFLAG] storeFactory flags
   * @returns {object} address ResourceList object
   */
  StandardFactory.prototype.newList = function (id, args) {
    var listArgs;
    if (args) {
      listArgs = angular.copy(args);
    } else {
      listArgs = {};
    }
    if (!listArgs.id) {
      listArgs.id = id;
    }
    listArgs.factory = this.name;

    return newResourceList(this.storeId(id), listArgs);
  };
  
  /**
   * Create a new ResourceList object by duplicating an existing object
   * @param {string} id     Factory id of new object
   * @param {string} srcId  Factory id of object to duplicate
   * @param {number} flags  storefactory flags
   * @returns {object} canvass result ResourceList object
   */
  StandardFactory.prototype.duplicateList = function (id, srcId, flags) {
    return duplicateList(this.storeId(id), this.storeId(srcId), flags);
  };

  
  /**
   * Delete a ResourceList object
   * @param {string}         id    Id string to use
   * @param {number}         flags storeFactory flags; the following are used
   *                               - COPY: to return copy of list
   *                               - other flags ignored
   * @returns {object|boolean} Copy of deleted ResourceList object, or true if successful
   */
  StandardFactory.prototype.delList = function (id, flags) {
    return delResourceList(this.storeId(id), flags);
  };
  
  /**
   * Set the base list for a ResourceList object
   * @param {string} id    Id string to use
   * @param {Array}  list  base list to use
   * @param {number} flags storefactoryFlags
   * @param {string} title Title of list if new list must be created
   * @returns {object} ResourceList object
   */
  StandardFactory.prototype.setList = function (id, list, flags, title) {
    return setResourceList(this.storeId(id), list, flags, 
            function (flags) {
              return this.newList(id, { 
                id: id, title: title, list: list, flags: flags }
              );
            });
  };
  
  /**
   * Get an existing ResourceList object
   * @param {string} id   Id string to use
   * @param   {number}   flags   storefactoryFlags
   * @returns {object} ResourceList object
   */
  StandardFactory.prototype.getList = function (id, flags) {
    return getResourceList(this.storeId(id), flags);
  };
  
  /**
   * Initialise a ResourceList object to an emply base list
   * @param {string} id   Id string to use
   * @param {number}   flags   storefactoryFlags
   * @returns {object} ResourceList object
   */
  StandardFactory.prototype.initList = function (id, flags) {
    return initResourceList(this.storeId(id), flags);
  };

  /**
   * Check if sort key is descending order
   * @param   {object} sortBy   Key to sort by
   * @returns {boolean} true if is descending order, false otherwise
   */
  StandardFactory.prototype.isDescendingSortOrder = function (sortBy) {
    return isDescendingSortOrder(sortBy);
  };

  /**
   * Set the pager for a ResourceList object
   * @param {string} id     Factory id of object
   * @param   {object} [filter={}] Filter object to use, ResourceFilter object or no filter
   * @param {number} flags  storefactory flags
   * @returns {object} canvass result ResourceList object
   */
  StandardFactory.prototype.setPager = function (id, pager, flags) {
    return setPager(this.storeId(id), pager, flags);
  };

  /**
   * Apply filter to a ResourceList object
   * @param {string} id     Factory id of object
   * @param {object} filter filter to use or preset filter is used if undefined
   * @param {number} flags  storefactory flags
   * @returns {object} canvass result ResourceList object
   */
  StandardFactory.prototype.applyFilter = function (id, filter, flags) {
    return applyFilter(this.storeId(id), filter, flags);
  };


  /**
   * Set the base list
   * @param {Array}  list  base list to use
   * @param {number} flags storeFactory flags; the following are used
   *                       - COPY: to set list to a copy of the argument
   *                       - APPLY_FILTER: to immediately filter list
   *                       - other flags ignored
   */
  function setListForResourceList (resList, list, flags) {
    var toSet = list;
    if (toSet) {
      toSet = miscUtilFactory.toArray(list);
      if (storeFactory.doCopy(flags)) {
        toSet = angular.copy(toSet);
      }
    }
    resList.list = toSet;       // unfiltered list
    resList.filterList = toSet; // filtered list
    if (toSet) {
      resList.count = toSet.length;       // total number of possibilities
      resList.filterCount = toSet.length; // total after filter
    } else {
      resList.count = 0;
      resList.filterCount = 0;
    }
    if (storeFactory.doApplyFilter(flags)) {
      resList.applyFilter();
    }
    resList.exeChanged();
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
  function ResourceList ($filter, storeFactory, resourceFactory, miscUtilFactory, pagerFactory, id, title, list, flags) {
    if (!list) {
      list = [];
    }

    // configure object
    this.id = id;
    this.title = title;
    setListForResourceList(this, list, flags);
    this.filter = {};         // filter
    this.pager = undefined;   // pager
    this.selCount = 0;        // selected count
    this.sortBy = undefined;  // sort by option is filled in appropriate controller
    this.onChange = [];       // functions to be executed when contents are changed
  }

  /**
   * Set the base list
   * @param {Array}  list  base list to use
   * @param {number} flags storeFactory flags; the following are used
   *                       - COPY: to set list to a copy of the argument
   *                       - APPLY_FILTER: to immediately filter list
   *                       - other flags ignored
   */
  ResourceList.prototype.setList = function (list, flags) {
    setListForResourceList(this, list, flags);
  };

  /**
   * Add an entry to the base list
   * @param {object} entry Entry to add to list
   * @param {number} flags storeFactory flags; the following are used
   *                       - COPY: to add a copy of the entry argument to the list
   *                       - APPLY_FILTER: to immediately filter list
   *                       - other flags ignored
   */
  ResourceList.prototype.addToList = function (entry, flags) {
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

  /**
   * Notify all listeners of a change
   */
  ResourceList.prototype.exeChanged = function () {
    if (this.onChange) {
      for (var i = 0; i < this.onChange.length; ++i) {
        this.onChange[i](this);
      }
    }
  };

  /**
   * Add an onChange listener
   * @param {function} listener   listener function to callback
   */
  ResourceList.prototype.addOnChange = function (listener) {
    this.onChange.push(listener);
  };

  /**
   * Call the callback function for each of the entries in this objects list
   * @param {function} callback   function to callback
   */
  ResourceList.prototype.forEachInList = function (callback) {
    this.list.forEach(function (entry) {
      callback(entry);
    });
  };

  /**
   * Find an entry in this objects list using the callback function to test each of the entries 
   * @param {function} predicate function to test entries in list
   * @param {number}   start     offset to start from
   */
  ResourceList.prototype.findInList = function (predicate, start) {
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
   * Find the index of an entry in this objects list using the callback function to test each of the entries 
   * @param {function} predicate function to test entries in list
   * @param {number}   start     offset to start from
   */
  ResourceList.prototype.findIndexInList = function (predicate, start) {
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
        return i;
      }
    }
    return undefined;
  };

  /**
   * Return an entry in this objects list
   * @param {number}   index     index of entry to return
   */
  ResourceList.prototype.getFromList = function (index) {
    var length = this.list.length >>> 0;

    if ((index < 0) || (index >= length)) {
      throw new RangeError('index out of range');
    }
    return this.list[index];
  };

  /**
   * Apply a filter to the list, and update the associated pager if applicable
   * @param   {object} filter filter to use or preset filter used if undefined
   * @returns {object} this object to facilitate chaining
   */
  ResourceList.prototype.applyFilter = function (filter) {
    if (typeof filter === 'undefined') {
      // use preset filter object
      if (this.filter) {
        filter = this.filter.filterBy;
      }
    }

    filter = filter || {};

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

  /**
   * Sort this ResourceList
   * @param   {function} getSortFunction Function to return  sort function
   * @param   {object}   sortOptions     List of possible sort option
   * @param   {object}   sortByValue     Key to sort by
   * @returns {Array}    sorted list
   */
  ResourceList.prototype.sort = function (getSortFunction, sortOptions, sortByValue) {
    return resourceFactory.sortResourceList(this, getSortFunction, sortOptions, sortByValue);
  };

  /**
   * toString method for a ResourceList object
   * @returns {string} string representation
   */
  ResourceList.prototype.toString = function () {
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



