/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      schemaProvider.getNumberModelPropArgs('type', undefined, { field: 'TYPE' }),
      schemaProvider.getStringModelPropArgs('question', { field: 'QUESTION' }),
      schemaProvider.getStringArrayModelPropArgs('options', { field: 'OPTIONS' }),
      schemaProvider.getNumberModelPropArgs('rangeMin', 1, { field: 'RANGEMIN' }),
      schemaProvider.getNumberModelPropArgs('rangeMax', 10, { field: 'RANGEMAX' })
    ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('ques'),
      schema = schemaProvider.getSchema('Question', modelProps, ids, ID_TAG),
      QUES_TYPE_IDX =
        schema.addFieldFromModelProp('type', 'Type', ids.TYPE),
      QUES_QUESTION_IDX =
        schema.addFieldFromModelProp('question', 'Question', ids.QUESTION),

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
  }])

  .factory('questionFactory', questionFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

questionFactory.$inject = ['$injector', 'baseURL', 'SCHEMA_CONST', 'QUESTIONSCHEMA', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'consoleService'];

function questionFactory($injector, baseURL, SCHEMA_CONST, QUESTIONSCHEMA, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'questionFactory',
      getQuestionTypes: getQuestionTypes,
      getQuestionTypeObj: getQuestionTypeObj,
      getQuestionTypeName: getQuestionTypeName,
      showQuestionOptions: showQuestionOptions,
      hasPresetQuestionOptions: hasPresetQuestionOptions,
      showQuestionSingleSelOptions: showQuestionSingleSelOptions,
      showQuestionMultiSelOptions: showQuestionMultiSelOptions,
      showRankingNumber: showRankingNumber,
      showTextInput: showTextInput,
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,

      getSortFunction: getSortFunction,
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: QUESTIONSCHEMA.ID_TAG,
    schema: QUESTIONSCHEMA.SCHEMA,
    sortOptions: QUESTIONSCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      question: resourceFactory.getResourceConfigWithId('questions')
    }
  });

  return factory;

  /* function implementation
    -------------------------- */

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
   * Check if a question type has predefined options
   * @param {number} type  Type of question type to check
   * @return {boolean}  true if has predefined options
   */
  function hasPresetQuestionOptions (type) {
    switch (type) {
      case QUESTIONSCHEMA.TYPEIDs.QUESTION_YES_NO:
      case QUESTIONSCHEMA.TYPEIDs.QUESTION_YES_NO_MAYBE:
        return true;
      default:
        return false;
    }
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
      object = QUESTIONSCHEMA.SCHEMA.read(response, stdArgs);

    con.debug('Read question rsp object: ' + object);

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
      if (sortItem.idTag === QUESTIONSCHEMA.ID_TAG) {
        switch (sortItem.index) {
          //case QUESTIONSCHEMA.QUES_TYPE_IDX:
          //  sortFxn = compareAddress;
          //  break;
          //case QUESTIONSCHEMA.QUES_QUESTION_IDX:
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
