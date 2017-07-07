/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'USERSCHEMA', 'PEOPLESCHEMA', 'ADDRSCHEMA', 'ANSWERSCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, USERSCHEMA, PEOPLESCHEMA, ADDRSCHEMA, ANSWERSCHEMA) {

    var details = [
      SCHEMA_CONST.ID,
      schemaProvider.getBooleanModelPropArgs('available', true, { field: 'AVAILABLE' }),
      schemaProvider.getBooleanModelPropArgs('dontCanvass', false, { field: 'DONTCANVASS' }),
      schemaProvider.getBooleanModelPropArgs('tryAgain', false, { field: 'TRYAGAIN' }),
      schemaProvider.getNumberModelPropArgs('support', -1, { field: 'SUPPORT' }),
      schemaProvider.getDateModelPropArgs('date', undefined, { field: 'DATE' }),
      schemaProvider.getObjectIdArrayModelPropArgs('answers', 'answerFactory', 'answer', ANSWERSCHEMA, ANSWERSCHEMA.IDs.ID, { field: 'ANSWERS' }),
      schemaProvider.getObjectIdModelPropArgs('canvasser', 'userFactory', 'user', USERSCHEMA, USERSCHEMA.IDs.ID, { field: 'CANVASSER' }),
      schemaProvider.getObjectIdModelPropArgs('voter', 'peopleFactory', 'person', PEOPLESCHEMA, PEOPLESCHEMA.IDs.ID, { field: 'VOTER' }),
      schemaProvider.getObjectIdModelPropArgs('address', 'addressFactory', 'address', ADDRSCHEMA, ADDRSCHEMA.IDs.ID, { field: 'ADDRESS' }),
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
  }])

  .factory('canvassResultFactory', canvassResultFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

canvassResultFactory.$inject = ['$injector', '$filter', 'baseURL', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'surveyFactory',
  'addressFactory', 'electionFactory', 'userFactory', 'miscUtilFactory', 'SCHEMA_CONST', 'CANVASSRES_SCHEMA', 'consoleService'];
function canvassResultFactory($injector, $filter, baseURL, storeFactory, resourceFactory, compareFactory, filterFactory, surveyFactory,
  addressFactory, electionFactory, userFactory, miscUtilFactory, SCHEMA_CONST, CANVASSRES_SCHEMA, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'canvassResultFactory',
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,

      getSortFunction: getSortFunction,

      filterResultsLatestPerAddress: filterResultsLatestPerAddress
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: CANVASSRES_SCHEMA.ID_TAG,
    schema: CANVASSRES_SCHEMA.SCHEMA,
    sortOptions: CANVASSRES_SCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      result: resourceFactory.getResourceConfigWithId('canvassresult', {
                        saveMany: { method: 'POST', isArray: true }
                      })
    }
  });
  
  return factory;

  /* function implementation
    -------------------------- */

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
  
  
  /**
   * Filter an array of results to give a list of the latest results for each address
   * @param   {Array} resArray Result array to filter
   * @returns {Array} New array containing filtered values
   */
  function filterResultsLatestPerAddress (resArray) {
    var i,
      filteredList = filterFactory.filterArray(
        resArray.slice(),
        function (a, b) {
          // sort list in descending date order
          return compareFactory.compareDate(a.updatedAt, b.updatedAt, '-');
        },                                           
        function (value, index, array) {
          // exclude value from filtered list if newer entry already in list
          var noneNewer = true;
          for (i = index - 1; (i >= 0) && noneNewer; --i) {
            noneNewer = (array[i].address._id !== value.address._id);
          }
          return noneNewer;
      });
    return filteredList;
  }
  
  
}

