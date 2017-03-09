/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      {
        field: 'TYPE', modelName: 'type',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.NUMBER
      },
      {
        field: 'QUESTION', modelName: 'question',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'OPTIONS', modelName: 'options',
        dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.STRING_ARRAY
      },
      {
        field: 'RANGEMIN', modelName: 'rangeMin',
        dfltValue: 1, type: SCHEMA_CONST.FIELD_TYPES.NUMBER
      },
      {
        field: 'RANGEMAX', modelName: 'rangeMax',
        dfltValue: 10, type: SCHEMA_CONST.FIELD_TYPES.NUMBER
      }
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
  })

  .filter('filterQues', ['miscUtilFactory', 'SCHEMA_CONST', function (miscUtilFactory, SCHEMA_CONST) {

    function filterQuesFilter(input, schema, filterBy) {

      // question specific filter function
      var out = [];

      //if (!miscUtilFactory.isEmpty(filterBy)) {
        // TODO question specific filter function
      //} else {
        out = input;
      //}
      return out;
    }

    return filterQuesFilter;
  }])

  .factory('questionFactory', questionFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

questionFactory.$inject = ['$resource', '$injector', 'baseURL', 'SCHEMA_CONST', 'QUESTIONSCHEMA', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'consoleService'];

function questionFactory($resource, $injector, baseURL, SCHEMA_CONST, QUESTIONSCHEMA, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'questionFactory',
      getQuestions: getQuestions,
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

      setFilter: setFilter,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      forEachSchemaField: forEachQuesSchemaField,
      getSortOptions: getSortOptions,
      getSortFunction: getSortFunction,
      getFilteredResource: getFilteredResource
    },
    con = consoleService.getLogger(factory.NAME),
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: QUESTIONSCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    });

  return factory;

  /* function implementation
    -------------------------- */

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

  function getFilteredResource(resList, filter, success, failure, forEachSchemaField) {

    filter = filter || newFilter();

    if (typeof filter === 'function') {
      forEachSchemaField = failure;
      failure = success;
      filter = newFilter();
    }
    if (!forEachSchemaField) {
      forEachSchemaField = forEachQuesSchemaField;
    }

    var query = resourceFactory.buildQuery(forEachSchemaField, filter.filterBy);

    resList.setList([]);
    getQuestions().query(query).$promise.then(
      // success function
      function (response) {
        // add indices
        for (var i = 0; i < response.length; ++i) {
          response[i].index = i + 1;
        }
        // response from server contains result of filter request
        resList.setList(response, storeFactory.APPLY_FILTER);

        if (success) {
          success(response);
        }
      },
      // error function
      function (response) {
        if (failure) {
          failure(response);
        }
      }
    );
  }


  function storeId(id) {
    return QUESTIONSCHEMA.ID_TAG + id;
  }
  
  function setFilter (id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  function getSortOptions () {
    return QUESTIONSCHEMA.SORT_OPTIONS;
  }

  function forEachQuesSchemaField (callback) {
    QUESTIONSCHEMA.SCHEMA.forEachField(callback);
  }
  
  function newFilter (base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = filterFactory.newResourceFilter(QUESTIONSCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }
  
  /**
   * Generate a filtered list
   * @param {object}   reslist    Address ResourceList object to filter
   * @param {object}   filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}    filtered list
   */
  function getFilteredList (reslist, filter, xtraFilter) {
    return filterFactory.getFilteredList('filterQues', reslist, filter, xtraFilter);
  }
  
  function filterFunction (reslist, filter) {
    // question specific filter function
    reslist.filterList = getFilteredList(reslist, filter);
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
