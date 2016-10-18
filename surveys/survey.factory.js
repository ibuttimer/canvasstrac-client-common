/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .constant('QUESTIONTYPES', (function() {
    var questionTypeIds = {
				QUESTION_YES_NO: 0,          // simple yes/no question
				QUESTION_YES_NO_MAYBE: 1,    // simple yes/no/maybe question
				QUESTION_CHOICE_MULTISEL: 2, // multiple choice/multiple answer
				QUESTION_CHOICE_SINGLESEL: 3,// multiple choice/single answer
				QUESTION_RANKING: 4,         // rank answer
				QUESTION_QUERY: 5            // surveyee answer 
			};
    
    var getOptionCountArray = function (min, max) {
      var array = [];
      for (var i = min; i <= max; ++i) {
        array.push(i);
      }
      return array;
    };
    
    var objs = [
      { type: questionTypeIds.QUESTION_YES_NO,
        name: 'Yes/No',
        showOptions: false
      },
      { type: questionTypeIds.QUESTION_YES_NO_MAYBE,
        name: 'Yes/No/Maybe',
        showOptions: false
      },
      { type: questionTypeIds.QUESTION_CHOICE_MULTISEL,
        name: 'MultiSelect',
        showOptions: true,
        range: getOptionCountArray(2, 10)
      },
      { type: questionTypeIds.QUESTION_CHOICE_SINGLESEL,
        name: 'SingleSelect',
        showOptions: true,
        range: getOptionCountArray(2, 10)
      },
      { type: questionTypeIds.QUESTION_RANKING,
        name: 'Ranking',
        showOptions: true,
        range: getOptionCountArray(1, 10)
      },
      { type: questionTypeIds.QUESTION_QUERY,
        name: 'Query',
        showOptions: false
      }
    ],
    ID_TAG = 'survey.';
    
    return {
      IDs: questionTypeIds,
      OBJs: objs,
      
      ID_TAG: ID_TAG
    };
  })())

  .factory('surveyFactory', surveyFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

surveyFactory.$inject = ['$resource', 'baseURL', 'QUESTIONTYPES', 'storeFactory', 'miscUtilFactory'];

function surveyFactory ($resource, baseURL, QUESTIONTYPES, storeFactory, miscUtilFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    getSurveys: getSurveys,
    getQuestions: getQuestions,
    getQuestionTypes: getQuestionTypes,
    getQuestionTypeObj: getQuestionTypeObj,
    getQuestionTypeName: getQuestionTypeName,
    showQuestionOptions: showQuestionOptions,
    showRankingNumber: showRankingNumber,
    readSurveyRsp: readSurveyRsp,
    newSurvey: newSurvey,
    duplicateSurvey: duplicateSurvey,
    delSurvey: delSurvey,
    setSurvey: setSurvey,
    getSurvey: getSurvey,
    initSurvey: initSurvey
  };
  
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

  function getQuestionTypes () {
    return QUESTIONTYPES.OBJs;
  }

  function getQuestionTypeObj (type) {
    var questionTypes = QUESTIONTYPES.OBJs,
      obj;
    for (var i = 0; i < questionTypes.length; ++i) {
      if (questionTypes[i].type == type) {
        obj = questionTypes[i];
        break;
      }
    }
    return obj;
  }

  function getQuestionTypeName (type) {
    var name = '';
    var obj = getQuestionTypeObj(type);
    if (obj !== undefined) {
      name = obj.name;
    }
    return name;
  }

  function showQuestionOptions (type) {
    var show = false;
    var obj = getQuestionTypeObj(type);
    if (obj !== undefined) {
      show = obj.showOptions;
    }
    return show;
  }

  function showRankingNumber (type) {
    var questionTypes = QUESTIONTYPES.IDs;
    return (type == questionTypes.QUESTION_RANKING);
  }
  
  
  /**
   * Read a survey response from the server
   * @param {object}   response Server response
   * @param {string}   objId    id/array of ids of survey object to save response data to
   * @param {function} next     Optional next function to call
   * @returns {object}   Survey object
   */
  function readSurveyRsp (response, objId, flags, next) {

    flags = flags || storeFactory.NOFLAG;
    if (typeof flags === 'function') {
      next = flags;
      flags = storeFactory.NOFLAG;
    }
    var survey = {
      // from survey model
      _id: response._id,
      name: response.name,
      description: response.description,
      questions: response.questions
    };
    
    var array = miscUtilFactory.toArray(objId);
    // if multiple objId's secondary ids are set to copies
    survey = setSurvey(array[0], survey, flags);
    for (var i = 1; i < array.length; ++i) {
      duplicateSurvey(array[i], array[0], storeFactory.DUPLICATE_OR_EXIST);
    }

    if (next) {
      next();
    }
    return survey;
  }

  function storeId (id) {
    return QUESTIONTYPES.ID_TAG + id;
  }

  function newSurvey (id, flags) {
    return storeFactory.newObj(storeId(id), Survey, flags);
  }

  function duplicateSurvey (id, srcId, flags) {
    return storeFactory.duplicateObj(storeId(id), storeId(srcId), flags);
  }

  function delSurvey (id, flags) {
    return storeFactory.delObj(storeId(id), flags);
  }
  
  function setSurvey (id, data, flags) {
    return storeFactory.setObj(storeId(id), data, flags, Survey);
  }
  
  function getSurvey (id, flags) {
    return storeFactory.getObj(storeId(id), flags);
  }
  
  function initSurvey(id) {
    // include only required fields
    setSurvey(id, {
      name: '',
      description: '',
    });
  }

  
  
}

function Survey(name, description) {
  this.name = name;
  this.description = description;
}

Survey.prototype.toString = function pagerToString () {
  return 'Survey{ name: ' + this.name +
  ', description: ' + this.description + '}';

};

