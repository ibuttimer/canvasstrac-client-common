/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider) {

//  .constant('PEOPLESCHEMA', (function () {
    var fields = [
      'FNAME',
      'LNAME',
      'NOTE',
      'ADDR',
      'CITY',
      'CONTACT',
      'OWNER'
    ],
      names = [   // model names
        'firstname',
        'lastname',
        'note',
        'address',
        'contactDetails',
        'owner'
      ],
      ids = {},
      objs = [];

    for (var i = 0; i < fields.length; ++i) {
      ids[fields[i]] = i;               // id is index
      objs.push({id: i, name: names[i]});
    }
  
    var ID_TAG = 'people.',
      schema = schemaProvider.getSchema(),
      PEOPLE_FLD_FNAME_IDX =
        schema.addField('fname', 'Firstname', names[ids.FNAME], ID_TAG),
      PEOPLE_FLD_LNAME_IDX =
        schema.addField('lname', 'Lastname', names[ids.LNAME], ID_TAG),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                    [PEOPLE_FLD_FNAME_IDX, PEOPLE_FLD_LNAME_IDX], 
                    ID_TAG);

    $provide.constant('PEOPLESCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      NAMES: names, // model names
      OBJs: objs,

      SCHEMA: schema,
      // row indices
      PEOPLE_FLD_FNAME_IDX: PEOPLE_FLD_FNAME_IDX,
      PEOPLE_FLD_LNAME_IDX: PEOPLE_FLD_LNAME_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  })

  .factory('peopleFactory', peopleFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

peopleFactory.$inject = ['$resource', 'baseURL', 'storeFactory', 'resourceFactory', 'SCHEMA_CONST', 'PEOPLESCHEMA'];

function peopleFactory ($resource, baseURL, storeFactory, resourceFactory, SCHEMA_CONST, PEOPLESCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    ID_TAG: PEOPLESCHEMA.ID_TAG,
    getPeople: getPeople,
    getCount: getCount,
    newList: newList,
    delList: delList,
    setList: setList,
    getList: getList,
    initList: initList,
    setFilter: setFilter,
    setPager: setPager,
    applyFilter: applyFilter,
    newFilter: newFilter,
    forEachSchemaField: forEachSchemaField,
    getSortOptions: getSortOptions,
    getSortFunction: getSortFunction,
    isDescendingSortOrder: isDescendingSortOrder

    
  };
  
  return factory;

  /* function implementation
    -------------------------- */

  function getPeople () {
    return resourceFactory.getResources('people');
  }

  function getCount () {
    return resourceFactory.getCount('people');
  }
  
  function storeId (id) {
    return PEOPLESCHEMA.ID_TAG + id;
  }

  function newList (id, title, list, flags) {
    return resourceFactory.newResourceList(storeId(id), id, title, list, flags);
  }
  
  function delList (id, flags) {
    return resourceFactory.delResourceList(storeId(id), flags);
  }
  
  function setList (id, list, flags, title) {
    return resourceFactory.setResourceList(storeId(id), list, flags, function (flag) {
      return newList(id, title, list, flag);
    });
  }
  
  function getList(id, flags) {
    return resourceFactory.getResourceList(storeId(id), flags);
  }
  
  function initList (id) {
    return resourceFactory.initResourceList(storeId(id));
  }
    
  function setFilter (id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  function setPager (id, pager, flags) {
    return resourceFactory.setPager(storeId(id), pager, flags);
  }

  function applyFilter (id, filter, flags) {
    return resourceFactory.applyFilter(storeId(id), filter, flags);
  }

  function getSortOptions () {
    return PEOPLESCHEMA.SORT_OPTIONS;
  }

  function forEachSchemaField (callback) {
    PEOPLESCHEMA.SCHEMA.forEachField(callback);
  }
  
  function newFilter (base) {
    return resourceFactory.newResourceFilter(PEOPLESCHEMA.SCHEMA, base);
  }
  
  
  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'string') {
      var index = parseInt(sortFxn.substring(PEOPLESCHEMA.ID_TAG.length));
      switch (index) {
        case PEOPLESCHEMA.PEOPLE_FLD_FNAME_IDX:
          sortFxn = compareFname;
          break;
        case PEOPLESCHEMA.PEOPLE_FLD_LNAME_IDX:
          sortFxn = compareLname;
          break;
        default:
          sortFxn = undefined;
          break;
      }
    }
    return sortFxn;
  }

  function isDescendingSortOrder (sortBy) {
    return resourceFactory.isDescendingSortOrder(sortBy);
  }

  function compareFname (a, b) {
    return resourceFactory.compareStringFields(PEOPLESCHEMA.SCHEMA, PEOPLESCHEMA.PEOPLE_FLD_FNAME_IDX, a, b);
  }

  function compareLname (a, b) {
    return resourceFactory.compareStringFields(PEOPLESCHEMA.SCHEMA, PEOPLESCHEMA.PEOPLE_FLD_LNAME_IDX, a, b);
  }


}


  

