/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'QUESTIONSCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, QUESTIONSCHEMA) {

    var details = [
      SCHEMA_CONST.ID,
      schemaProvider.getStringModelPropArgs('answer', { field: 'ANSWER' }),
      schemaProvider.getObjectIdModelPropArgs('question', 'questionFactory', 'question', QUESTIONSCHEMA, QUESTIONSCHEMA.IDs.ID, { field: 'QUESTION' })
    ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('ans'),
      schema = schemaProvider.getSchema('Answer', modelProps, ids, ID_TAG),
      ANS_QUESTION_IDX =
        schema.addFieldFromModelProp('question', 'Question', ids.QUESTION),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                      [ANS_QUESTION_IDX],
                      ID_TAG);

    $provide.constant('ANSWERSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      ANS_QUESTION_IDX: ANS_QUESTION_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  }])

  .factory('answerFactory', answerFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

answerFactory.$inject = ['$injector', 'baseURL', 'SCHEMA_CONST', 'ANSWERSCHEMA', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'consoleService'];

function answerFactory($injector, baseURL, SCHEMA_CONST, ANSWERSCHEMA, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'answerFactory',
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,

      getSortFunction: getSortFunction,
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: ANSWERSCHEMA.ID_TAG,
    schema: ANSWERSCHEMA.SCHEMA,
    sortOptions: ANSWERSCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      answer: resourceFactory.getResourceConfigWithId('answers')
    }
  });

  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response question object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  Survey object
   */
  function readRspObject(response, args) {
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
      object = ANSWERSCHEMA.SCHEMA.read(response, stdArgs);

    con.debug('Read answer rsp object: ' + object);

    return object;
  }

  /**
   * Read a question response from the server and store it
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array} objId      id/array of ids of question object to save response data to
   *    {number}       flags      storefactory flags
   *    {function}     next       function to call after processing
   * @returns {object}   Survey object
   */
  function readResponse (response, args) {
    var question = readRspObject(response, args);
    return storeRspObject(question, args);
  }

  /**
   * Store a question object
   * @param {object}   obj        Object to store
   * @param {object}   args       process arguments object as per resourceFactory.storeServerRsp()
   *                              without 'factory' argument
   *                              @see resourceFactory.storeServerRsp()
   * @return {object}  question ResourceList object
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
      if (sortItem.idTag === ANSWERSCHEMA.ID_TAG) {
        switch (sortItem.index) {
          //case ANSWERSCHEMA.ANS_QUESTION_IDX:
          //  sortFxn = compareTown;
          //  break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

}
