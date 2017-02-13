/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      { field: 'ID', modelName: '_id', dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID },
      { field: 'NAME', modelName: 'name', dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING },
      { field: 'DESCRIPTION', modelName: 'description', dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING },
      { field: 'ABBREVIATION', modelName: 'abbreviation', dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING }
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

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('votingsys'),
      schema = schemaProvider.getSchema('Voting System', modelProps, ID_TAG),
      VOTINGSYS_NAME_IDX =
        schema.addFieldFromModelProp('name', 'Name', ids.NAME),
      VOTINGSYS_DESCRIPTION_IDX =
        schema.addFieldFromModelProp('description', 'Description', ids.DESCRIPTION),
      VOTINGSYS_ABBREVIATION_IDX =
        schema.addFieldFromModelProp('abbreviation', 'Abbreviation', ids.ABBREVIATION),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                [VOTINGSYS_NAME_IDX, VOTINGSYS_ABBREVIATION_IDX],
                ID_TAG);

    $provide.constant('VOTINGSYSSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      VOTINGSYS_NAME_IDX: VOTINGSYS_NAME_IDX,
      VOTINGSYS_DESCRIPTION_IDX: VOTINGSYS_DESCRIPTION_IDX,
      VOTINGSYS_ABBREVIATION_IDX: VOTINGSYS_ABBREVIATION_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  })

  .factory('votingsystemFactory', votingsystemFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

votingsystemFactory.$inject = ['$resource', '$injector', '$filter', 'storeFactory', 'resourceFactory', 'filterFactory', 'consoleService',
  'miscUtilFactory', 'SCHEMA_CONST', 'VOTINGSYSSCHEMA'];

function votingsystemFactory ($resource, $injector, $filter, storeFactory, resourceFactory, filterFactory, consoleService, 
  miscUtilFactory, SCHEMA_CONST, VOTINGSYSSCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'votingsystemFactory',
      getVotingSystems: getVotingSystems,
      readRspObject: readRspObject,
      readVotingSystemRsp: readVotingSystemRsp,
      storeRspObject: storeRspObject,
      setFilter:setFilter,
      getSortOptions: getSortOptions,
      forEachSchemaField: forEachVotingSysSchemaField,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      filterFunction: filterFunction,
      getSortFunction: getSortFunction
    },
    con = consoleService.getLogger(factory.NAME),
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: VOTINGSYSSCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    });
  
  return factory;

  /* function implementation
    -------------------------- */

  function getVotingSystems () {
    return resourceFactory.getResources('votingsystems');
    
  }
  

  /**
   * Read a server response voting system object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  voting system object
   */
  function readRspObject (response, args) {
// no special conversions required
//    if (!args) {
//      args = {};
//    }
//    if (!args.convert) {
//      args.convert = readRspObjectValueConvert;
//    }
    var obj = VOTINGSYSSCHEMA.SCHEMA.readProperty(response, args);

    con.debug('Read voting sys rsp object: ' + obj);

    return obj;
  }

  /**
   * Convert values read from a server response
   * @param {number}    schema id 
   * @param {object}    read value
   * @returns {object}  Converted value
   */
//  function readRspObjectValueConvert (id, value) {
//    switch (id) {
//      case VOTINGSYSSCHEMA.IDs.???:
//        value = <<new value>>;
//        break;
//      default:
//        // other fields require no conversion
//        break;
//    }
//    return value;
//  }


  /**
   * Read an voting system response from the server and store it
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array} objId      id/array of ids of voting system object to save response data to
   *    {number}       flags      storefactory flags
   *    {function}     next       function to call after processing
   * @return {object}  voting system ResourceList object
   */
  function readVotingSystemRsp (response, args) {
    var system = readRspObject(response);
    return storeRspObject(system, args);
  }

  /**
   * Store an voting system object
   * @param {object}   obj        Object to store
   * @param {object}   args       process arguments object as per resourceFactory.storeServerRsp()
   *                              without 'factory' argument
   *                              @see resourceFactory.storeServerRsp()
   * @return {object}  voting system ResourceList object
   */
  function storeRspObject (obj, args) {
    var storeArgs = miscUtilFactory.copyAndAddProperties(args, {
      factory: $injector.get(factory.NAME)
    });
    return resourceFactory.storeServerRsp(obj, storeArgs);
  }

  function storeId (id) {
    return VOTINGSYSSCHEMA.ID_TAG + id;
  }

  function setFilter(id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  function getSortOptions() {
    return VOTINGSYSSCHEMA.SORT_OPTIONS;
  }

  function forEachVotingSysSchemaField(callback) {
    VOTINGSYSSCHEMA.SCHEMA.forEachField(callback);
  }

  function newFilter(base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = filterFactory.newResourceFilter(VOTINGSYSSCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }

  /**
   * Generate a filtered list
   * @param {object} reslist    Election ResourceList object to filter
   * @param {object} filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array} filtered list
   */
  function getFilteredList (reslist, filter, xtraFilter) {
    // voting system specific filter function
    return filterFactory.getFilteredList('filterVotingSys', reslist, filter, xtraFilter);
  }

  function filterFunction(reslist, filter) {
    // voting system specific filter function
    reslist.filterList = getFilteredList(reslist, filter);
  }

  function getSortFunction(options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === VOTINGSYSSCHEMA.ID_TAG) {
        switch (sortItem.index) {
//          case VOTINGSYSSCHEMA.VOTINGSYS_NAME_IDX:
//            sortFxn = compareAddress;
//            break;
//          case VOTINGSYSSCHEMA.VOTINGSYS_ABBREVIATION_IDX:
//            sortFxn = compareCity;
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


