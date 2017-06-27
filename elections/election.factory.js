/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'VOTINGSYSSCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, VOTINGSYSSCHEMA) {

    var details = [
      SCHEMA_CONST.ID,
      schemaProvider.getStringModelPropArgs('name', { field: 'NAME' }),
      schemaProvider.getStringModelPropArgs('description', { field: 'DESCRIPTION' }),
      schemaProvider.getNumberModelPropArgs('seats', 0, { field: 'SEATS' }),
      schemaProvider.getDateModelPropArgs('electionDate', undefined, { field: 'ELECTIONDATE' }),
      schemaProvider.getObjectIdModelPropArgs('system', 'votingsystemFactory', 'system', VOTINGSYSSCHEMA, VOTINGSYSSCHEMA.IDs.ID, { field: 'SYSTEM' }),
      schemaProvider.getObjectIdArrayModelPropArgs('candidates', undefined, undefined, undefined, undefined, { field: 'CANDIDATES' })
    ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('election'),
      schema = schemaProvider.getSchema('Election', modelProps, ids, ID_TAG),
      ELECTION_NAME_IDX =
        schema.addFieldFromModelProp('name', 'Name', ids.NAME),
      ELECTION_DESCRIPTION_IDX =
        schema.addFieldFromModelProp('description', 'Description', ids.DESCRIPTION),
      ELECTION_SEATS_IDX =
        schema.addFieldFromModelProp('seats', 'Seats', ids.SEATS),
      ELECTION_ELECTIONDATE_IDX =
        schema.addFieldFromModelProp('date', 'Election Date', ids.ELECTIONDATE),
      ELECTION_SYSTEM_IDX =
        schema.addFieldFromModelProp('system', 'System', ids.SYSTEM),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                [ELECTION_NAME_IDX, ELECTION_SEATS_IDX, ELECTION_ELECTIONDATE_IDX, ELECTION_SYSTEM_IDX],
                ID_TAG);

    $provide.constant('ELECTIONSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      ELECTION_NAME_IDX: ELECTION_NAME_IDX,
      ELECTION_DESCRIPTION_IDX: ELECTION_DESCRIPTION_IDX,
      ELECTION_SEATS_IDX: ELECTION_SEATS_IDX,
      ELECTION_ELECTIONDATE_IDX: ELECTION_ELECTIONDATE_IDX,
      ELECTION_SYSTEM_IDX: ELECTION_SYSTEM_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  }])

  .factory('electionFactory', electionFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

electionFactory.$inject = ['$injector', '$filter', 'storeFactory', 'resourceFactory', 'filterFactory', 'consoleService',
  'miscUtilFactory', 'SCHEMA_CONST', 'ELECTIONSCHEMA'];

function electionFactory($injector, $filter, storeFactory, resourceFactory, filterFactory, consoleService, 
  miscUtilFactory, SCHEMA_CONST, ELECTIONSCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'electionFactory',
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,

      getSortFunction: getSortFunction
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: ELECTIONSCHEMA.ID_TAG,
    schema: ELECTIONSCHEMA.SCHEMA,
    sortOptions: ELECTIONSCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      election: resourceFactory.getResourceConfigWithId('elections'),
    }
  });
  
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response election object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  election object
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
      object = ELECTIONSCHEMA.SCHEMA.read(response, stdArgs);

    con.debug('Read election rsp object: ' + object);

    return object;
  }

  /**
   * Convert values read from a server election response
   * @param {number}    schema id 
   * @param {object}    read value
   * @returns {object}  Converted value
   */
  function readRspObjectValueConvert (id, value) {
    switch (id) {
      case ELECTIONSCHEMA.IDs.ELECTIONDATE:
        value = new Date(value);
        break;
      default:
        // other fields require no conversion
        break;
    }
    return value;
  }


  /**
   * Read an election response from the server and store it
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array} objId      id/array of ids of election object to save response data to
   *    {number}       flags      storefactory flags
   *    {function}     next       function to call after processing
   * @return {object}  election ResourceList object
   */
  function readResponse (response, args) {
    var election = readRspObject(response, args);
    return storeRspObject(election, args);
  }

  /**
   * Store an election object
   * @param {object}   obj        Object to store
   * @param {object}   args       process arguments object as per resourceFactory.storeServerRsp()
   *                              without 'factory' argument
   *                              @see resourceFactory.storeServerRsp()
   * @return {object}  election ResourceList object
   */
  function storeRspObject (obj, args) {
    var storeArgs = miscUtilFactory.copyAndAddProperties(args, {
      factory: $injector.get(factory.NAME)
    });
    return resourceFactory.storeServerRsp(obj, storeArgs);
  }

  function getSortFunction(options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === ELECTIONSCHEMA.ID_TAG) {
        switch (sortItem.index) {
//          case ELECTIONSCHEMA.ELECTION_NAME_IDX:
//            sortFxn = compareAddress;
//            break;
//          case ELECTIONSCHEMA.ELECTION_SEATS_IDX:
//            sortFxn = compareCity;
//            break;
//          case ELECTIONSCHEMA.ELECTION_ELECTIONDATE_IDX:
//            sortFxn = compareCounty;
//            break;
//          case ELECTIONSCHEMA.ELECTION_SYSTEM_IDX:
//            sortFxn = comparePostcode;
//            break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

}


