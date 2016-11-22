/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider) {

    var details = [
      { field: 'ID', modelName: '_id', dfltValue: undefined },
      { field: 'TYPE', modelName: 'type', dfltValue: '' },
      { field: 'QUESTION', modelName: 'question', dfltValue: '' },
      { field: 'OPTIONS', modelName: 'options', dfltValue: [] },
      { field: 'RANGEMIN', modelName: 'rangeMin', dfltValue: 1 },
      { field: 'RANGEMAX', modelName: 'rangeMax', dfltValue: 10 }
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

    var ID_TAG = 'ques.',
      schema = schemaProvider.getSchema('Question', modelProps),
      QUES_TYPE_IDX =
        schema.addField('type', 'Type', names[ids.TYPE], ID_TAG),
      QUES_QUESTION_IDX =
        schema.addField('question', 'Question', names[ids.QUESTION], ID_TAG),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                      [QUES_TYPE_IDX, QUES_QUESTION_IDX],
                      ID_TAG),

      questionTypeIds = {
        QUESTION_YES_NO: 0,          // simple yes/no question
        QUESTION_YES_NO_MAYBE: 1,    // simple yes/no/maybe question
        QUESTION_CHOICE_MULTISEL: 2, // multiple choice/multiple answer
        QUESTION_CHOICE_SINGLESEL: 3,// multiple choice/single answer
        QUESTION_RANKING: 4,         // rank answer
        QUESTION_QUERY: 5            // surveyee answer 
      },

      getOptionCountArray = function (min, max) {
        var array = [];
        for (var i = min; i <= max; ++i) {
          array.push(i);
        }
        return array;
      },

      objs = [
        {
          type: questionTypeIds.QUESTION_YES_NO,
          name: 'Yes/No',
          showOptions: true,
        },
        {
          type: questionTypeIds.QUESTION_YES_NO_MAYBE,
          name: 'Yes/No/Maybe',
          showOptions: true,
        },
        {
          type: questionTypeIds.QUESTION_CHOICE_MULTISEL,
          name: 'MultiSelect',
          showOptions: true,
          range: getOptionCountArray(2, 10)
        },
        {
          type: questionTypeIds.QUESTION_CHOICE_SINGLESEL,
          name: 'SingleSelect',
          showOptions: true,
          range: getOptionCountArray(2, 10)
        },
        {
          type: questionTypeIds.QUESTION_RANKING,
          name: 'Ranking',
          showOptions: true,
          range: getOptionCountArray(1, 10)
        },
        {
          type: questionTypeIds.QUESTION_QUERY,
          name: 'Query',
          showOptions: false
        }
      ];

    $provide.constant('QUESTIONSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      NAMES: names, // model names
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      QUES_TYPE_IDX: QUES_TYPE_IDX,
      QUES_QUESTION_IDX: QUES_QUESTION_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG,

      TYPEIDs: questionTypeIds,
      QUESTIONOBJs: objs
    });
  })

  .factory('questionFactory', questionFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

questionFactory.$inject = ['$resource', 'baseURL', 'QUESTIONSCHEMA', 'storeFactory', 'resourceFactory', 'miscUtilFactory', 'consoleService'];

function questionFactory($resource, baseURL, QUESTIONSCHEMA, storeFactory, resourceFactory, miscUtilFactory, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      getQuestions: getQuestions,
      getQuestionTypes: getQuestionTypes,
      getQuestionTypeObj: getQuestionTypeObj,
      getQuestionTypeName: getQuestionTypeName,
      showQuestionOptions: showQuestionOptions,
      showQuestionSingleSelOptions: showQuestionSingleSelOptions,
      showQuestionMultiSelOptions: showQuestionMultiSelOptions,
      showRankingNumber: showRankingNumber,
      showTextInput: showTextInput,
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
    con = consoleService.getLogger('questionFactory');
  
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

  function getQuestions () {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };

      add custom update method
    */
    return $resource(baseURL + 'questions/:id', {id:'@id'}, {'update': {method: 'PUT'}});
  }

  /**
    * Return all the possible question types
    * @return {Array} an array of question type objects
    */
  function getQuestionTypes () {
    return QUESTIONSCHEMA.QUESTIONOBJs;
  }

  /**
    * Get a question type object
    * @param {number} type  Type of question type to get
    * @return {object}  question type object
    */
  function getQuestionTypeObj (type) {
    var questionTypes = QUESTIONSCHEMA.QUESTIONOBJs,
      obj;
    for (var i = 0; i < questionTypes.length; ++i) {
      if (questionTypes[i].type == type) {
        obj = questionTypes[i];
        break;
      }
    }
    return obj;
  }

  /**
    * Get a question type name
    * @param {number} type  Type of question type to get name for
    * @return {string}  question type name
    */
  function getQuestionTypeName (type) {
    var name = '';
    var obj = getQuestionTypeObj(type);
    if (obj !== undefined) {
      name = obj.name;
    }
    return name;
  }

  /**
    * Check if options should be displayed for a question type
    * @param {number} type  Type of question type to check
    * @return {boolean}  true if options should be displayed
    */
  function showQuestionOptions (type) {
    var show = false;
    var obj = getQuestionTypeObj(type);
    if (obj !== undefined) {
      show = obj.showOptions;
    }
    return show;
  }

  /**
    * Check if single select options should be displayed for a question type
    * @param {number} type  Type of question type to check
    * @return {boolean}  true if options should be displayed
    */
  function showQuestionSingleSelOptions (type) {
    return (showQuestionOptions(type) && !showQuestionMultiSelOptions(type) && !showRankingNumber(type));
  }

  /**
    * Check if multiselect options should be displayed for a question type
    * @param {number} type  Type of question type to check
    * @return {boolean}  true if options should be displayed
    */
  function showQuestionMultiSelOptions (type) {
    return (type === QUESTIONSCHEMA.TYPEIDs.QUESTION_CHOICE_MULTISEL);
  }

  /**
    * Check if ranking number should be displayed for a question type
    * @param {number} type  Type of question type to check
    * @return {boolean}  true if ranking number should be displayed
    */
  function showRankingNumber (type) {
    return (type === QUESTIONSCHEMA.TYPEIDs.QUESTION_RANKING);
  }

  /**
    * Check if text input should be displayed for a question type
    * @param {number} type  Type of question type to check
    * @return {boolean}  true if text input should be displayed
    */
  function showTextInput (type) {
    return (type === QUESTIONSCHEMA.TYPEIDs.QUESTION_QUERY);
  }


  /**
   * Read a server response question object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  Survey object
   */
  function readRspObject(response, args) {
    // no conversions required by default
    var question = QUESTIONSCHEMA.SCHEMA.readProperty(response, args);

    con.debug('Read question rsp object: ' + question);

    return question;
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
  function readSurveyRsp(response, args) {
    var question = readRspObject(response);
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
      factory: this,
    });
    return resourceFactory.storeServerRsp(obj, storeArgs);
  }


  function storeId(id) {
    return QUESTIONSCHEMA.ID_TAG + id;
  }

  function newObj (id, flags) {
    return storeFactory.newObj(storeId(id), QUESTIONSCHEMA.SCHEMA.getObject(), flags);
  }

  function duplicateObj (id, srcId, flags) {
    return storeFactory.duplicateObj(storeId(id), storeId(srcId), flags);
  }

  function delObj (id, flags) {
    return storeFactory.delObj(storeId(id), flags);
  }
  
  function setObj (id, data, flags) {
    return storeFactory.setObj(storeId(id), data, flags, QUESTIONSCHEMA.SCHEMA.getObject());
  }
  
  function getObj (id, flags) {
    return storeFactory.getObj(storeId(id), flags);
  }
  
  function initObj (id) {
    setObj(id, QUESTIONSCHEMA.SCHEMA.getObject());
  }

  
  
}
