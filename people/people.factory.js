/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'ADDRSCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, ADDRSCHEMA) {

    var details = [
      SCHEMA_CONST.ID,
      schemaProvider.getStringModelPropArgs('firstname', { field: 'FNAME' }),
      schemaProvider.getStringModelPropArgs('lastname', { field: 'LNAME' }),
      schemaProvider.getStringModelPropArgs('note', { field: 'NOTE' }),
      schemaProvider.getObjectIdModelPropArgs('address', 'addressFactory', 'address', ADDRSCHEMA, ADDRSCHEMA.IDs.ID, { field: 'ADDR' }),
      schemaProvider.getObjectIdModelPropArgs('contactDetails', undefined, undefined, undefined, undefined,  { field: 'CONTACT' }),
      schemaProvider.getObjectIdModelPropArgs('owner', undefined, undefined, undefined, undefined, { field: 'OWNER' })
    ],
      ids = {},
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('people'),
      schema = schemaProvider.getSchema('Person', modelProps, ids, ID_TAG),
      PEOPLE_FNAME_IDX =
        schema.addFieldFromModelProp('fname', 'Firstname', ids.FNAME),
      PEOPLE_LNAME_IDX =
        schema.addFieldFromModelProp('lname', 'Lastname', ids.LNAME),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                    [PEOPLE_FNAME_IDX, PEOPLE_LNAME_IDX], 
                    ID_TAG);

    $provide.constant('PEOPLESCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      PEOPLE_FNAME_IDX: PEOPLE_FNAME_IDX,
      PEOPLE_LNAME_IDX: PEOPLE_LNAME_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  }])

  .factory('peopleFactory', peopleFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

peopleFactory.$inject = ['baseURL', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'SCHEMA_CONST', 'PEOPLESCHEMA'];

function peopleFactory (baseURL, storeFactory, resourceFactory, compareFactory, filterFactory, SCHEMA_CONST, PEOPLESCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'peopleFactory',
    getSortFunction: getSortFunction
  };

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: PEOPLESCHEMA.ID_TAG,
    schema: PEOPLESCHEMA.SCHEMA,
    sortOptions: PEOPLESCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      person: resourceFactory.getResourceConfigWithId('people'),
      count: resourceFactory.getResourceConfig('people/count')
    }
  });
  
  return factory;

  /* function implementation
    -------------------------- */

  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === PEOPLESCHEMA.ID_TAG) {
        switch (sortItem.index) {
          case PEOPLESCHEMA.PEOPLE_FNAME_IDX:
            sortFxn = compareFname;
            break;
          case PEOPLESCHEMA.PEOPLE_LNAME_IDX:
            sortFxn = compareLname;
            break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

  function compareFname (a, b) {
    return compareFactory.compareStringFields(PEOPLESCHEMA.SCHEMA, PEOPLESCHEMA.PEOPLE_FNAME_IDX, a, b);
  }

  function compareLname (a, b) {
    return compareFactory.compareStringFields(PEOPLESCHEMA.SCHEMA, PEOPLESCHEMA.PEOPLE_LNAME_IDX, a, b);
  }


}


  

