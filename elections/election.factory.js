/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider) {

    var details = [
      { field: 'ID', modelName: '_id', dfltValue: undefined },
      { field: 'NAME', modelName: 'name', dfltValue: '' },
      { field: 'DESCRIPTION', modelName: 'description', dfltValue: '' },
      { field: 'SEATS', modelName: 'seats', dfltValue: 0 },
      { field: 'ELECTIONDATE', modelName: 'electionDate', dfltValue: undefined },
      { field: 'SYSTEM', modelName: 'system', dfltValue: undefined },
      { field: 'CANDIDATES', modelName: 'candidates', dfltValue: [] }
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

    var ID_TAG = 'election.',
      schema = schemaProvider.getSchema('Election', modelProps),
      ELECTION_NAME_IDX =
        schema.addField('name', 'Name', names[ids.NAME], ID_TAG),
      ELECTION_DESCRIPTION_IDX =
        schema.addField('description', 'Description', names[ids.DESCRIPTION], ID_TAG),
      ELECTION_SEATS_IDX =
        schema.addField('seats', 'Seats', names[ids.SEATS], ID_TAG),
      ELECTION_ELECTIONDATE_IDX =
        schema.addField('date', 'Election Date', names[ids.ELECTIONDATE], ID_TAG),
      ELECTION_SYSTEM_IDX =
        schema.addField('system', 'System', names[ids.SYSTEM], ID_TAG),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                [ELECTION_NAME_IDX, ELECTION_DESCRIPTION_IDX, ELECTION_SEATS_IDX, ELECTION_ELECTIONDATE_IDX, ELECTION_SYSTEM_IDX],
                ID_TAG);

    $provide.constant('ELECTIONSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      NAMES: names, // model names
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
  'miscUtilFactory', 'ELECTIONSCHEMA'];

function electionFactory($resource, $injector, $filter, storeFactory, resourceFactory, consoleService, 
  miscUtilFactory, ELECTIONSCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      getElections: getElections,
      readRspObject: readRspObject,
      readElectionRsp: readElectionRsp,
      storeRspObject: storeRspObject,
      newList: newList,
      duplicateList: duplicateList,
      delList: delList,
      setList: setList,
      getList: getList,
      initList: initList,
      setFilter:setFilter,
      setPager: setPager,
      getSortOptions: getSortOptions,
      forEachSchemaField: forEachElectionSchemaField,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      filterFunction: filterFunction,
      getSortFunction: getSortFunction,
      isDescendingSortOrder: isDescendingSortOrder,
      newObj: newObj,
      duplicateObj: duplicateObj,
      delObj: delObj,
      setObj: setObj,
      getObj: getObj,
      initObj: initObj
    },
    con = consoleService.getLogger('electionFactory');

  
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
      factory: $injector.get('electionFactory')
    });
    return resourceFactory.storeServerRsp(obj, storeArgs);
  }

  function storeId (id) {
    return ELECTIONSCHEMA.ID_TAG + id;
  }

  /**
   * Create a new election ResourceList object
   * @param   {string} id                          Id of list
   * @param   {string} title                       Title of list
   * @param   {Array}  list                        base list to use
   * @param   {number} [flags=storeFactory.NOFLAG] storeFactory flags
   * @returns {object} election ResourceList object
   */
  function newList(id, title, list, flags) {
    return resourceFactory.newResourceList(storeId(id), {
      id: id, 
      title: title, 
      list: list,
      flags: flags,
      factory: 'electionFactory'
    });
  }

  /**
 * Create a new election ResourceList object by duplicating an existing object
 * @param {string} id     Factory id of new object
 * @param {string} srcId  Factory id of object to duplicate
 * @param {number} flags  storefactory flags
 */
  function duplicateList(id, srcId, flags) {
    return resourceFactory.duplicateList(storeId(id), storeId(srcId), flags);
  }

  function delList(id, flags) {
    return resourceFactory.delResourceList(storeId(id), flags);
  }

  function setList(id, list, flags, title) {
    return resourceFactory.setResourceList(storeId(id), list, flags, function (flag) {
      return newList(id, title, list, flag);
    });
  }

  function getList(id, flags) {
    return resourceFactory.getResourceList(storeId(id), flags);
  }

  function initList(id) {
    return resourceFactory.initResourceList(storeId(id));
  }

  function setFilter(id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  function setPager(id, pager, flags) {
    return resourceFactory.setPager(storeId(id), pager, flags);
  }

  function applyFilter(id, filter, flags) {
    return resourceFactory.applyFilter(storeId(id), filter, flags);
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
    //if (typeof sortFxn === 'string') {
    //  var idTag = sortFxn.substring(0, ADDRSCHEMA.ID_TAG.length);
    //  if (idTag === ADDRSCHEMA.ID_TAG) {
    //    sortFxn = addressFactory.getSortFunction(options, sortBy);
    //  } else {
    //    idTag = sortFxn.substring(0, PEOPLESCHEMA.ID_TAG.length);
    //    if (idTag === PEOPLESCHEMA.ID_TAG) {
    //      sortFxn = peopleFactory.getSortFunction(options, sortBy);
    //    }
    //  }
    //}
    return sortFxn;
  }

  function isDescendingSortOrder(sortBy) {
    return resourceFactory.isDescendingSortOrder(sortBy);
  }

  function newObj (id, flags) {
    return storeFactory.newObj(storeId(id), ELECTIONSCHEMA.SCHEMA.getObject(), flags);
  }

  function duplicateObj (id, srcId, flags) {
    return storeFactory.duplicateObj(storeId(id), storeId(srcId), flags);
  }

  function delObj (id, flags) {
    return storeFactory.delObj(storeId(id), flags);
  }

  function setObj (id, data, flags) {
    return storeFactory.setObj(storeId(id), data, flags, ELECTIONSCHEMA.SCHEMA.getObject());
  }

  function getObj (id, flags) {
    return storeFactory.getObj(storeId(id), flags);
  }

  function initObj (id) {
    setObj(id, ELECTIONSCHEMA.SCHEMA.getObject());
  }
}


