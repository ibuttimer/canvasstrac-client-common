/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'PEOPLESCHEMA', 'ADDRSCHEMA', 'ROLESCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, PEOPLESCHEMA, ADDRSCHEMA, ROLESCHEMA) {

    var i, uidx = 0,
      ids = {},
      modelProps = [],
      peoplePath,
      addressPath,
      subSchemaList,

      details = [
        SCHEMA_CONST.ID,
        schemaProvider.getStringModelPropArgs('username', { field: 'UNAME' }),
        schemaProvider.getObjectIdModelPropArgs('role', 'roleFactory', 'role', ROLESCHEMA, ROLESCHEMA.IDs.ID, { field: 'ROLE' }),
        schemaProvider.getObjectIdModelPropArgs('person', 'peopleFactory', 'person', PEOPLESCHEMA, PEOPLESCHEMA.IDs.ID, { field: 'PERSON' })
      ];

    // user schema is a combination of the person & address
    for (i = 0; i < details.length; ++i, ++uidx) {
      ids[details[i].field] = uidx;          // uidx is index

      var args = angular.copy(details[i]);
      args.id = uidx;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    peoplePath = modelProps[ids.PERSON].modelName; // path to person in user schema
    addressPath = [
      peoplePath,  // path to person in user schema
      PEOPLESCHEMA.SCHEMA.getModelName(PEOPLESCHEMA.IDs.ADDR) // path to address in person schema
    ];
    subSchemaList = [
      { schema: PEOPLESCHEMA, path: peoplePath },
      { schema: ADDRSCHEMA, path: addressPath }
    ];

    subSchemaList.forEach(function (subSchema) {
      var subId,
          subIds = [];  // unique ids for subschema items

      for (subId in subSchema.schema.IDs) {
        subIds.push(subSchema.schema.ID_TAG + subId);
      }

      for (i = 0; i < subSchema.schema.MODELPROPS.length; ++i, ++uidx) {
        ids[subIds[i]] = uidx;          // id is index

        var args = angular.copy(subSchema.schema.MODELPROPS[i]);
        args.id = uidx;
        args.modelPath = subSchema.path;
        modelProps.push(schemaProvider.getModelPropObject(args));
      }
    });

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('user'),
      schema = schemaProvider.getSchema('User', modelProps, ids, ID_TAG),

      USER_UNAME_IDX =
        schema.addFieldFromModelProp('uname', 'Username', ids.UNAME),
      USER_ROLE_IDX =
        schema.addFieldFromModelProp('role', 'Role', ids.ROLE),

      sortOptions,  // user schema sort options
      sortOptionIndices = // dialog properties of sort options
        [schema.getField(USER_UNAME_IDX, SCHEMA_CONST.DIALOG_PROP)],
      sortOptArgs,
      constToProvide;

    subSchemaList.forEach(function (subSchema) {
      subSchema.schema.SCHEMA.forEachField(
        function (schemaField) {
          schema.addFieldFromField(schemaField, {
            path: subSchema.path,
            cb: function (field) {
              // save dialog property for index configuration
              sortOptionIndices.push(field.dialog);
            }
          });
        });
    });

    // generate list of sort options based on basic, person & address sort options
    sortOptions = schemaProvider.makeSortList(schema, [USER_UNAME_IDX], ID_TAG);

    sortOptArgs = {
      exOptions: SCHEMA_CONST.BASIC_SORT_OPTIONS,
      addTo: sortOptions,
      cb: function (option) {
        // decode option value to get dialog property
        var optVal = SCHEMA_CONST.DECODE_SORT_OPTION_VALUE(option.value),
          i;
        // set id to user tag & correct index
        for (i = 0; i < sortOptionIndices.length; ++i) {
          if (sortOptionIndices[i] === optVal.item) {
            option.id = SCHEMA_CONST.MAKE_SORT_ITEM_ID(ID_TAG, i);
            break;
          }
        }
      }
    };

    schemaProvider.makeSubDocSortList(
          PEOPLESCHEMA.SORT_OPTIONS, peoplePath, sortOptArgs);
    schemaProvider.makeSubDocSortList(
          ADDRSCHEMA.SORT_OPTIONS, addressPath, sortOptArgs);
  
    constToProvide = {
      ID_TAG: ID_TAG,
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      USER_UNAME_IDX: USER_UNAME_IDX,
      USER_ROLE_IDX: USER_ROLE_IDX,

      SCHEMA: schema,

      SORT_OPTIONS: sortOptions
    };

    $provide.constant('USERSCHEMA', constToProvide);
  }])

  .factory('userFactory', userFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

userFactory.$inject = ['$injector', '$filter', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory',
  'SCHEMA_CONST', 'USERSCHEMA'];

function userFactory($injector, $filter, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory,
  SCHEMA_CONST, USERSCHEMA) {


  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'userFactory',
    getSortFunction: getSortFunction,
    readUserRsp: readUserRsp
  },
  comparinators = [];

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: USERSCHEMA.ID_TAG,
    schema: USERSCHEMA.SCHEMA,
    sortOptions: USERSCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      user: resourceFactory.getResourceConfigWithId('users'),
      count: resourceFactory.getResourceConfig('users/count')
    }
  });

  // make an array of comparinator objects based on sort indices
  USERSCHEMA.SORT_OPTIONS.forEach(function (option) {
    if (option.id) {
      var itemId = SCHEMA_CONST.DECODE_SORT_ITEM_ID(option.id);
      if (!comparinators[itemId.index]) {
        comparinators[itemId.index] = 
          compareFactory.newComparinator(USERSCHEMA.SCHEMA, itemId.index);
      }
    }
  });
  
  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response user object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  user object
   */
