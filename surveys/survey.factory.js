/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'QUESTIONSCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, QUESTIONSCHEMA) {

    var details = [
      SCHEMA_CONST.ID,
      schemaProvider.getStringModelPropArgs('name', { field: 'NAME' }),
      schemaProvider.getStringModelPropArgs('description', { field: 'DESCRIPTION' }),
      schemaProvider.getObjectIdArrayModelPropArgs('questions', 'questionFactory', 'question', QUESTIONSCHEMA, QUESTIONSCHEMA.IDs.ID, { field: 'QUESTIONS' })
    ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('survey'),
      schema = schemaProvider.getSchema('Survey', modelProps, ids, ID_TAG),
      SURVEY_NAME_IDX =
        schema.addFieldFromModelProp('name', 'Name', ids.NAME),
      SURVEY_DESCRIPTION_IDX =
        schema.addFieldFromModelProp('description', 'Description', ids.DESCRIPTION),
      SURVEY_QUESTIONS_IDX =
        schema.addFieldFromModelProp('questions', 'Questions', ids.QUESTIONS),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                      [SURVEY_NAME_IDX, SURVEY_DESCRIPTION_IDX],
                      ID_TAG);

    $provide.constant('SURVEYSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      SURVEY_NAME_IDX: SURVEY_NAME_IDX,
      SURVEY_DESCRIPTION_IDX: SURVEY_DESCRIPTION_IDX,
      SURVEY_QUESTIONS_IDX: SURVEY_QUESTIONS_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  }])

  .factory('surveyFactory', surveyFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

surveyFactory.$inject = ['$injector', 'baseURL', 'SURVEYSCHEMA', 'storeFactory', 'resourceFactory', 'miscUtilFactory', 'consoleService'];

function surveyFactory($injector, baseURL, SURVEYSCHEMA, storeFactory, resourceFactory, miscUtilFactory, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'surveyFactory',
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject
    },
   con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: SURVEYSCHEMA.ID_TAG,
    schema: SURVEYSCHEMA.SCHEMA,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      survey: resourceFactory.getResourceConfigWithId('surveys')
    }

  });
 
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response survey object
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
      object = SURVEYSCHEMA.SCHEMA.read(response, stdArgs);

    con.debug('Read survey rsp object: ' + object);

    return object;
  }

  /**
   * Read a survey response from the server and store it
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array} objId      id/array of ids of survey object to save response data to
   *    {number}       flags      storefactory flags
   *    {function}     next       function to call after processing
   * @returns {object}   Survey object
   */
  function readResponse (response, args) {
    var survey = readRspObject(response, args);
    return storeRspObject(survey, args);
  }

  /**
   * Store a survey object
   * @param {object}   obj        Object to store
   * @param {object}   args       process arguments object as per resourceFactory.storeServerRsp()
   *                              without 'factory' argument
   *                              @see resourceFactory.storeServerRsp()
   * @return {object}  survey ResourceList object
   */
  function storeRspObject (obj, args) {
    var storeArgs = miscUtilFactory.copyAndAddProperties(args, {
      factory: $injector.get(factory.NAME)
    });
    return resourceFactory.storeServerRsp(obj, storeArgs);
  }

}
