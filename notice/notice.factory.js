/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var INFO_MSG = 1,
      WARN_MSG = 2,
      CRITICAL_MSG = 3,
      noticeTypeObjs = [
        { level: INFO_MSG, name: 'Informational', 
          icon: 'fa-info-circle', style: 'bg-info' },
        { level: WARN_MSG, name: 'Warning', 
          icon: 'fa-window-close', style: 'bg-warning' },
        { level: CRITICAL_MSG, name: 'Critical', 
          icon: 'fa-exclamation-triangle', style: 'bg-danger' }
      ],
      details = [
        SCHEMA_CONST.ID,
        schemaProvider.getNumberModelPropArgs('level', INFO_MSG, { field: 'LEVEL' }),
        schemaProvider.getStringModelPropArgs('title', { field: 'TITLE' }),
        schemaProvider.getStringModelPropArgs('message', { field: 'MESSAGE' }),
        schemaProvider.getDateModelPropArgs('fromDate', undefined, { field: 'FROMDATE' }),
        schemaProvider.getDateModelPropArgs('toDate', undefined, { field: 'TODATE' }),
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

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('notice'),
      schema = schemaProvider.getSchema('Notice', modelProps, ids, ID_TAG),
      LEVEL_IDX = 
        schema.addFieldFromModelProp('level', 'Level', ids.LEVEL),
      TITLE_IDX = 
        schema.addFieldFromModelProp('title', 'Title', ids.TITLE),
      MESSAGE_IDX = 
        schema.addFieldFromModelProp('message', 'Message', ids.MESSAGE),
      FROMDATE_IDX =
        schema.addFieldFromModelProp('fromDate', 'From Date', ids.FROMDATE),
      TODATE_IDX =
        schema.addFieldFromModelProp('toDate', 'To Date', ids.TODATE),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                      [LEVEL_IDX, TITLE_IDX, FROMDATE_IDX], 
                      ID_TAG);

      $provide.constant('NOTICESCHEMA', {
        IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
        MODELPROPS: modelProps,

        SCHEMA: schema,
        // row indices
        LEVEL_IDX: LEVEL_IDX,
        TITLE_IDX: TITLE_IDX,
        MESSAGE_IDX: MESSAGE_IDX,
        FROMDATE_IDX: FROMDATE_IDX,
        TODATE_IDX: TODATE_IDX,
        
        NOTICETYPEOBJS: noticeTypeObjs,

        SORT_OPTIONS: sortOptions,
        ID_TAG: ID_TAG
      });
  }])

  .factory('noticeFactory', noticeFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

noticeFactory.$inject = ['$filter', '$injector', 'baseURL', 'consoleService', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'SCHEMA_CONST', 'NOTICESCHEMA'];

function noticeFactory($filter, $injector, baseURL, consoleService, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, SCHEMA_CONST, NOTICESCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'noticeFactory',

      readRspObject: readRspObject,
      readResponse: readResponse,

      getSortFunction: getSortFunction,

      getNoticeTypeObj: getNoticeTypeObj
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: NOTICESCHEMA.ID_TAG,
    schema: NOTICESCHEMA.SCHEMA,
    sortOptions: NOTICESCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      notice: resourceFactory.getResourceConfigWithId('notice'),
      current: resourceFactory.getResourceConfigWithId('notice/current'),
      count: resourceFactory.getResourceConfigWithId('notice/count'),
    }
  });
  
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response notice object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  notice object
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
      object = NOTICESCHEMA.SCHEMA.read(response, stdArgs);

    con.debug('Read notice rsp object: ' + object);

    return object;
  }

  /**
   * Convert values read from a server notice response
   * @param {number}    schema id 
   * @param {object}    read value
   * @returns {object}  Converted value
   */
  function readRspObjectValueConvert (id, value) {
    switch (id) {
      case NOTICESCHEMA.IDs.FROMDATE:
      case NOTICESCHEMA.IDs.TODATE:
        value = new Date(value);
        break;
      default:
        // other fields require no conversion
        break;
    }
    return value;
  }


  /**
   * Read an notice response from the server and store it
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array} objId      id/array of ids of notice object to save response data to
   *    {number}       flags      storefactory flags
   *    {function}     next       function to call after processing
   * @return {object}  notice ResourceList object
   */
  function readResponse (response, args) {
    var notice = readRspObject(response, args);
    return storeRspObject(notice, args);
  }

  /**
   * Store an notice object
   * @param {object}   obj        Object to store
   * @param {object}   args       process arguments object as per resourceFactory.storeServerRsp()
   *                              without 'factory' argument
   *                              @see resourceFactory.storeServerRsp()
   * @return {object}  notice ResourceList object
   */
  function storeRspObject (obj, args) {
    var storeArgs = miscUtilFactory.copyAndAddProperties(args, {
      factory: $injector.get(factory.NAME)
    });
    return resourceFactory.storeServerRsp(obj, storeArgs);
  }
  
  
  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === NOTICESCHEMA.ID_TAG) {
        switch (sortItem.index) {
          case NOTICESCHEMA.LEVEL_IDX:
            sortFxn = compareLevel;
            break;
          case NOTICESCHEMA.TITLE_IDX:
            sortFxn = compareTitle;
            break;
          case NOTICESCHEMA.FROMDATE_IDX:
            sortFxn = compareFromDate;
            break;
          case NOTICESCHEMA.TODATE_IDX:
            sortFxn = compareToDate;
            break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

  function compareLevel (a, b) {
    return compareFactory.compareNumberFields(NOTICESCHEMA.SCHEMA, NOTICESCHEMA.LEVEL_IDX, a, b);
  }

  function compareTitle (a, b) {
    return compareFactory.compareStringFields(NOTICESCHEMA.SCHEMA, NOTICESCHEMA.TITLE_IDX, a, b);
  }

  function compareFromDate (a, b) {
    return compareFactory.compareDateFields(NOTICESCHEMA.SCHEMA, NOTICESCHEMA.FROMDATE_IDX, a, b);
  }

  function compareToDate (a, b) {
    return compareFactory.compareDateFields(NOTICESCHEMA.SCHEMA, NOTICESCHEMA.TODATE_IDX, a, b);
  }
  
  function getNoticeTypeObj (level, prop) {
    var result,
      obj = NOTICESCHEMA.NOTICETYPEOBJS.find(function (levelObj) {
        return (levelObj.level === level);
      });
    if (obj) {
      if (prop) {
        result = obj[prop];
      } else {
        result = obj;
      }
    }
    return result;
  }

}




