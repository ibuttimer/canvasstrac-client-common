/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

.config(function ($provide, schemaProvider) {

  var fields = [
    'ADDR1',
    'ADDR2',
    'ADDR3',
    'TOWN',
    'CITY',
    'COUNTY',
    'COUNTRY',
    'PCODE',
    'GPS',
    'VOTEDIST',
    'OWNER'
  ],
    names = [   // model names
      'addrLine1',
      'addrLine2',
      'addrLine3',
      'town',
      'city',
      'county',
      'country',
      'postcode',
      'gps',
      'votingDistrict',
      'owner'
    ],
    ids = {},
    objs = [];

  for (var i = 0; i < fields.length; ++i) {
    ids[fields[i]] = i;               // id is index
    objs.push({id: i, name: names[i]});
  }

  var ID_TAG = 'addrs.',
    schema = schemaProvider.getSchema(),
    ADDR_FLD_ADDR_IDX = 
      schema.addField('addr', 'Address', [names[ids.ADDR1], names[ids.ADDR2], names[ids.ADDR3]], ID_TAG),
    ADDR_FLD_TOWN_IDX = 
      schema.addField('town', 'Town', names[ids.TOWN], ID_TAG),
    ADDR_FLD_CITY_IDX = 
      schema.addField('city', 'City', names[ids.CITY], ID_TAG),
    ADDR_FLD_COUNTY_IDX = 
      schema.addField('county', 'County', names[ids.COUNTY], ID_TAG),
    ADDR_FLD_POSTCODE_IDX = 
      schema.addField('postcode', 'Postcode', names[ids.PCODE], ID_TAG),
      
    // generate list of sort options
    sortOptions = schemaProvider.makeSortList(schema, 
                    [ADDR_FLD_ADDR_IDX, ADDR_FLD_TOWN_IDX, ADDR_FLD_CITY_IDX, ADDR_FLD_COUNTY_IDX, ADDR_FLD_POSTCODE_IDX], 
                    ID_TAG);

    $provide.constant('ADDRSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      NAMES: names, // model names
      OBJs: objs,

      SCHEMA: schema,
      // row indices
      ADDR_FLD_ADDR_IDX: ADDR_FLD_ADDR_IDX,
      ADDR_FLD_TOWN_IDX: ADDR_FLD_TOWN_IDX,
      ADDR_FLD_CITY_IDX: ADDR_FLD_CITY_IDX,
      ADDR_FLD_COUNTY_IDX: ADDR_FLD_COUNTY_IDX,
      ADDR_FLD_POSTCODE_IDX: ADDR_FLD_POSTCODE_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  })


  .filter('filterAddr', ['miscUtilFactory', function (miscUtilFactory) {

    function filterAddrFilter (input, schema, filterBy) {
      
      // address specific filter function
      var out = [];

      if (!miscUtilFactory.isEmpty(filterBy)) {
        angular.forEach(input, function (addr) {
          schema.forEachField(function(idx, dialog, display, model, id) {
            var filterVal = filterBy[dialog]; // filter uses dialog properties
            if (filterVal) {
              filterVal = filterVal.toLowerCase();
              // apply OR logic to multiple model fields
              var match = false;
              for (var j = 0; !match && (j < model.length); ++j) {
                var addrVal = addr[model[j]];
                if (addrVal) {
                  match = (addrVal.toLowerCase().indexOf(filterVal) >= 0);
                }
              }
              if (match) {
                out.push(addr);
              }
            }
          });
        });
      } else {
        out = input;
      }
      return out;
    }

    return filterAddrFilter;
  }])

  .factory('addressFactory', addressFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

addressFactory.$inject = ['$resource', '$filter', '$injector', 'baseURL', 'storeFactory', 'resourceFactory', 'SCHEMA_CONST', 'ADDRSCHEMA'];

function addressFactory ($resource, $filter, $injector, baseURL, storeFactory, resourceFactory, SCHEMA_CONST, ADDRSCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    ID_TAG: ADDRSCHEMA.ID_TAG,
    getAddresses: getAddresses,
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
    forEachSchemaField: forEachAddrSchemaField,
    getSortOptions: getSortOptions,
    getSortFunction: getSortFunction,
    isDescendingSortOrder: isDescendingSortOrder,
    getFilteredResource: getFilteredResource

    
  };
  
  return factory;

  /* function implementation
    -------------------------- */

  function getAddresses () {
    return resourceFactory.getResources('addresses');
  }

  function getCount () {
    return resourceFactory.getCount('addresses');
  }
  
  function getFilteredResource (resList, filter, success, failure, forEachSchemaField) {
    
    filter = filter || newFilter();

    if (typeof filter === 'function') {
      forEachSchemaField = failure;
      failure = success;
      filter = newFilter();
    }
    if (!forEachSchemaField) {
      forEachSchemaField = forEachAddrSchemaField;
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
    return ADDRSCHEMA.ID_TAG + id;
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
    return ADDRSCHEMA.SORT_OPTIONS;
  }

  function forEachAddrSchemaField (callback) {
    ADDRSCHEMA.SCHEMA.forEachField(callback);
  }
  
  function newFilter (base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = resourceFactory.newResourceFilter(ADDRSCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }
  
  
  function getFilteredList (addrList, filter) {
    // address specific filter function
    return $filter('filterAddr')(addrList.list, addrList.filter.schema, filter);
  }
  
  function filterFunction (addrList, filter) {
    // address specific filter function
    addrList.filterList = getFilteredList(addrList, filter);
  }
  
  
  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'string') {
      var index = parseInt(sortFxn.substring(ADDRSCHEMA.ID_TAG.length));
      switch (index) {
        case ADDRSCHEMA.ADDR_FLD_ADDR_IDX:
          sortFxn = compareAddress;
          break;
        case ADDRSCHEMA.ADDR_FLD_TOWN_IDX:
          sortFxn = compareTown;
          break;
        case ADDRSCHEMA.ADDR_FLD_CITY_IDX:
          sortFxn = compareCity;
          break;
        case ADDRSCHEMA.ADDR_FLD_COUNTY_IDX:
          sortFxn = compareCounty;
          break;
        case ADDRSCHEMA.ADDR_FLD_POSTCODE_IDX:
          sortFxn = comparePostcode;
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

  function compareAddress (a, b) {
    return resourceFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDR_FLD_ADDR_IDX, a, b);
  }

  function compareTown (a, b) {
    return resourceFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDR_FLD_TOWN_IDX, a, b);
  }

  function compareCity (a, b) {
    return resourceFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDR_FLD_CITY_IDX, a, b);
  }

  function compareCounty (a, b) {
    return resourceFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDR_FLD_COUNTY_IDX, a, b);
  }

  function comparePostcode (a, b) {
    return resourceFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDR_FLD_POSTCODE_IDX, a, b);
  }


}




