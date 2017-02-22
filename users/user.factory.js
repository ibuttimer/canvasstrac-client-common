/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider, SCHEMA_CONST, PEOPLESCHEMA, ADDRSCHEMA) {

    var i, uidx = 0,
      ids = {},
      modelProps = [],
      peoplePath,
      addressPath,
      subSchemaList,

      details = [
        SCHEMA_CONST.ID,
        {
          field: 'UNAME', modelName: 'username',
          dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
        },
        {
          field: 'ROLE', modelName: 'role', factory: 'roleFactory',
          dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
        },
        {
          field: 'PERSON', modelName: 'person', factory: 'peopleFactory',
          dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
        }
      ];

    // user schema is a combination of the person & address
    for (i = 0; i < details.length; ++i, ++uidx) {
      ids[details[i].field] = uidx;          // uidx is index

      var args = angular.copy(details[i]);
      args.id = uidx;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    peoplePath = modelProps[ids.PERSON].modelName; // path to person in user schema
    addressPath = [
      peoplePath,  // path to person in user schema
      PEOPLESCHEMA.SCHEMA.getModelName(PEOPLESCHEMA.IDs.ADDR) // path to address in person schema
    ];
    subSchemaList = [
      { schema: PEOPLESCHEMA, path: peoplePath },
      { schema: ADDRSCHEMA, path: addressPath }
    ];

    subSchemaList.forEach(function (subSchema) {
      var subId,
          subIds = [];  // unique ids for subschema items

      for (subId in subSchema.schema.IDs) {
        subIds.push(subSchema.schema.ID_TAG + subId);
      }

      for (i = 0; i < subSchema.schema.MODELPROPS.length; ++i, ++uidx) {
        ids[subIds[i]] = uidx;          // id is index

        var args = angular.copy(subSchema.schema.MODELPROPS[i]);
        args.id = uidx;
        args.modelPath = subSchema.path;
        modelProps.push(schemaProvider.getModelPropObject(args));
      }
    });

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('user'),
      schema = schemaProvider.getSchema('User', modelProps, ids, ID_TAG),

      USER_UNAME_IDX =
        schema.addFieldFromModelProp('uname', 'Username', ids.UNAME),

      sortOptions,  // user schema sort options
      sortOptionIndices = // dialog properties of sort options
        [schema.getField(USER_UNAME_IDX, SCHEMA_CONST.DIALOG_PROP)],
      sortOptArgs,
      constToProvide;

    subSchemaList.forEach(function (subSchema) {
      subSchema.schema.SCHEMA.forEachField(
        function (index, fieldProp) {
          schema.addField(
            fieldProp[SCHEMA_CONST.DIALOG_PROP],
            fieldProp[SCHEMA_CONST.DISPLAY_PROP],
            fieldProp[SCHEMA_CONST.MODEL_PROP],
            fieldProp[SCHEMA_CONST.TYPE_PROP], {
              path: subSchema.path,
              cb: function (field) {
                // save dialog property for index configuration
                sortOptionIndices.push(field.dialog);
              }
            });
        });
    });

    // generate list of sort options based on basic, person & address sort options
    sortOptions = schemaProvider.makeSortList(schema, [USER_UNAME_IDX], ID_TAG);

    sortOptArgs = {
      exOptions: SCHEMA_CONST.BASIC_SORT_OPTIONS,
      addTo: sortOptions,
      cb: function (option) {
        // decode option value to get dialog property
        var optVal = SCHEMA_CONST.DECODE_SORT_OPTION_VALUE(option.value),
          i;
        // set id to user tag & correct index
        for (i = 0; i < sortOptionIndices.length; ++i) {
          if (sortOptionIndices[i] === optVal.item) {
            option.id = SCHEMA_CONST.MAKE_SORT_ITEM_ID(ID_TAG, i);
            break;
          }
        }
      }
    };

    schemaProvider.makeSubDocSortList(
          PEOPLESCHEMA.SORT_OPTIONS, peoplePath, sortOptArgs);
    schemaProvider.makeSubDocSortList(
          ADDRSCHEMA.SORT_OPTIONS, addressPath, sortOptArgs);
  
    constToProvide = {
      ID_TAG: ID_TAG,
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      USER_UNAME_IDX: USER_UNAME_IDX,

      SCHEMA: schema,

      SORT_OPTIONS: sortOptions
    };

    $provide.constant('USERSCHEMA', constToProvide);
  })

  .filter('filterUser', ['SCHEMA_CONST', 'PEOPLESCHEMA', 'ADDRSCHEMA', 'miscUtilFactory', function (SCHEMA_CONST, PEOPLESCHEMA, ADDRSCHEMA, miscUtilFactory) {
    
    function filterUserFilter (input, schema, filterBy) {
      
      // user specific filter function
      var out = [];

      if (!miscUtilFactory.isEmpty(filterBy)) {
        var testCnt = 0,  // num of fields to test as speced by filter
          matchCnt;       // num of fields matching filter
        schema.forEachField(function(idx, fieldProp) {
          if (filterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]]) {  // filter uses dialog properties
            ++testCnt;
          }
        });
        angular.forEach(input, function (user) {
          matchCnt = 0;
          schema.forEachField(function(idx, fieldProp) {
            var filterVal = filterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]];  // filter uses dialog properties
            if (filterVal) {
              var userObj = user,
                path = fieldProp[SCHEMA_CONST.PATH_PROP];
              if (path) {
                for (var i = 0; !miscUtilFactory.isNullOrUndefined(userObj) && (i < path.length); ++i) {
                  userObj = userObj[path[i]];
                }
              }
              if (userObj) {
                filterVal = filterVal.toLowerCase();
                // apply OR logic to multiple model fields
                var match = false,
                  model = fieldProp[SCHEMA_CONST.MODEL_PROP];
                for (var j = 0; !match && (j < model.length); ++j) {
                  var userVal = userObj[model[j]];
                  if (userVal) {
                    match = (userVal.toLowerCase().indexOf(filterVal) >= 0);
                  }
                }
                if (match) {
                  ++matchCnt;
                  if (matchCnt === testCnt) {
                    out.push(user);
                  }
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

userFactory.$inject = ['$resource', '$injector', '$filter', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory',
  'SCHEMA_CONST', 'USERSCHEMA'];

function userFactory($resource, $injector, $filter, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory,
  SCHEMA_CONST, USERSCHEMA) {


  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'userFactory',
    getUsers: getUsers,
    getCount: getCount,
    setFilter: setFilter,
    newFilter: newFilter,
    getFilteredList: getFilteredList,
    forEachSchemaField: forEachUserSchemaField,
    getSortOptions: getSortOptions,
    getSortFunction: getSortFunction,
    getFilteredResource: getFilteredResource,
    readUserRsp: readUserRsp

  },
  stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: storeId,
    schema: USERSCHEMA.SCHEMA,
    addInterface: factory // add standard factory functions to this factory
  }),
  comparinators = [];
  
  // make an array of comparinator objects based on sort indices
  USERSCHEMA.SORT_OPTIONS.forEach(function (option) {
    if (option.id) {
      var itemId = SCHEMA_CONST.DECODE_SORT_ITEM_ID(option.id);
      if (!comparinators[itemId.index]) {
        comparinators[itemId.index] = 
          compareFactory.newComparinator(USERSCHEMA.SCHEMA, itemId.index);
      }
    }
  });
  
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
   * Read a server response user object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  user object
   */
//  function readRspObject (response, args) {
//    if (!args) {
//      args = {};
//    }
//    if (!args.convert) {
//      args.convert = readRspObjectValueConvert;
//    }
//    // add resources required by Schema object
//    resourceFactory.addResourcesToArgs(args);
//
//    var stdArgs = resourceFactory.standardiseArgs(args),
//      object = USERSCHEMA.SCHEMA.read(response, stdArgs);
//
//    con.debug('Read user rsp object: ' + object);
//
//    return object;
//  }

  /**
   * Convert values read from a server election response
   * @param {number}    schema id 
   * @param {object}    read value
   * @returns {object}  Converted value
   */
//  function readRspObjectValueConvert (id, value) {
//    switch (id) {
//      case ELECTIONSCHEMA.IDs.ELECTIONDATE:
//        value = new Date(value);
//        break;
//      default:
//        // other fields require no conversion
//        break;
//    }
//    return value;
//  }


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
      factory: $injector.get(factory.NAME)
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
    var filter = filterFactory.newResourceFilter(USERSCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }

  /**
   * Generate a filtered list
   * @param {object}   reslist    User ResourceList object to filter
   * @param {object}   filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}    filtered list
   */
  function getFilteredList (reslist, filter, xtraFilter) {
    // user specific filter function
    return filterFactory.getFilteredList('filterUser', reslist, filter, xtraFilter);
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
  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === USERSCHEMA.ID_TAG) {
        if (comparinators[sortItem.index]) {
          sortFxn = getComparinator(sortItem.index);
        }
      }
    } // else basic index sort or not found
    return sortFxn;
  }

  /**
   * Compare user objects based on username
   * @param   {object} a First user object
   * @param   {object} b Second user object
   * @returns {number} comparision result
   */
  function compareUsername (a, b) {
    return compareFactory.compareStringFields(USERSCHEMA.SCHEMA, USERSCHEMA.USER_UNAME_IDX, a, b);
  }

  /**
   * Wrapper function to return comparinator function
   * @param   {number}   index Inhex of comparinator to use
   * @returns {function} Function to pass to Array.sort()
   */
  function getComparinator (index) {
    return function (a, b) {
      return comparinators[index].compareFields(a, b);
    };
  }
}





