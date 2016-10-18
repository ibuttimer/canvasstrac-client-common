/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider, SCHEMA_CONST, PEOPLESCHEMA, ADDRSCHEMA) {

    var ID_TAG = 'user.',
      schema = schemaProvider.getSchema(),
      sortOptions;
  
    // user schem is a combination of the person & adress
    PEOPLESCHEMA.SCHEMA.forEachField(
      function (index, dialog, display, model, id) {
        schema.addField(dialog, display, model, id);
    });
    ADDRSCHEMA.SCHEMA.forEachField(
      function (index, dialog, display, model, id) {
        schema.addField(dialog, display, model, id);
    });

    // generate list of sort options
    sortOptions = angular.copy(PEOPLESCHEMA.SORT_OPTIONS);
    ADDRSCHEMA.SORT_OPTIONS.forEach(function (option) {
      var i, 
        basic = false;
      for (i = 0; !basic && (i < SCHEMA_CONST.BASIC_SORT_OPTIONS.length); ++i) {
        basic = (option.value === SCHEMA_CONST.BASIC_SORT_OPTIONS[i].value);
      }
      if (!basic) {
        sortOptions.push(option);
      }
    });

  
    $provide.constant('USERSCHEMA', {
      SCHEMA: schema,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  })

  .filter('filterUser', ['SCHEMA_CONST', 'PEOPLESCHEMA', 'ADDRSCHEMA', 'utilFactory', 'miscUtilFactory', 'filterAddrFilter', function (SCHEMA_CONST, PEOPLESCHEMA, ADDRSCHEMA, utilFactory, miscUtilFactory) {
    
    function filterUserFilter (input, schema, filterBy) {
      
      // user specific filter function
      var out = [];

      if (!miscUtilFactory.isEmpty(filterBy)) {
        angular.forEach(input, function (user) {
          schema.forEachField(function(idx, dialog, display, models, id) {
            var filterVal = filterBy[dialog]; // filter uses dialog properties
            if (filterVal) {
              var userObj;
              if (id === PEOPLESCHEMA.ID_TAG) {
                userObj = user.person;  // person embedded object
              } else if (id === ADDRSCHEMA.ID_TAG) {
                userObj = user.person.address;  // address embedded object
              }
              if (userObj) {
                filterVal = filterVal.toLowerCase();
                // apply OR logic to multiple model fields
                var match = false;
                for (var j = 0; !match && (j < models.length); ++j) {
                  var userVal = userObj[models[j]];
                  if (userVal) {
                    match = (userVal.toLowerCase().indexOf(filterVal) >= 0);
                  }
                }
                if (match) {
                  out.push(user);
                }
              }
            }
          });
        });
      } else {
        out = input;
      }
      return out;
    }
    
    return filterUserFilter;
  }])

  .factory('userFactory', userFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

userFactory.$inject = ['$resource', '$filter', 'baseURL', 'storeFactory', 'resourceFactory', 'SCHEMA_CONST', 'USERSCHEMA', 'PEOPLESCHEMA', 'ADDRSCHEMA', 'peopleFactory', 'addressFactory', 'NgDialogFactory'];

function userFactory ($resource, $filter, baseURL, storeFactory, resourceFactory, SCHEMA_CONST, USERSCHEMA, PEOPLESCHEMA, ADDRSCHEMA, peopleFactory, addressFactory, NgDialogFactory) {


  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    ID_TAG: USERSCHEMA.ID_TAG,
    getUsers: getUsers,
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
    getFilteredList: getFilteredList,
    forEachSchemaField: forEachUserSchemaField,
    getSortOptions: getSortOptions,
    getSortFunction: getSortFunction,
    isDescendingSortOrder: isDescendingSortOrder,
    getFilteredResource: getFilteredResource

  };
  
  return factory;

  /* function implementation
    -------------------------- */

  function getUsers () {
    return resourceFactory.getResources('users');
  }

  function getCount () {
    return resourceFactory.getCount('users');
  }
  
  function getFilteredResource (resList, filter, success, failure, forEachSchemaField) {
    
    filter = filter || newFilter();

    if (typeof filter === 'function') {
      forEachSchemaField = failure;
      failure = success;
      filter = newFilter();
    }
    if (!forEachSchemaField) {
      forEachSchemaField = forEachUserSchemaField;
    }

    var query = resourceFactory.buildQuery(forEachSchemaField, filter.filterBy);

    resList.setList([]);
    getUsers().query(query).$promise.then(
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


  function storeId (id) {
    return USERSCHEMA.ID_TAG + id;
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
    return USERSCHEMA.SORT_OPTIONS;
  }

  function forEachUserSchemaField (callback) {
    USERSCHEMA.SCHEMA.forEachField(callback);
  }
  
  function newFilter (base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = resourceFactory.newResourceFilter(USERSCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }
  
  function getFilteredList (userList, filter) {
    // user specific filter function
    return $filter('filterUser')(userList.list, userList.filter.schema, filter);
  }
  
  function filterFunction (userList, filter) {
    // user specific filter function
    userList.filterList = getFilteredList(userList, filter);
  }
  
  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'string') {
      var idTag = sortFxn.substring(0, ADDRSCHEMA.ID_TAG.length);
      if (idTag === ADDRSCHEMA.ID_TAG) {
        sortFxn = addressFactory.getSortFunction (options, sortBy);
      } else {
        idTag = sortFxn.substring(0, PEOPLESCHEMA.ID_TAG.length);
        if (idTag === PEOPLESCHEMA.ID_TAG) {
          sortFxn = peopleFactory.getSortFunction (options, sortBy);
        }
      }
    }
    return sortFxn;
  }

  function isDescendingSortOrder (sortBy) {
    return resourceFactory.isDescendingSortOrder(sortBy);
  }

}





