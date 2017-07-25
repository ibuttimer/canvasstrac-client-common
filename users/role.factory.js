/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .constant('ROLES', (function() {
    return {
      // level definitions for Roles from server
      ROLE_ADMIN: 100,      // admin level access
      ROLE_MANAGER: 90,     // manager level access
      ROLE_GROUP_LEAD: 80,  // group leader level access
      ROLE_STAFF: 70,       // staff level access
      ROLE_CANVASSER: 60,   // canvasser level access
      ROLE_NONE: 0          // public level access
    };
  })())

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'ROLES', function ($provide, schemaProvider, SCHEMA_CONST, ROLES) {

    var details = [
      SCHEMA_CONST.ID,
      schemaProvider.getStringModelPropArgs('name', { field: 'NAME' }),
      schemaProvider.getNumberModelPropArgs('level', ROLES.ROLE_NONE, { field: 'LEVEL' })
    ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('role'),
      schema = schemaProvider.getSchema('Role', modelProps, ids, ID_TAG),
      ROLE_NAME_IDX =
        schema.addFieldFromModelProp('name', 'Name', ids.NAME),
      ROLE_LEVEL_IDX =
        schema.addFieldFromModelProp('level', 'Level', ids.LEVEL),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                      [ROLE_NAME_IDX, ROLE_LEVEL_IDX],
                      ID_TAG);

    $provide.constant('ROLESCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      ROLE_NAME_IDX: ROLE_NAME_IDX,
      ROLE_LEVEL_IDX: ROLE_LEVEL_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  }])


  .factory('roleFactory', roleFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

roleFactory.$inject = ['SCHEMA_CONST', 'ROLESCHEMA', 'resourceFactory'];

function roleFactory (SCHEMA_CONST, ROLESCHEMA, resourceFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'roleFactory',
    readRspObject: readRspObject
  };
  
  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: ROLESCHEMA.ID_TAG,
    schema: ROLESCHEMA.SCHEMA,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      role: resourceFactory.getResourceConfig('roles')
    }
  });

  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Read a server response canvass object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  Canvass object
   */
  function readRspObject (response, args) {
    if (!args) {
      args = {};
    }
//    if (!args.convert) {
//      args.convert = readRspObjectValueConvert;
//    }
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = ROLESCHEMA.SCHEMA.read(response, stdArgs);

    return object;
  }

  
}


