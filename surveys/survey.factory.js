/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider) {

    var details = [
      { field: 'ID', modelName: '_id', dfltValue: undefined },
      { field: 'NAME', modelName: 'name', dfltValue: '' },
      { field: 'DESCRIPTION', modelName: 'description', dfltValue: '' },
      { field: 'QUESTIONS', modelName: 'questions', dfltValue: [] }
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

    var ID_TAG = 'survey.',
      schema = schemaProvider.getSchema('Survey', modelProps),
      SURVEY_NAME_IDX =
        schema.addField('name', 'Name', names[ids.NAME], ID_TAG),
      SURVEY_DESCRIPTION_IDX =
        schema.addField('description', 'Description', names[ids.DESCRIPTION], ID_TAG),
      SURVEY_QUESTIONS_IDX =
        schema.addField('questions', 'Questions', names[ids.QUESTIONS], ID_TAG),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                      [SURVEY_NAME_IDX, SURVEY_DESCRIPTION_IDX],
                      ID_TAG);

    $provide.constant('SURVEYSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      NAMES: names, // model names
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      SURVEY_NAME_IDX: SURVEY_NAME_IDX,
      SURVEY_DESCRIPTION_IDX: SURVEY_DESCRIPTION_IDX,
      SURVEY_QUESTIONS_IDX: SURVEY_QUESTIONS_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  })

  .factory('surveyFactory', surveyFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

surveyFactory.$inject = ['$resource', '$injector', 'baseURL', 'SURVEYSCHEMA', 'storeFactory', 'resourceFactory', 'miscUtilFactory', 'consoleService'];

function surveyFactory($resource, $injector, baseURL, SURVEYSCHEMA, storeFactory, resourceFactory, miscUtilFactory, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      getSurveys: getSurveys,
      readRspObject: readRspObject,
      readSurveyRsp: readSurveyRsp,
      storeRspObject: storeRspObject,
      newObj: newObj,
      duplicateObj: duplicateObj,
      delObj: delObj,
      setObj: setObj,
      getObj: getObj,
      initObj: initObj
    },
    con = consoleService.getLogger('surveyFactory');
  
  return factory;

  /* function implementation
    -------------------------- */

  function getSurveys () {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };

      add custom update method
    */
    return $resource(baseURL + 'surveys/:id', {id:'@id'}, {'update': {method: 'PUT'}});
  }

  /**
   * Read a server response survey object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  Survey object
   */
  function readRspObject(response, args) {
    // no conversions required by default
    var survey = SURVEYSCHEMA.SCHEMA.readProperty(response, args);

    con.debug('Read survey rsp object: ' + survey);

    return survey;
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
  function readSurveyRsp(response, args) {
    var survey = readRspObject(response);
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
      factory: $injector.get('surveyFactory')
    });
    return resourceFactory.storeServerRsp(obj, storeArgs);
  }


  function storeId(id) {
    return SURVEYSCHEMA.ID_TAG + id;
  }

  function newObj (id, flags) {
    return storeFactory.newObj(storeId(id), SURVEYSCHEMA.SCHEMA.getObject(), flags);
  }

  function duplicateObj (id, srcId, flags) {
    return storeFactory.duplicateObj(storeId(id), storeId(srcId), flags);
  }

  function delObj (id, flags) {
    return storeFactory.delObj(storeId(id), flags);
  }
  
  function setObj (id, data, flags) {
    return storeFactory.setObj(storeId(id), data, flags, SURVEYSCHEMA.SCHEMA.getObject());
  }
  
  function getObj (id, flags) {
    return storeFactory.getObj(storeId(id), flags);
  }
  
  function initObj (id) {
    setObj(id, SURVEYSCHEMA.SCHEMA.getObject());
  }

  
  
}
