/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      schemaProvider.getStringModelPropArgs('type', { field: 'TYPE' }),
      schemaProvider.getStringModelPropArgs('name', { field: 'NAME' }),
      schemaProvider.getStringModelPropArgs('email', { field: 'EMAIL' }),
      schemaProvider.getStringModelPropArgs('comment', { field: 'COMMENT' }),
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

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('message'),
      schema = schemaProvider.getSchema('Message', modelProps, ids, ID_TAG),
      TYPE_IDX = 
        schema.addFieldFromModelProp('type', 'Type', ids.NAME),
      NAME_IDX = 
        schema.addFieldFromModelProp('name', 'Name', ids.NAME),
      EMAIL_IDX =
        schema.addFieldFromModelProp('email', 'Email', ids.EMAIL),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                      [TYPE_IDX, NAME_IDX, EMAIL_IDX], 
                      ID_TAG);

      $provide.constant('MESSAGESCHEMA', {
        IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
        MODELPROPS: modelProps,

        SCHEMA: schema,
        // row indices
        TYPE_IDX: TYPE_IDX,
        NAME_IDX: NAME_IDX,
        EMAIL_IDX: EMAIL_IDX,

        SORT_OPTIONS: sortOptions,
        ID_TAG: ID_TAG
      });
  }])

  .factory('messageFactory', messageFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

messageFactory.$inject = ['$filter', '$injector', 'baseURL', 'consoleService', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'SCHEMA_CONST', 'MESSAGESCHEMA'];

function messageFactory($filter, $injector, baseURL, consoleService, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, SCHEMA_CONST, MESSAGESCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'messageFactory',

      readRspObject: readRspObject,

      getSortFunction: getSortFunction,
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: MESSAGESCHEMA.ID_TAG,
    schema: MESSAGESCHEMA.SCHEMA,
    sortOptions: MESSAGESCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      message: resourceFactory.getResourceConfigWithId('message'),
      feedback: resourceFactory.getResourceConfigWithId('message/feedback'),
      support: resourceFactory.getResourceConfigWithId('message/support')
    }
  });
  
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response message object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  message object
   */
  function readRspObject (response, args) {
    if (!args) {
      args = {};
    }
    // no conversions required by default
//    if (!args.convert) {
//      args.convert = readRspObjectValueConvert;
//    }
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = MESSAGESCHEMA.SCHEMA.read(response, stdArgs);

    con.debug('Read message rsp object: ' + object);

    return object;
  }

  
  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === MESSAGESCHEMA.ID_TAG) {
        switch (sortItem.index) {
          case MESSAGESCHEMA.TYPE_IDX:
            sortFxn = compareType;
            break;
          case MESSAGESCHEMA.NAME_IDX:
            sortFxn = compareName;
            break;
          case MESSAGESCHEMA.EMAIL_IDX:
            sortFxn = compareEmail;
            break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

  function compareType (a, b) {
    return compareFactory.compareStringFields(MESSAGESCHEMA.SCHEMA, MESSAGESCHEMA.TYPE_IDX, a, b);
  }

  function compareName (a, b) {
    return compareFactory.compareStringFields(MESSAGESCHEMA.SCHEMA, MESSAGESCHEMA.NAME_IDX, a, b);
  }

  function compareEmail (a, b) {
    return compareFactory.compareStringFields(MESSAGESCHEMA.SCHEMA, MESSAGESCHEMA.EMAIL_IDX, a, b);
  }

}




