/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      {
        field: 'ANSWER', modelName: 'answer',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'QUESTION', modelName: 'question',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
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
  })

  .filter('filterAns', ['miscUtilFactory', 'SCHEMA_CONST', function (miscUtilFactory, SCHEMA_CONST) {

    function filterQuesFilter(input, schema, filterBy) {

      // answer specific filter function
      var out = [];

      //if (!miscUtilFactory.isEmpty(filterBy)) {
      // TODO answer specific filter function
      //} else {
      out = input;
      //}
      return out;
    }

    return filterQuesFilter;
  }])

  .factory('answerFactory', answerFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

answerFactory.$inject = ['$resource', '$injector', 'baseURL', 'ANSWERSCHEMA', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'consoleService'];

function answerFactory($resource, $injector, baseURL, ANSWERSCHEMA, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'answerFactory',
      getAnswers: getAnswers,
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,

      setFilter: setFilter,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      forEachSchemaField: forEachAnsSchemaField,
      getSortOptions: getSortOptions,
      getSortFunction: getSortFunction,
      getFilteredResource: getFilteredResource
    },
    con = consoleService.getLogger(factory.NAME),
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: ANSWERSCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    });

  return factory;

  /* function implementation
    -------------------------- */

  function getAnswers () {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };

      add custom update method
    */
    return $resource(baseURL + 'answers/:id', { id: '@id' }, { 'update': { method: 'PUT' } });
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

  function getFilteredResource(resList, filter, success, failure, forEachSchemaField) {

    filter = filter || newFilter();

    if (typeof filter === 'function') {
      forEachSchemaField = failure;
      failure = success;
      filter = newFilter();
    }
    if (!forEachSchemaField) {
      forEachSchemaField = forEachAnsSchemaField;
    }

    var query = resourceFactory.buildQuery(forEachSchemaField, filter.filterBy);

    resList.setList([]);
    getAddresses().query(query).$promise.then(
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
    return ANSWERSCHEMA.ID_TAG + id;
  }
  
  function setFilter (id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  function getSortOptions () {
    return ANSWERSCHEMA.SORT_OPTIONS;
  }

  function forEachAnsSchemaField (callback) {
    ANSWERSCHEMA.SCHEMA.forEachField(callback);
  }
  
  function newFilter (base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = filterFactory.newResourceFilter(ANSWERSCHEMA.SCHEMA, base);
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
    return filterFactory.getFilteredList('filterAns', reslist, filter, xtraFilter);
  }
  
  function filterFunction (reslist, filter) {
    // question specific filter function
    reslist.filterList = getFilteredList(reslist, filter);
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
