/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .factory('standardFactoryFactory', standardFactoryFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

standardFactoryFactory.$inject = ['$resource', '$injector', '$q', 'baseURL', 'storeFactory', 'miscUtilFactory', 'resourceListFactory', 'filterFactory', 'queryFactory', 'SCHEMA_CONST'];

function standardFactoryFactory($resource, $injector, $q, baseURL, storeFactory, miscUtilFactory, resourceListFactory, filterFactory, queryFactory, SCHEMA_CONST) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'standardFactoryFactory',
    getResourceConfig: getResourceConfig,
    getResourceConfigWithId: getResourceConfigWithId,
    
    registerStandardFactory: registerStandardFactory
  },
  standardFactories = {};

  // need to return factory as end so that object prototype functions are added

  /* function implementation
    -------------------------- */

  /**
   * Registger a standard factory
   * @param   {string}          name         Name of the new factory
   * @param   {object}          args         Optional srguments:
   *  @param  {function|string} storeId      Function to generate store ids for objects created by the factory or id tag to use when generating
   *  @param  {object}          schema       Schema associated with the factory
   *  @param  {object}          addInterface Object to add standard factory interface to
   *  @param  {object}          resources    Resource config object
   * @returns {object}          new factory 
   */
  function registerStandardFactory (name, args) {
    var factory = standardFactories[name],
      prop,
      resrcName,
      cfg;
    if (!factory) {
      factory = $injector.instantiate(StandardFactory, {
        name: name,
        storeId: args.storeId,
        schema: args.schema,
        sortOptions: args.sortOptions,
        resources: args.resources
      });
      standardFactories[name] = factory;

      if (args.addInterface) {
        // add the standard functions to the factory
        for (prop in Object.getPrototypeOf(factory)) {
          args.addInterface[prop] = factory[prop].bind(factory);
        }
        if (args.resources) {
          // add functions to the factory for the custom actions
          miscUtilFactory.toArray(args.resources).forEach(function (resource) {
            for (resrcName in resource) {
              /* StandardFactory has methods matching the default action of 
                resource class:
                  { 'get':    {method:'GET'},
                    'save':   {method:'POST'},
                    'query':  {method:'GET', isArray:true},
                    'remove': {method:'DELETE'},
                    'delete': {method:'DELETE'} };
                https://docs.angularjs.org/api/ngResource/service/$resource
              */
              cfg = resource[resrcName];
              if (cfg.actions) {
                // add methods for custom methods
                for (prop in cfg.actions) {
                  if (!args.addInterface[prop]) {
                    args.addInterface[prop] = factory.resourceMethod.bind(factory, prop);
                  }
                }
              }
            }
          });
        }
      }
    }
    return factory;
  }

  /**
   * Return a resource config object
   * @param   {string} url     URL for resource
   * @returns {object} resource config object
   */
  function getResourceConfig (url) {
    return {
      url: url,                   // URL template
      paramDefaults: null,
      actions: null
    };
  }
  
  /**
   * Return a resource config object with parameterized URL
   * @param   {string} url     URL for resource
   * @param   {object} actions Optional additional custom actions
   * @returns {object} resource config object
   */
  function getResourceConfigWithId (url, actions) {
    var action,
      cfg = {
        url: url + '/:id', // parameterized URL template with parameters prefixed by : 
        paramDefaults: {id:'@id'},    // extract parameter value from corresponding property on the data object
        actions: {
          update: { method: 'PUT'}    //  custom actions
        }
      };

    if (actions) {
      for (action in actions) {
        cfg.actions[action] = actions[action];
      }
    }
    return cfg;
  }

  /**
   * Create storeFactory id
   * @param {object} factory Factory to generate storeFactory id for
   * @param {string} id      Factory id to generate storeFactory id from
   * @return {string} Store id
   */
  function storeId (factory, id) {
    var idstr;
    if (typeof factory.storeId === 'string') {
      idstr = factory.storeId + id;
    } else if (typeof factory.storeId === 'function') {
      idstr = factory.storeId(id);
    } else {
      idstr = id;
    }
    return idstr;
  }

  /**
   * StandardFactory object
   * @throws {TypeError} on incorrect argument type
   * @param {string}   name    Name of factory
   * @param {function} storeId Function to make store ids for objects created by the factory
   * @param {object}   schema  Schema associated with this factory
   * @param {object}   resources  Resource config object
   */
  function StandardFactory ($resource, baseURL, storeFactory, name, storeId, schema, sortOptions, resources) {
    this.name = name;
    if ((typeof storeId !== 'function') && (typeof storeId !== 'string')) {
      throw new TypeError('Incorrect argument type for storeId: ' + typeof storeId);
    }
    this.storeId = storeId;
    this.schema = schema;
    this.sortOptions = sortOptions;
    this.resources = resources;
  }
  
  StandardFactory.$inject = ['$resource', 'baseURL', 'storeFactory', 'name', 'storeId', 'schema', 'sortOptions', 'resources'];
  
  /**
   * Get the factory schema
   * @param {object} factory schema
   */
  StandardFactory.prototype.getSchema = function (thisArg) {
    thisArg = thisArg || this;
    return thisArg.schema;
  };

  /**
   * Get the factory resource
   * @param {string} name   Name of resource to get
   * @return {object} resource "class" object
   */
  StandardFactory.prototype.getResource = function (name) {
    var resource = this.resources[name];
    if (!resource) {
      throw new Error('Resource not defined for \'' + name + '\'');
    }
    return $resource(baseURL + resource.url, resource.paramDefaults, resource.actions);
  };

  /**
   * Call an action on the factory resource
   * @param {object}   resource  Resource class object
   * @param {string}   method    action name
   * @param {object}   params    Optional params
   * @param {object}   postData  Optional data for body of request
   * @param {function} onSuccess Function to call on success
   * @param {function} onFailure Function to call on failure
   * @param {boolean}  asPromise Return the resource promise if true, otherwise implement success/failure functions
   */
  function requestMethod (resource, method, params, postData, onSuccess, onFailure, asPromise) {
    var result,
      promise;

    if (typeof params === 'function') {
      //                   resource, method, params, postData, onSuccess, onFailure, asPromise
      return requestMethod(resource, method, undefined, undefined, params, postData, onSuccess);
    }
    if (typeof params === 'boolean') {
      //                   resource, method, params, postData, onSuccess, onFailure, asPromise
      return requestMethod(resource, method, undefined, undefined, undefined, undefined, params);
    }
    if (typeof postData === 'function') {
      //                   resource, method, params, postData, onSuccess, onFailure, asPromise
      return requestMethod(resource, method, params, undefined, postData, onSuccess, onFailure);
    }
    if (typeof postData === 'boolean') {
      //                   resource, method, params, postData, onSuccess, onFailure, asPromise
      return requestMethod(resource, method, params, undefined, undefined, undefined, postData);
    }
    if (typeof onSuccess === 'boolean') {
      //                   resource, method, params, postData, onSuccess, onFailure, asPromise
      return requestMethod(resource, method, params, postData, undefined, undefined, onSuccess);
    }
    if (typeof onFailure === 'boolean') {
      //                   resource, method, params, postData, onSuccess, onFailure, asPromise
      return requestMethod(resource, method, params, postData, onSuccess, undefined, onFailure);
    }
    
    promise = resource[method](params, postData).$promise;
    if (asPromise) {
      result = promise;
    } else {
      promise.then(
        // success function
        function (response) {
          if (onSuccess) {
            onSuccess(response);
          }
        },
        // error function
        function (response) {
          if (onFailure) {
            onFailure(response);
          }
        }
      );
    }
    return result;
  }

  /**
   * Call an action on the factory resource
   * @param {string} name   Name of resource
   * For other arguments & return @see requestMethod()
   */
  StandardFactory.prototype.resourceMethod = function (method, name, params, postData, onSuccess, onFailure, asPromise) {
    return requestMethod(this.getResource(name), method, params, postData, onSuccess, onFailure, asPromise) ;
  };

  /**
   * Get the factory resource.
   * For arguments & return @see requestMethod()
   */
  StandardFactory.prototype.get = function (name, params, postData, onSuccess, onFailure, asPromise) {
    return this.resourceMethod('get', name, params, postData, onSuccess, onFailure, asPromise);
  };

  /**
   * Save the factory resource
   * For arguments & return @see requestMethod()
   */
  StandardFactory.prototype.save = function (name, postData, onSuccess, onFailure, asPromise) {
    return this.resourceMethod('save', name, undefined, postData, onSuccess, onFailure, asPromise);
  };

  /**
   * Query the factory resource
   * For arguments & return @see requestMethod()
   */
  StandardFactory.prototype.query = function (name, params, postData, onSuccess, onFailure, asPromise) {
    return this.resourceMethod('query', name, params, postData, onSuccess, onFailure, asPromise);
  };

  /**
   * Remove using the factory resource
   * For arguments & return @see requestMethod()
   */
  StandardFactory.prototype.remove = function (name, params, postData, onSuccess, onFailure, asPromise) {
    return this.resourceMethod('remove', name, params, postData, onSuccess, onFailure, asPromise);
  };

  /**
   * Delete using the factory resource
   * For arguments & return @see requestMethod()
   */
  StandardFactory.prototype.delete = function (name, params, postData, onSuccess, onFailure, asPromise) {
    return this.resourceMethod('delete', name, params, postData, onSuccess, onFailure, asPromise);
  };

  /**
   * Store a response from the server asynchronously
   * @param {string}   name             Name of factory
   * @param {object}   resourceFactory  Reference to resourceFactory (required in order to prevent circular dependency)
   * @param {object}   obj              Object to save
   * @param {object}   args             process arguments object, @see resourceFactory.storeServerRsp() for details
   * @param {object}   con              consoleService object to log output
   * @param {string}   label            Label to use in log output
   * @return {object}   Canvass object
   */
  StandardFactory.prototype.storeRspObjectAsync = function (name, resourceFactory, obj, args, con, label) {

    var subObjects, i, ll, promises,
      saveMain = function (result) {

        if (con) {
          con.debug('Store ' + label + ' response: ' + obj);
        }

        // just basic storage args as subdocs have been processed above
        var storeArgs = resourceFactory.copyBasicStorageArgs(args, {
          factory: $injector.get(name)
        });

        resourceFactory.storeServerRsp(obj, storeArgs);
      };

    // store sub objects first
    if (args.subObj) {
      subObjects = miscUtilFactory.toArray(args.subObj);
      promises = [];

      if (con) {
        con.debug('Store ' + label + ' subobjs: ' + subObjects.length);
      }

      for (i = 0, ll = subObjects.length; i < ll; ++i) {
        promises.push(
          $q(function (resolve, reject) {
            resourceFactory.storeSubDoc(obj, subObjects[i], args);
            if (con) {
              con.debug('Stored ' + label + ' subobj[' + i + ']: ' + subObjects[i].objId);
            }
            resolve();
          })
        );
      }
    }

    if (promises) {
      $q.all(promises).then(saveMain);
    } else {
      saveMain();
    }
  };

  /**
   * Create a new object
   * @param {string} id     Factory id of new object
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.newObj = function (id, flags) {
    return storeFactory.newObj(storeId(this, id), this.schema.getObject(), flags);
  };

  /**
   * Create a new object by duplicating an existing object
   * @param {string} id     Factory id of new object
   * @param {string} srcId  Factory id of object to duplicate
   * @param {number} flags  storefactory flags
   * @param   {function} presetCb Optional function to be called before object stored
   * @returns {object}   New or existing object
   */
  StandardFactory.prototype.duplicateObj = function (id, srcId, flags, presetCb) {
    return storeFactory.duplicateObj(storeId(this, id), storeId(this, srcId), flags, presetCb);
  };
  
  /**
   * Delete an object
   * @param {string} id     Factory id of object to delete
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.delObj = function (id, flags) {
    return storeFactory.delObj(storeId(this, id), flags);
  };

  /**
   * Set an object
   * @param {string} id     Factory id of object to set
   * @param {object} data   data to set
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.setObj = function (id, data, flags) {
    return storeFactory.setObj(storeId(this, id), data, flags, this.schema.getObject());
  };
  
  /**
   * Get an object
   * @param {string} id     Factory id of object to get
   * @param {number} flags  storefactory flags
   */
  StandardFactory.prototype.getObj = function (id, flags) {
    return storeFactory.getObj(storeId(this, id), flags);
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
   * @param {object} args Argument object @see resourceListFactory.newResourceList()
   * @returns {object} ResourceList object
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

    return resourceListFactory.newResourceList(storeId(this, id), listArgs);
  };
  
  /**
   * Create a new ResourceList object by duplicating an existing object
   * @param {string} id    Factory id of new object
   * @param {string} srcId Factory id of object to duplicate
   * @param {number} flags storefactory flags
   * @param {object} args  Optional arguemnts specifying fields to duplicate when used with EXISTING
   * @see resourceListFactory.duplicateList()
   * @returns {object} ResourceList object
   */
  StandardFactory.prototype.duplicateList = function (id, srcId, flags, args) {
    return resourceListFactory.duplicateList(id, storeId(this, id), storeId(this, srcId), flags, args);
  };

  
  /**
   * Delete a ResourceList object
   * @param {string}         id    Id string to use
   * @param {number}         flags storeFactory flags; the following are used
   *                               - COPY_GET: to return copy of list
   *                               - other flags ignored
   * @returns {object|boolean} Copy of deleted ResourceList object, or true if successful
   */
  StandardFactory.prototype.delList = function (id, flags) {
    return resourceListFactory.delResourceList(storeId(this, id), flags);
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
    var newListFxn = this.newList.bind(this, id);
    return resourceListFactory.setResourceList(storeId(this, id), list, flags,
            function (flags) {
              return newListFxn({
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
    var newListFxn = this.newList.bind(this, id);
    return resourceListFactory.getResourceList(storeId(this, id), flags,
            function (flags) {
              return newListFxn({
                id: id, flags: flags
              });
            });
  };
  
  /**
   * Initialise a ResourceList object to an emply base list
   * @param {string} id   Id string to use
   * @param {number}   flags   storefactoryFlags
   * @returns {object} ResourceList object
   */
  StandardFactory.prototype.initList = function (id, flags) {
    return resourceListFactory.initResourceList(storeId(this, id), flags);
  };

  /**
   * Check if sort key is descending order
   * @param   {object} sortBy   Key to sort by
   * @returns {boolean} true if is descending order, false otherwise
   */
  StandardFactory.prototype.isDescendingSortOrder = function (sortBy) {
    return resourceListFactory.isDescendingSortOrder(sortBy);
  };

  /**
   * Set the pager for a ResourceList object
   * @param {string} id     Factory id of object
   * @param   {object} [filter={}] Filter object to use, ResourceFilter object or no filter
   * @param {number} flags  storefactory flags
   * @returns {object} canvass result ResourceList object
   */
  StandardFactory.prototype.setPager = function (id, pager, flags) {
    return resourceListFactory.setPager(storeId(this, id), pager, flags);
  };

  /**
   * Generate a new ResourceFilter
   * @param {object}   base         Base object to generate filter from
   * @param {function} customFilter Custom filter function
   * @param {object}   options      Additional options
   */
  StandardFactory.prototype.newFilter = function (base, customFilter, options) {
    if (typeof base === 'function') {
      options = customFilter;
      customFilter = base;
      base = undefined;
    }
    if (typeof customFilter === 'object') {
      options = customFilter;
      customFilter = undefined;
    }
    if (!customFilter) {
      customFilter = this.filterFunction;
    }

    var opts = miscUtilFactory.copyAndAddProperties(options, {
      customFunction: customFilter
    });

    return filterFactory.newResourceFilter(this.schema, base, opts);
  };
  
  /**
   * Generate a filtered list
   * @param {object}   reslist    ResourceList object to filter
   * @param {object}   filterBy   Filter object to use (not ResourceFilter)
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}  filtered list
   */
  StandardFactory.prototype.getFilteredList = function (reslist, filterBy, xtraFilter) {
    return filterFactory.getFilteredList('filterSchema', reslist, filterBy, xtraFilter);
  };
  
  /**
   * Address-specific filter function
   * @param {object}   reslist    ResourceList object
   * @param {object}   filterBy   Filter object to use (not ResourceFilter)
   */
  StandardFactory.prototype.filterFunction = function (reslist, filterBy, xtraFilter) {
    reslist.filterList = reslist.factory.getFilteredList(reslist, filterBy);
  };

  /**
   * Get resources from the server
   * @param {string}   name                 Name of resource
   * @param {object}   resList              ResourceList to save result to
   * @param {object}   [filter=newFilter()] ResourceFilter to filter raw results
   * @param {function} success              Function to call on success
   * @param {function} failure              Function to call on failure
   * @param {function} forEachSchemaField   Schema field iterator
   */
  StandardFactory.prototype.getFilteredResource = function (name, resList, filter, success, failure, forEachSchemaField) {

    if (typeof name !== 'string') {
      throw new TypeError('Incorrect argument type for name: ' + typeof name);
    }
    if (!resList.isResourceList) {
      throw new TypeError('Incorrect argument type for resList: ' + typeof resList);
    }
    if (typeof filter === 'function') {
      forEachSchemaField = failure;
      failure = success;
      filter = this.newFilter();
    }
    if (!forEachSchemaField) {
      forEachSchemaField = this.forEachSchemaField;
    }
    filter = filter || this.newFilter();

    var query;
    if (filter.isResourceFilter) {
      // build query from a schema filter object
      query = queryFactory.buildSchemaQuery(forEachSchemaField, filter.getFilterValue(), this);
    } else {
      // use raw query
      query = filter;
    }

    resList.setList([]);
    this.query(name, query,
      // success function
      function (response) {
        // add indices
        for (var i = 0; i < response.length; ++i) {
          response[i].index = i + 1;
        }
        // response from server contains result of filter request
        resList.setList(response, storeFactory.APPLY_FILTER);

        if (success){
          success(response);
        }
      },
      // error function
      failure
    );
  };
  
  /**
   * Set the filter for a ResourceList
   * @param {string} id                   ResourceList id
   * @param {object} [filter=newFilter()] ResourceFilter to set
   * @param {number} flags                storefactoryFlags
   * @returns {object} ResourceList object
   */
  StandardFactory.prototype.setFilter = function (id, filter, flags) {
    if (!filter) {
      filter = this.newFilter();
    }
    return resourceListFactory.setFilter(storeId(this, id), filter, flags);
  };

  /**
   * Apply filter to a ResourceList object
   * @param {string} id     Factory id of object
   * @param {object} filter filter to use or preset filter is used if undefined
   * @param {number} flags  storefactory flags
   * @returns {object} canvass result ResourceList object
   */
  StandardFactory.prototype.applyFilter = function (id, filter, flags) {
    return resourceListFactory.applyFilter(storeId(this, id), filter, flags);
  };

  /**
   * Return the ResourceList sort options for this factory
   * @return {Array} Array of options
  */
  StandardFactory.prototype.getSortOptions = function (thisArg) {
    thisArg = thisArg || this;
    return thisArg.sortOptions;
  };

  /**
   * Return a sort options for this factory
   * @param {number} index   Field index
   * @param {string} sortKey Sort key; SCHEMA_CONST.SORT_ASC or SCHEMA_CONST.SORT_DESC
   * @return {object} Sort option
  */
  StandardFactory.prototype.getSortOption = function (index, sortKey, thisArg) {
    thisArg = thisArg || this;
    var sortObj,
      value = thisArg.schema.getField(index);

    if (value) {
      value = SCHEMA_CONST.MAKE_SORT_OPTION_VALUE(sortKey, value.dialog);
      sortObj = thisArg.sortOptions.find(function(option) {
        return (option.value === value);
      });
    }
    return sortObj;
  };

  /**
   * Callback the specified function for each field in the schema, providing the field details as the callback arguments
   * @see Schema.prototype.forEachField() for argument details
   */
  StandardFactory.prototype.forEachSchemaField = function (callback, thisArg) {
    thisArg = thisArg || this;
    if (thisArg.schema) {
      thisArg.schema.forEachField(callback, thisArg);
    }
  };
  
  /**
   * Return a list of fields in this schema that match the specified criteria
   * @param {object} args Criteria to match, 
   *                      @see ModelProp.prototype.matches() for details
   * @return {array}  Array of matching modelProp objects
   */
  StandardFactory.prototype.getFieldList = function (args, thisArg) {
    var result = [];
    thisArg = thisArg || this;
    if (thisArg.schema) {
      result = thisArg.schema.getFieldList(args);
    }
    return result;
  };

  /**
   * Callback the specified function for each ModelProp in the schema, providing the ModelProp details as the callback arguments
   * @see Schema.prototype.forEachModelProp() for argument details
   */
  StandardFactory.prototype.forEachModelPropField = function (callback, thisArg) {
    thisArg = thisArg || this;
    if (thisArg.schema) {
      thisArg.schema.forEachModelProp(callback, thisArg);
    }
  };

  /**
   * Return a list of ModfelProps in this schema that match the specified criteria
   * @param {object} args Criteria to match, 
   *                      @see ModelProp.prototype.matches() for details
   * @return {array}  Array of matching modelProp objects
   */
  StandardFactory.prototype.getModelPropList = function (args, thisArg) {
    var result = [];
    thisArg = thisArg || this;
    if (thisArg.schema) {
      result = thisArg.schema.getModelPropList(args);
    }
    return result;
  };

  // need the return here so that object prototype functions are added
  return factory;
}



