/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider) {

    var details = [
      { field: 'ID', modelName: '_id', dfltValue: undefined },
      { field: 'AVAILABLE', modelName: 'available', dfltValue: true },
      { field: 'DONTCANVASS', modelName: 'dontCanvass', dfltValue: false },
      { field: 'TRYAGAIN', modelName: 'tryAgain', dfltValue: false },
      { field: 'SUPPORT', modelName: 'support', dfltValue: -1 },
      { field: 'DATE', modelName: 'date', dfltValue: undefined },
      { field: 'ANSWERS', modelName: 'answers', dfltValue: [] },
      { field: 'CANVASSER', modelName: 'canvasser', dfltValue: undefined },
      { field: 'VOTER', modelName: 'voter', dfltValue: undefined },
      { field: 'ADDRESS', modelName: 'address', dfltValue: undefined }
    ],
      ids = {},
      names = [],
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index
      names.push(details[i].modelName);
      modelProps.push({
        id: i,
        modelName: details[i].modelName, 
        dfltValue: details[i].dfltValue
      });
    }

    var ID_TAG = 'canvassresult.',
      schema = schemaProvider.getSchema('CanvassResult', modelProps),
      CANVASSRES_AVAILABLE_IDX =
        schema.addField('available', 'Available', names[ids.AVAILABLE], ID_TAG),
      CANVASSRES_DONTCANVASS_IDX =
        schema.addField('dontCanvass', 'Don\'t Canvass', names[ids.DONTCANVASS], ID_TAG),
      CANVASSRES_TRYAGAIN_IDX =
        schema.addField('tryAgain', 'Try Again', names[ids.TRYAGAIN], ID_TAG),
      CANVASSRES_SUPPORT_IDX =
        schema.addField('support', 'Support', names[ids.SUPPORT], ID_TAG),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                      [CANVASSRES_AVAILABLE_IDX, CANVASSRES_DONTCANVASS_IDX, CANVASSRES_TRYAGAIN_IDX, CANVASSRES_SUPPORT_IDX],
                      ID_TAG);

    $provide.constant('CANVASSRES_SCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      NAMES: names, // model names
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      CANVASSRES_AVAILABLE_IDX: CANVASSRES_AVAILABLE_IDX,
      CANVASSRES_DONTCANVASS_IDX: CANVASSRES_DONTCANVASS_IDX,
      CANVASSRES_TRYAGAIN_IDX: CANVASSRES_TRYAGAIN_IDX,
      CANVASSRES_SUPPORT_IDX: CANVASSRES_SUPPORT_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG,

      SUPPORT_UNKNOWN: -1,  // -1 represents unknown
      SUPPORT_MIN: 0,
      SUPPORT_MAX: 10       // 0-10 represents none to full support

    });
  })

  .filter('filterCanvassResult', ['SCHEMA_CONST', 'utilFactory', 'miscUtilFactory', function (SCHEMA_CONST, utilFactory, miscUtilFactory) {

    function filterCanvassResultFilter(input, schema, filterBy) {

      // canvass result specific filter function

      // TODO filter canvass result function
      return input;
    }

    return filterCanvassResultFilter;
  }])

  .factory('canvassResultFactory', canvassResultFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

canvassResultFactory.$inject = ['$resource', '$injector', '$filter', 'baseURL', 'storeFactory', 'resourceFactory', 'miscUtilFactory', 'surveyFactory',
  'addressFactory', 'electionFactory', 'userFactory', 'CANVASSRES_SCHEMA', 'consoleService'];
function canvassResultFactory($resource, $injector, $filter, baseURL, storeFactory, resourceFactory, miscUtilFactory, surveyFactory,
  addressFactory, electionFactory, userFactory, CANVASSRES_SCHEMA, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      getCanvassResult: getCanvassResult,
      readRspObject: readRspObject,
      readCanvassResultRsp: readCanvassResultRsp,
      storeRspObject: storeRspObject,
      newObj: newObj,
      duplicateObj: duplicateObj,
      delObj: delObj,
      setObj: setObj,
      getObj: getObj,
      initObj: initObj,
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
      forEachSchemaField: forEachCanvassResSchemaField,
      getSortOptions: getSortOptions,
      getSortFunction: getSortFunction,
      isDescendingSortOrder: isDescendingSortOrder,
    },
    con = consoleService.getLogger('canvassResultFactory');
  
  return factory;

  /* function implementation
    -------------------------- */

  function getCanvassResult() {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };

      add custom update & multiple save methods
    */
    return $resource(baseURL + 'canvassresult/:id', { id: '@id' },
                      {'update': {method: 'PUT'},
                       'saveMany': {method: 'POST', isArray: true}
                      });
  }
  
  
  /**
   * Read a server response canvass result object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  Canvass object
   */
  function readRspObject (response, args) {
    if (!args) {
      args = {
        convert: readRspObjectValueConvert
      };
    }
    var object = CANVASSRES_SCHEMA.SCHEMA.readProperty(response, args);

    con.debug('Read canvass result rsp object: ' + object);

    return object;
  }

  /**
   * Convert values read from a server canvass result response
   * @param {number}    schema id 
   * @param {object}    read value
   * @returns {object}  Converted value
   */
  function readRspObjectValueConvert(id, value) {
    switch (id) {
      case CANVASSRES_SCHEMA.IDs.DATE:
        value = new Date(value);
        break;
      default:
        // other fields require no conversion
        break;
    }
    return value;
  }

  /**
   * Read a canvass result response from the server
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array}  objId       id/array of ids of canvass & survey objects to save response data to
   *    {string|Array}  addrId      id/array of ids of list object(s) to save address data to
   *    {string|Array}  userId      id/array of ids of list object to save canvasser data to
   *    {number}        flags       storefactory flags
   *    {object}        surveyArgs  arguments to process embedded survey sub doc, 
   *                                @see surveyFactory.readSurveyRsp() for details
   *    {object}        electionArgs arguments to process embedded election sub doc, 
   *                                @see electionFactory.readElectionRsp() for details
   *    {function}      next        function to call after processing
   * @return {object}   Canvass object
   */
  function readCanvassResultRsp (response, args) {

    var canvass = readRspObject(response);
    return storeRspObject(canvass, args);
  }

  /**
   * Store a canvass result response from the server
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array}  objId       id/array of ids of canvass & survey objects to save response data to
   *    {string|Array}  addrId      id/array of ids of list object(s) to save address data to
   *    {string|Array}  userId      id/array of ids of list object to save canvasser data to
   *    {number}        flags       storefactory flags
   *    {object}        surveyArgs  arguments to process embedded survey sub doc, 
   *                                @see surveyFactory.readSurveyRsp() for details
   *    {object}        electionArgs arguments to process embedded election sub doc, 
   *                                @see electionFactory.readElectionRsp() for details
   *    {function}      next        function to call after processing
   * @return {object}   Canvass object
   */
  function storeRspObject(canvassRes, args) {

    var flags = (args.flags || storeFactory.NOFLAG),
      array;

    con.debug('Store canvass result response: ' + canvassRes);

    var storeArgs = miscUtilFactory.copyProperties(args, {
      factory: $injector.get('canvassResultFactory')
    }, ['objId', 'flags', 'storage', 'next']);

    return resourceFactory.storeServerRsp(canvassRes, storeArgs);
  }

  /**
   * Copy an array between objects.
   * @param {object} from   Object to copy from
   * @param {object} to     Object to copy to
   * @param {string} name   Name fo array property
   */
  function readArray (from, to, name) {
    if (from[name]) {
      to[name] = from[name];
    } else {
      to[name] = [];
    }
    return to[name];
  }
  
  /**
   * Create storeFactory id
   * @param {string}   id   Factory id to generate storeFactory id from
   */
  function storeId (id) {
    return CANVASSRES_SCHEMA.ID_TAG + id;
  }
  
  /**
   * Create a new canvass result object
   * @param {string} id     Factory id of new object
   * @param {number} flags  storefactory flags
   */
  function newObj (id, flags) {
    return storeFactory.newObj(storeId(id), CANVASSRES_SCHEMA.SCHEMA.getObject(), flags);
  }
  
  /**
   * Create a new canvass result object by duplicating an existing object
   * @param {string} id     Factory id of new object
   * @param {string} srcId  Factory id of object to duplicate
   * @param {number} flags  storefactory flags
   */
  function duplicateObj (id, srcId, flags) {
    return storeFactory.duplicateObj(storeId(id), storeId(srcId), flags);
  }
  
  /**
   * Delete a canvass result object
   * @param {string} id     Factory id of object to delete
   * @param {number} flags  storefactory flags
   */
  function delObj (id, flags) {
    return storeFactory.delObj(storeId(id), flags);
  }

  /**
   * Set a canvass result object
   * @param {string} id     Factory id of object to set
   * @param {object} id     data to set
   * @param {number} flags  storefactory flags
   */
  function setObj (id, data, flags) {
    return storeFactory.setObj(storeId(id), data, flags, CANVASSRES_SCHEMA.SCHEMA.getObject());
  }
  
  /**
   * Get a canvass result object
   * @param {string} id     Factory id of object to get
   * @param {number} flags  storefactory flags
   */
  function getObj (id, flags) {
    return storeFactory.getObj(storeId(id), flags);
  }
  
  /**
   * Initialise a canvass result object
   * @param {string} id     Factory id of object to init
   */
  function initObj (id) {
    setObj(id, CANVASSRES_SCHEMA.SCHEMA.getObject());
  }
  
  /**
   * Create a new canvass result ResourceList object
   * @param   {string} id   Id of list
   * @param {object} args Argument object with the following properties:
   *   {string} id                          Id of list
   *   {string} title                       Title of list
   *   {Array}  list                        base list to use
   *   {number} [flags=storeFactory.NOFLAG] storeFactory flags
   * @returns {object} canvass result ResourceList object
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
    listArgs.factory = 'canvassResultFactory';

    return resourceFactory.newResourceList(storeId(id), listArgs);
  }
  
  /**
   * Create a new canvass result ResourceList object by duplicating an existing object
   * @param {string} id     Factory id of new object
   * @param {string} srcId  Factory id of object to duplicate
   * @param {number} flags  storefactory flags
   * @returns {object} canvass result ResourceList object
   */
  function duplicateList(id, srcId, flags) {
    return resourceFactory.duplicateList(storeId(id), storeId(srcId), flags);
  }

  /**
   * Delete a canvass result ResourceList object
   * @param {string} id     Factory id of object
   * @param {number} flags  storefactory flags
   * @returns {object} copy of deleted canvass result ResourceList object or true/false
   */
  function delList (id, flags) {
    return resourceFactory.delResourceList(storeId(id), flags);
  }
  
  /**
   * Update a canvass result ResourceList object
   * @param {string} id     Factory id of object
   * @param {Array}  list   base list to use
   * @param {number} flags  storefactory flags
   * @param {string} title  Title of list if new list may be created
   * @returns {object} canvass result ResourceList object
   */
  function setList(id, list, flags, title) {
    return resourceFactory.setResourceList(storeId(id), list, flags, function (flag) {
      return newList(id, title, list, flag);
    });
  }
  
  /**
   * Get a canvass result ResourceList object
   * @param {string} id     Factory id of object
   * @param {number} flags  storefactory flags
   * @returns {object} canvass result ResourceList object
   */
  function getList(id, flags) {
    return resourceFactory.getResourceList(storeId(id), flags);
  }
  
  /**
   * Initialise a canvass result ResourceList object to an empty list
   * @param {string} id     Factory id of object
   * @param {number} flags  storefactory flags
   * @returns {object} canvass result ResourceList object
   */
  function initList(id, flags) {
    return resourceFactory.initResourceList(storeId(id), flags);
  }
    
  /**
   * Set the filter for a canvass result ResourceList object
   * @param {string} id     Factory id of object
   * @param   {object} [filter={}] Filter object to use, ResourceFilter object or no filter
   * @param {number} flags  storefactory flags
   * @returns {object} canvass result ResourceList object
   */
  function setFilter(id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  /**
   * Set the pager for a canvass result ResourceList object
   * @param {string} id     Factory id of object
   * @param   {object} [filter={}] Filter object to use, ResourceFilter object or no filter
   * @param {number} flags  storefactory flags
   * @returns {object} canvass result ResourceList object
   */
  function setPager(id, pager, flags) {
    return resourceFactory.setPager(storeId(id), pager, flags);
  }

  /**
   * Apply filter to a canvass result ResourceList object
   * @param {string} id     Factory id of object
   * @param {object} filter filter to use or preset filter is used if undefined
   * @param {number} flags  storefactory flags
   * @returns {object} canvass result ResourceList object
   */
  function applyFilter(id, filter, flags) {
    return resourceFactory.applyFilter(storeId(id), filter, flags);
  }

  /**
   * Get the default sort options for a canvass result ResourceList object
   * @returns {object} canvass result ResourceList sort options
   */
  function getSortOptions() {
    return CANVASSRES_SCHEMA.SORT_OPTIONS;
  }

  /**
   * Execute the callback on each of the schema fields
   */
  function forEachCanvassResSchemaField(callback) {
    CANVASSRES_SCHEMA.SCHEMA.forEachField(callback);
  }
  
  /**
   * Get a new filter object
   * @param {object} base           filter base object
   * @param {function} customFilter custom filter function
   * @returns {object} canvass result ResourceList filter object
   */
  function newFilter(base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = resourceFactory.newResourceFilter(CANVASSRES_SCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }
  
  /**
   * Generate a filtered list
   * @param {object} reslist    canvass result ResourceList object to filter
   * @param {object} filter     filter to apply
   * @returns {Array} filtered list
   */
  function getFilteredList(reslist, filter) {
    // canvass result specific filter function
    return $filter('filterCanvassResult')(reslist.list, reslist.filter.schema, filter);
  }
  
  /**
   * Default canvass result ResourceList custom filter function
   * @param {object} reslist    canvass result ResourceList object to filter
   * @param {object} filter     filter to apply
   */
  function filterFunction(reslist, filter) {
    // canvass result specific filter function
    reslist.filterList = getFilteredList(reslist, filter);
  }
  
  /**
   * Get the sort function for a canvass result ResourceList
   * @param   {object} sortOptions  List of possible sort option
   * @param   {object} sortBy       Key to sort by
   * @returns {function} sort function
   */
  function getSortFunction(options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'string') {
      // decode id to get function
      var index = parseInt(sortFxn.substring(CANVASSRES_SCHEMA.ID_TAG.length));
      switch (index) {
        case CANVASSRES_SCHEMA.CANVASSRES_AVAILABLE_IDX:
          sortFxn = compareAvailable;
          break;
        case CANVASSRES_SCHEMA.CANVASSRES_DONTCANVASS_IDX:
          sortFxn = compareDontCanvass;
          break;
        case CANVASSRES_SCHEMA.CANVASSRES_TRYAGAIN_IDX:
          sortFxn = compareTryAgain;
          break;
        case CANVASSRES_SCHEMA.CANVASSRES_SUPPORT_IDX:
          sortFxn = compareSupport;
          break;
        default:
          sortFxn = undefined;
          break;
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

  /**
   * Compare objects based on 'available' property
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareAvailable (a, b) {
    return resourceFactory.compareBooleanFields(CANVASSRES_SCHEMA.SCHEMA, CANVASSRES_SCHEMA.CANVASSRES_AVAILABLE_IDX, a, b);
  }

  /**
   * Compare objects based on 'dont canvass' property
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareDontCanvass (a, b) {
    return resourceFactory.compareBooleanFields(CANVASSRES_SCHEMA.SCHEMA, CANVASSRES_SCHEMA.CANVASSRES_DONTCANVASS_IDX, a, b);
  }

  /**
   * Compare objects based on 'try again' property
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareTryAgain (a, b) {
    return resourceFactory.compareBooleanFields(CANVASSRES_SCHEMA.SCHEMA, CANVASSRES_SCHEMA.CANVASSRES_TRYAGAIN_IDX, a, b);
  }

  /**
   * Compare objects based on 'support' property
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareSupport (a, b) {
    return resourceFactory.compareNumberFields(CANVASSRES_SCHEMA.SCHEMA, CANVASSRES_SCHEMA.CANVASSRES_SUPPORT_IDX, a, b);
  }
  
}

