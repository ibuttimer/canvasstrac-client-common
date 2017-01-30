/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      { field: 'ID', modelName: '_id', dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID },
      { field: 'NAME', modelName: 'name', dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING },
      { field: 'DESCRIPTION', modelName: 'description', dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING },
      { field: 'SEATS', modelName: 'seats', dfltValue: 0, type: SCHEMA_CONST.FIELD_TYPES.NUMBER },
      { field: 'ELECTIONDATE', modelName: 'electionDate', dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.DATE },
      { field: 'SYSTEM', modelName: 'system', dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID },
      { field: 'CANDIDATES', modelName: 'candidates', dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY }
    ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index
      modelProps.push({
        id: i,
        modelName: details[i].modelName, 
        dfltValue: details[i].dfltValue,
        type: details[i].type
      });
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('election'),
      schema = schemaProvider.getSchema('Election', modelProps, ID_TAG),
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
  })

  .factory('electionFactory', electionFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

electionFactory.$inject = ['$resource', '$injector', '$filter', 'storeFactory', 'resourceFactory', 'consoleService',
  'miscUtilFactory', 'SCHEMA_CONST', 'ELECTIONSCHEMA'];

function electionFactory($resource, $injector, $filter, storeFactory, resourceFactory, consoleService, 
  miscUtilFactory, SCHEMA_CONST, ELECTIONSCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'electionFactory',
      getElections: getElections,
      readRspObject: readRspObject,
      readElectionRsp: readElectionRsp,
      storeRspObject: storeRspObject,
      setFilter:setFilter,
      getSortOptions: getSortOptions,
      forEachSchemaField: forEachElectionSchemaField,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      filterFunction: filterFunction,
      getSortFunction: getSortFunction
    },
    con = consoleService.getLogger(factory.NAME),
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: ELECTIONSCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    });
  
  return factory;

  /* function implementation
    -------------------------- */

  function getElections () {
    return resourceFactory.getResources('elections');
  }

  /**
   * Read a server response election object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  election object
   */
  function readRspObject (response, args) {
    if (!args) {
      args = {
        convert: readRspObjectValueConvert
      };
    }
    var election = ELECTIONSCHEMA.SCHEMA.readProperty(response, args);

    con.debug('Read election rsp object: ' + election);

    return election;
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
  function readElectionRsp (response, args) {
    var election = readRspObject(response);
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

  function storeId (id) {
    return ELECTIONSCHEMA.ID_TAG + id;
  }

  function setFilter(id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  function getSortOptions() {
    return ELECTIONSCHEMA.SORT_OPTIONS;
  }

  function forEachElectionSchemaField(callback) {
    ELECTIONSCHEMA.SCHEMA.forEachField(callback);
  }

  function newFilter(base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = resourceFactory.newResourceFilter(ELECTIONSCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }

  function getFilteredList(electionList, filter) {
    // election specific filter function
    return $filter('filterElection')(electionList.list, electionList.filter.schema, filter);
  }

  function filterFunction(electionList, filter) {
    // election specific filter function
    electionList.filterList = getFilteredList(electionList, filter);
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


