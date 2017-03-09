/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      {
        field: 'AVAILABLE', modelName: 'available',
        dfltValue: true, type: SCHEMA_CONST.FIELD_TYPES.BOOLEAN
      },
      {
        field: 'DONTCANVASS', modelName: 'dontCanvass',
        dfltValue: false, type: SCHEMA_CONST.FIELD_TYPES.BOOLEAN
      },
      {
        field: 'TRYAGAIN', modelName: 'tryAgain',
        dfltValue: false, type: SCHEMA_CONST.FIELD_TYPES.BOOLEAN
      },
      {
        field: 'SUPPORT', modelName: 'support',
        dfltValue: -1, type: SCHEMA_CONST.FIELD_TYPES.NUMBER
      },
      {
        field: 'DATE', modelName: 'date',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.DATE
      },
      {
        field: 'ANSWERS', modelName: 'answers',
        dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY
      },
      {
        field: 'CANVASSER', modelName: 'canvasser', factory: 'userFactory',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'VOTER', modelName: 'voter', factory: 'peopleFactory',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'ADDRESS', modelName: 'address', factory: 'addressFactory',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      SCHEMA_CONST.CREATEDAT,
      SCHEMA_CONST.UPDATEDAT
    ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('canvassresult'),
      schema = schemaProvider.getSchema('CanvassResult', modelProps, ids, ID_TAG),
      CANVASSRES_AVAILABLE_IDX =
        schema.addFieldFromModelProp('available', 'Available', ids.AVAILABLE),
      CANVASSRES_DONTCANVASS_IDX =
        schema.addFieldFromModelProp('dontCanvass', 'Don\'t Canvass', ids.DONTCANVASS),
      CANVASSRES_TRYAGAIN_IDX =
        schema.addFieldFromModelProp('tryAgain', 'Try Again', ids.TRYAGAIN),
      CANVASSRES_SUPPORT_IDX =
        schema.addFieldFromModelProp('support', 'Support', ids.SUPPORT),
      CANVASSRES_DATE_IDX =
        schema.addFieldFromModelProp('date', 'Date', ids.DATE),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                      [CANVASSRES_AVAILABLE_IDX, CANVASSRES_DONTCANVASS_IDX, CANVASSRES_TRYAGAIN_IDX, CANVASSRES_SUPPORT_IDX, CANVASSRES_DATE_IDX],
                      ID_TAG);

    $provide.constant('CANVASSRES_SCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      CANVASSRES_AVAILABLE_IDX: CANVASSRES_AVAILABLE_IDX,
      CANVASSRES_DONTCANVASS_IDX: CANVASSRES_DONTCANVASS_IDX,
      CANVASSRES_TRYAGAIN_IDX: CANVASSRES_TRYAGAIN_IDX,
      CANVASSRES_SUPPORT_IDX: CANVASSRES_SUPPORT_IDX,
      CANVASSRES_DATE_IDX: CANVASSRES_DATE_IDX,

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

canvassResultFactory.$inject = ['$resource', '$injector', '$filter', 'baseURL', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'surveyFactory',
  'addressFactory', 'electionFactory', 'userFactory', 'SCHEMA_CONST', 'CANVASSRES_SCHEMA', 'consoleService'];
function canvassResultFactory($resource, $injector, $filter, baseURL, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, surveyFactory,
  addressFactory, electionFactory, userFactory, SCHEMA_CONST, CANVASSRES_SCHEMA, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'canvassResultFactory',
      getCanvassResult: getCanvassResult,
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,
      setFilter: setFilter,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      forEachSchemaField: forEachCanvassResSchemaField,
      getSortOptions: getSortOptions,
      getSortFunction: getSortFunction
    },
    con = consoleService.getLogger(factory.NAME),
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: CANVASSRES_SCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    });
  
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
      args = {};
    }
    if (!args.convert) {
      args.convert = readRspObjectValueConvert;
    }
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = CANVASSRES_SCHEMA.SCHEMA.read(response, stdArgs);

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
      case CANVASSRES_SCHEMA.IDs.CREATED:
      case CANVASSRES_SCHEMA.IDs.UPDATED:
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
   *                                @see surveyFactory.readResponse() for details
   *    {object}        electionArgs arguments to process embedded election sub doc, 
   *                                @see electionFactory.readResponse() for details
   *    {function}      next        function to call after processing
   * @return {object}   Canvass object
   */
  function readResponse (response, args) {

    var result = readRspObject(response, args);
    return storeRspObject(result, args);
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
   *                                @see surveyFactory.readResponse() for details
   *    {object}        electionArgs arguments to process embedded election sub doc, 
   *                                @see electionFactory.readResponse() for details
   *    {function}      next        function to call after processing
   * @return {object}   Canvass object
   */
  function storeRspObject(canvassRes, args) {

    con.debug('Store canvass result response: ' + canvassRes);

    // just basic storage args as subdocs have been processed above
    var storeArgs = resourceFactory.copyBasicStorageArgs(args, {
        factory: $injector.get(factory.NAME)
      });

    return resourceFactory.storeServerRsp(canvassRes, storeArgs);
  }

  /**
   * Create storeFactory id
   * @param {string}   id   Factory id to generate storeFactory id from
   */
  function storeId (id) {
    return CANVASSRES_SCHEMA.ID_TAG + id;
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
    var filter = filterFactory.newResourceFilter(CANVASSRES_SCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }
  
  /**
   * Generate a filtered list
   * @param {object} reslist    canvass result ResourceList object to filter
   * @param {object} filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array} filtered list
   */
  function getFilteredList (reslist, filter, xtraFilter) {
    // canvass result specific filter function
    return filterFactory.getFilteredList('filterCanvassResult', reslist, filter, xtraFilter);
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
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === CANVASSRES_SCHEMA.ID_TAG) {
        switch (sortItem.index) {
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
          case CANVASSRES_SCHEMA.CANVASSRES_DATE_IDX:
            sortFxn = compareDate;
            break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

  /**
   * Compare objects based on 'available' property
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareAvailable (a, b) {
    return compareFactory.compareBooleanFields(CANVASSRES_SCHEMA.SCHEMA, CANVASSRES_SCHEMA.CANVASSRES_AVAILABLE_IDX, a, b);
  }

  /**
   * Compare objects based on 'dont canvass' property
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareDontCanvass (a, b) {
    return compareFactory.compareBooleanFields(CANVASSRES_SCHEMA.SCHEMA, CANVASSRES_SCHEMA.CANVASSRES_DONTCANVASS_IDX, a, b);
  }

  /**
   * Compare objects based on 'try again' property
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareTryAgain (a, b) {
    return compareFactory.compareBooleanFields(CANVASSRES_SCHEMA.SCHEMA, CANVASSRES_SCHEMA.CANVASSRES_TRYAGAIN_IDX, a, b);
  }

  /**
   * Compare objects based on 'support' property
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareSupport (a, b) {
    return compareFactory.compareNumberFields(CANVASSRES_SCHEMA.SCHEMA, CANVASSRES_SCHEMA.CANVASSRES_SUPPORT_IDX, a, b);
  }
  
  /**
   * Compare objects based on 'date' property
   * @param {object}  a       First object to compare
   * @param {object}  b       Second object to compare
   * @returns {number} < 0 if a comes before b, 0 if no difference, and > 0 if b comes before a
   */
  function compareDate (a, b) {
    return compareFactory.compareDateFields(CANVASSRES_SCHEMA.SCHEMA, CANVASSRES_SCHEMA.CANVASSRES_DATE_IDX, a, b);
  }
  
}