//  function readRspObject (response, args) {
//    if (!args) {
//      args = {};
//    }
//    if (!args.convert) {
//      args.convert = readRspObjectValueConvert;
//    }
//    // add resources required by Schema object
//    resourceFactory.addResourcesToArgs(args);
//
//    var stdArgs = resourceFactory.standardiseArgs(args),
//      object = USERSCHEMA.SCHEMA.read(response, stdArgs);
//
//    con.debug('Read user rsp object: ' + object);
//
//    return object;
//  }

  /**
   * Convert values read from a server election response
   * @param {number}    schema id 
   * @param {object}    read value
   * @returns {object}  Converted value
   */
//  function readRspObjectValueConvert (id, value) {
//    switch (id) {
//      case ELECTIONSCHEMA.IDs.ELECTIONDATE:
//        value = new Date(value);
//        break;
//      default:
//        // other fields require no conversion
//        break;
//    }
//    return value;
//  }


  /**
   * Read a user response from the server
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object as per resourceFactory.storeServerRsp()
   *                              without 'factory' argument
   *                              @see resourceFactory.storeServerRsp()
   * @return {object}  user ResourceList object
   */
  function readUserRsp(response, args) {
    var storeArgs = miscUtilFactory.copyAndAddProperties(args, {
      factory: $injector.get(factory.NAME)
    });
    return resourceFactory.storeServerRsp(response, storeArgs);
  }

  /**
   * Get the sort function for a user ResourceList
   * @param   {object} sortOptions  List of possible sort option
   * @param   {object} sortBy       Key to sort by
   * @returns {function} sort function
   */
  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === USERSCHEMA.ID_TAG) {
        if (comparinators[sortItem.index]) {
          sortFxn = getComparinator(sortItem.index);
        }
      }
    } // else basic index sort or not found
    return sortFxn;
  }

  /**
   * Compare user objects based on username
   * @param   {object} a First user object
   * @param   {object} b Second user object
   * @returns {number} comparision result
   */
//  function compareUsername (a, b) {
//    return compareFactory.compareStringFields(USERSCHEMA.SCHEMA, USERSCHEMA.USER_UNAME_IDX, a, b);
//  }

  /**
   * Wrapper function to return comparinator function
   * @param   {number}   index Inhex of comparinator to use
   * @returns {function} Function to pass to Array.sort()
   */
  function getComparinator (index) {
    return function (a, b) {
      return comparinators[index].compareFields(a, b);
    };
  }
}





