/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider, SCHEMA_CONST, PEOPLESCHEMA, ADDRSCHEMA) {

    var i, uidx = 0,
      ids = {},
      names = [],
      modelProps = [];

    /* TODO user schema needs more work!!
        - id fields in addr & person
     */

    // user schem is a combination of the person & address
    [PEOPLESCHEMA, ADDRSCHEMA].forEach(function (subSchema) {
      for (i = 0; i < subSchema.MODELPROPS.length; ++i, ++uidx) {
        ids[subSchema.IDs[i]] = uidx;          // id is index
        names.push(subSchema.NAMES[i]);
        modelProps.push({
          id: uidx,
          modelName: subSchema.MODELPROPS[i].modelName,
          dfltValue: subSchema.MODELPROPS[i].dfltValue
        });
      }
    });

    var ID_TAG = 'user.',
      schema = schemaProvider.getSchema('User', modelProps),
      sortOptions;
  
    [PEOPLESCHEMA, ADDRSCHEMA].forEach(function (subSchema) {
      subSchema.SCHEMA.forEachField(
        function (index, dialog, display, model, id) {
          schema.addField(dialog, display, model, id);
        });
    });

    // generate list of sort options
    sortOptions = angular.copy(PEOPLESCHEMA.SORT_OPTIONS);
    ADDRSCHEMA.SORT_OPTIONS.forEach(function (option) {
      var i, 
        basic = false;
      for (i = 0; !basic && (i < SCHEMA_CONST.BASIC_SORT_OPTIONS.length); ++i) {
        basic = (option.value === SCHEMA_CONST.BASIC_SORT_OPTIONS[i].value);
      }
      if (!basic) {
        sortOptions.push(option);
      }
    });

  
    $provide.constant('USERSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      NAMES: names, // model names
      MODELPROPS: modelProps,

      SCHEMA: schema,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  })

  .filter('filterUser', ['SCHEMA_CONST', 'PEOPLESCHEMA', 'ADDRSCHEMA', 'utilFactory', 'miscUtilFactory', function (SCHEMA_CONST, PEOPLESCHEMA, ADDRSCHEMA, utilFactory, miscUtilFactory) {
    
    function filterUserFilter (input, schema, filterBy) {
      
      // user specific filter function
      var out = [];

      if (!miscUtilFactory.isEmpty(filterBy)) {
        angular.forEach(input, function (user) {
          schema.forEachField(function(idx, dialog, display, models, id) {
            var filterVal = filterBy[dialog]; // filter uses dialog properties
            if (filterVal) {
              var userObj;
              if (id === PEOPLESCHEMA.ID_TAG) {
                userObj = user.person;  // person embedded object
              } else if (id === ADDRSCHEMA.ID_TAG) {
                userObj = user.person.address;  // address embedded object
              }
              if (userObj) {
                filterVal = filterVal.toLowerCase();
                // apply OR logic to multiple model fields
                var match = false;
                for (var j = 0; !match && (j < models.length); ++j) {
                  var userVal = userObj[models[j]];
                  if (userVal) {
                    match = (userVal.toLowerCase().indexOf(filterVal) >= 0);
                  }
                }
                if (match) {
                  out.push(user);
                }
              }
            }
          });
        });
      } else {
        out = input;
      }
      return out;
    }
    
    return filterUserFilter;
  }])

  .factory('userFactory', userFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

userFactory.$inject = ['$resource', '$injector', '$filter', 'storeFactory', 'resourceFactory', 'miscUtilFactory',
  'SCHEMA_CONST', 'USERSCHEMA', 'PEOPLESCHEMA', 'ADDRSCHEMA', 'peopleFactory', 'addressFactory'];

function userFactory($resource, $injector, $filter, storeFactory, resourceFactory, miscUtilFactory,
  SCHEMA_CONST, USERSCHEMA, PEOPLESCHEMA, ADDRSCHEMA, peopleFactory, addressFactory) {


  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    ID_TAG: USERSCHEMA.ID_TAG,
    getUsers: getUsers,
    getCount: getCount,
    newList: newList,
    duplicateList: duplicateList,
    delList: delList,
    setList: setList,
    getList: getList,
    initList: initList,
    setFilter: setFilter,
    setPager: setPager,
    applyFilter: applyFilter,
    newFilter: newFilter,
    getFilteredList: getFilteredList,
    forEachSchemaField: forEachUserSchemaField,
    getSortOptions: getSortOptions,
    getSortFunction: getSortFunction,
    isDescendingSortOrder: isDescendingSortOrder,
    getFilteredResource: getFilteredResource,
    readUserRsp: readUserRsp

  };
  
  return factory;

  /* function implementation
    -------------------------- */

  function getUsers () {
    return resourceFactory.getResources('users');
  }

  function getCount () {
    return resourceFactory.getCount('users');
  }
  
  function getFilteredResource (resList, filter, success, failure, forEachSchemaField) {
    
    filter = filter || newFilter();

    if (typeof filter === 'function') {
      forEachSchemaField = failure;
      failure = success;
      filter = newFilter();
    }
    if (!forEachSchemaField) {
      forEachSchemaField = forEachUserSchemaField;
    }

    var query = resourceFactory.buildQuery(forEachSchemaField, filter.filterBy);

    resList.setList([]);
    getUsers().query(query).$promise.then(
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
      function (response) {
        if (failure){
          failure(response);
        }
      }
    );
  }

  /**
   * Read a user response from the server
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object as per resourceFactory.storeServerRsp()
   *                              without 'factory' argument
   *                              @see resourceFactory.storeServerRsp()
   * @return {object}  user ResourceList object
   */
  function readUserRsp(response, args) {
    var storeArgs = miscUtilFactory.copyAndAddProperties(args, {
      factory: $injector.get('userFactory')
    });
    return resourceFactory.storeServerRsp(response, storeArgs);
  }

  /**
   * Create storefactory id
   * @param {string}   id       id within this factory
   * @return {string}  storefactory id
   */
  function storeId(id) {
    return USERSCHEMA.ID_TAG + id;
  }

  /**
   * Create a new user ResourceList object
   * @param   {string} id   Id of list
   * @param {object} args Argument object with the following properties:
   *   {string} id                          Id of list
   *   {string} title                       Title of list
   *   {Array}  list                        base list to use
   *   {number} [flags=storeFactory.NOFLAG] storeFactory flags
   * @returns {object} user ResourceList object
   */
  function newList (id, args) {
    var listArgs;
    if (args) {
      listArgs = angular.copy(args);
    } else {
      listArgs = {};
    }
    if (!listArgs.id) {
      listArgs.id = id;
    }
    listArgs.factory = 'userFactory';

    return resourceFactory.newResourceList(storeId(id), listArgs);

//    function newList (id, title, list, flags) {
//    return resourceFactory.newResourceList(storeId(id), {
//      id: id, 
//      title: title, 
//      list: list,
//      flags: flags,
//      factory: 'userFactory'
//    });
//    var resList = resourceFactory.newResourceList(storeId(id), id, title, list, flags);
//    if (resList) {
//      resList.factory = this;
//    }
//    return resList;
  }
  
  /**
   * Create a new user ResourceList object by duplicating an existing object
   * @param {string} id     Factory id of new object
   * @param {string} srcId  Factory id of object to duplicate
   * @param {number} flags  storefactory flags
   * @returns {object} user ResourceList object
   */
  function duplicateList(id, srcId, flags) {
    return resourceFactory.duplicateList(storeId(id), storeId(srcId), flags);
  }

  /**
   * Delete a user ResourceList object
   * @param {string} id     Factory id of object
   * @param {number} flags  storefactory flags
   * @returns {object} copy of deleted user ResourceList object or true/false
   */
  function delList (id, flags) {
    return resourceFactory.delResourceList(storeId(id), flags);
  }
  
  /**
   * Update a user ResourceList object
   * @param {string} id     Factory id of object
   * @param {Array}  list   base list to use
   * @param {number} flags  storefactory flags
   * @param {string} title  Title of list if new list may be created
   * @returns {object} user ResourceList object
   */
  function setList(id, list, flags, title) {
    return resourceFactory.setResourceList(storeId(id), list, flags, function (flag) {
      return newList(id, title, list, flag);
    });
  }
  
  /**
   * Get a user ResourceList object
   * @param {string} id     Factory id of object
   * @param {number} flags  storefactory flags
   * @returns {object} user ResourceList object
   */
  function getList(id, flags) {
    return resourceFactory.getResourceList(storeId(id), flags);
  }
  
  /**
   * Initialise a user ResourceList object to an empty list
   * @param {string} id     Factory id of object
   * @param {number} flags  storefactory flags
   * @returns {object} user ResourceList object
   */
  function initList(id, flags) {
    return resourceFactory.initResourceList(storeId(id), flags);
  }
    
  /**
   * Set the filter for a user ResourceList object
   * @param {string} id     Factory id of object
   * @param   {object} [filter={}] Filter object to use, ResourceFilter object or no filter
   * @param {number} flags  storefactory flags
   * @returns {object} user ResourceList object
   */
  function setFilter(id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  /**
   * Set the pager for a user ResourceList object
   * @param {string} id     Factory id of object
   * @param   {object} [filter={}] Filter object to use, ResourceFilter object or no filter
   * @param {number} flags  storefactory flags
   * @returns {object} user ResourceList object
   */
  function setPager(id, pager, flags) {
    return resourceFactory.setPager(storeId(id), pager, flags);
  }

  /**
   * Apply filter to a user ResourceList object
   * @param {string} id     Factory id of object
   * @param {object} filter filter to use or preset filter is used if undefined
   * @param {number} flags  storefactory flags
   * @returns {object} user ResourceList object
   */
  function applyFilter(id, filter, flags) {
    return resourceFactory.applyFilter(storeId(id), filter, flags);
  }

  /**
   * Get the default sort options for a user ResourceList object
   * @returns {object} user ResourceList sort options
   */
  function getSortOptions() {
    return USERSCHEMA.SORT_OPTIONS;
  }

  /**
   * Execute the callback on each of the schema fields
   */
  function forEachUserSchemaField(callback) {
    USERSCHEMA.SCHEMA.forEachField(callback);
  }
  
  /**
   * Get a new filter object
   * @param {object} base           filter base object
   * @param {function} customFilter custom filter function
   * @returns {object} user ResourceList filter object
   */
  function newFilter(base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = resourceFactory.newResourceFilter(USERSCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }
  
  /**
   * Generate a filtered list
   * @param {object} reslist    user ResourceList object to filter
   * @param {object} filter     filter to apply
   * @returns {Array} filtered list
   */
  function getFilteredList(reslist, filter) {
    // user specific filter function
    return $filter('filterUser')(reslist.list, reslist.filter.schema, filter);
  }
  
  /**
   * Default user ResourceList custom filter function
   * @param {object} reslist    user ResourceList object to filter
   * @param {object} filter     filter to apply
   */
  function filterFunction(reslist, filter) {
    // user specific filter function
    reslist.filterList = getFilteredList(reslist, filter);
  }
  
  /**
   * Get the sort function for a user ResourceList
   * @param   {object} sortOptions  List of possible sort option
   * @param   {object} sortBy       Key to sort by
   * @returns {function} sort function
   */
  function getSortFunction(options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'string') {
      // decode id to get function from another factory
      var idTag = sortFxn.substring(0, ADDRSCHEMA.ID_TAG.length);
      if (idTag === ADDRSCHEMA.ID_TAG) {
        sortFxn = addressFactory.getSortFunction (options, sortBy);
      } else {
        idTag = sortFxn.substring(0, PEOPLESCHEMA.ID_TAG.length);
        if (idTag === PEOPLESCHEMA.ID_TAG) {
          sortFxn = peopleFactory.getSortFunction (options, sortBy);
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
    return resourceFactory.isDescendingSortOrder(sortBy);
  }

}





