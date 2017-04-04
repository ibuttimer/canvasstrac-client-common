/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      {
        field: 'TYPE', modelName: 'type',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'NAME', modelName: 'name',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'EMAIL', modelName: 'email',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'COMMENT', modelName: 'comment',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
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

  .filter('filterMessage', ['miscUtilFactory', 'SCHEMA_CONST', function (miscUtilFactory, SCHEMA_CONST) {

    function filterMessageFilter (input, schema, filterBy) {
      
      // message specific filter function
      var out = [];

      if (!miscUtilFactory.isEmpty(filterBy)) {
        var testCnt = 0;  // num of fields to test as speced by filter

        schema.forEachField(function(idx, fieldProp) {
          if (filterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]]) {  // filter uses dialog properties
            ++testCnt;
          }
        });
        
        // TODO message specific filter function
        out = input;

      } else {
        out = input;
      }
      return out;
    }

    return filterMessageFilter;
  }])

  .factory('messageFactory', messageFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

messageFactory.$inject = ['$resource', '$filter', '$injector', 'baseURL', 'consoleService', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'SCHEMA_CONST', 'MESSAGESCHEMA'];

function messageFactory($resource, $filter, $injector, baseURL, consoleService, storeFactory, resourceFactory, compareFactory, filterFactory, SCHEMA_CONST, MESSAGESCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'messageFactory',
      getMessage: getMessage,
      getFeedback: getFeedback,
      getSupport: getSupport,

      readRspObject: readRspObject,

      setFilter: setFilter,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      forEachSchemaField: forEachMessageSchemaField,
      getSortOptions: getSortOptions,
      getSortFunction: getSortFunction,
      getFilteredResource: getFilteredResource
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: storeId,
    schema: MESSAGESCHEMA.SCHEMA,
    addInterface: factory // add standard factory functions to this factory
  });
  
  return factory;

  /* function implementation
    -------------------------- */

  function getMessage () {
    return resourceFactory.getResources('message');
  }

  function getFeedback () {
    return resourceFactory.getResources('message/feedback');
  }

  function getSupport () {
    return resourceFactory.getResources('message/support');
  }



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

  /**
   * Create storeFactory id
   * @param {string}   id   Factory id to generate storeFactory id from
   */
  function storeId(id) {
    return MESSAGESCHEMA.ID_TAG + id;
  }

  function getFilteredResource (resList, filter, success, failure, forEachSchemaField) {
    
    filter = filter || newFilter();

    if (typeof filter === 'function') {
      forEachSchemaField = failure;
      failure = success;
      filter = newFilter();
    }
    if (!forEachSchemaField) {
      forEachSchemaField = forEachMessageSchemaField;
    }

    var query = resourceFactory.buildQuery(forEachSchemaField, filter.filterBy);

    resList.setList([]);
    getMessage().query(query).$promise.then(
      // success function
      function (response) {
        // add indices
        for (var i = 0; i < response.length; ++i) {
          response[i].index = i + 1;
        }
        // response from server contains result of filter request
        resList.setList(response, storeFactory.APPLY_FILTER);

        if (success){
          success(response);
        }
      },
      // error function
      function (response) {
        if (failure){
          failure(response);
        }
      }
    );
  }
  
  function setFilter (id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  function getSortOptions () {
    return MESSAGESCHEMA.SORT_OPTIONS;
  }

  function forEachMessageSchemaField (callback) {
    MESSAGESCHEMA.SCHEMA.forEachField(callback);
  }
  
  function newFilter (base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = filterFactory.newResourceFilter(MESSAGESCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }
  
  /**
   * Generate a filtered list
   * @param {object}   reslist    message ResourceList object to filter
   * @param {object}   filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array}    filtered list
   */
  function getFilteredList (reslist, filter, xtraFilter) {
    // message specific filter function
    return filterFactory.getFilteredList('filterMessage', reslist, filter, xtraFilter);
  }
  
  function filterFunction (addrList, filter) {
    // message specific filter function
    addrList.filterList = getFilteredList(addrList, filter);
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




