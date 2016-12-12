/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider) {

    var details = [
      { field: 'ID', modelName: '_id', dfltValue: undefined },
      { field: 'ADDR1', modelName: 'addrLine1', dfltValue: '' },
      { field: 'ADDR2', modelName: 'addrLine2', dfltValue: '' },
      { field: 'ADDR3', modelName: 'addrLine3', dfltValue: '' },
      { field: 'TOWN', modelName: 'town', dfltValue: '' },
      { field: 'CITY',  modelName: 'city', dfltValue: '' },
      { field: 'COUNTY', modelName: 'county', dfltValue: '' },
      { field: 'COUNTRY', modelName: 'country', dfltValue: '' },
      { field: 'PCODE', modelName: 'postcode', dfltValue: '' },
      { field: 'GPS', modelName: 'gps', dfltValue: '' },
      { field: 'VOTEDIST', modelName: 'votingDistrict', dfltValue: undefined },
      { field: 'OWNER', modelName: 'owner', dfltValue: undefined }
    ],
      ids = {},
      names = [],
      modelProps = [];

    for (var i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index
      names.push(details[i].modelName);
      modelProps.push({
        id: i,
        modelName: details[i].modelName, 
        dfltValue: details[i].dfltValue
      });
    }

    var ID_TAG = 'addrs.',
      schema = schemaProvider.getSchema('Address', modelProps),
      ADDRESS_ADDR_IDX = 
        schema.addField('addr', 'Address', [names[ids.ADDR1], names[ids.ADDR2], names[ids.ADDR3]], ID_TAG),
      ADDRESS_TOWN_IDX = 
        schema.addField('town', 'Town', names[ids.TOWN], ID_TAG),
      ADDRESS_CITY_IDX = 
        schema.addField('city', 'City', names[ids.CITY], ID_TAG),
      ADDRESS_COUNTY_IDX = 
        schema.addField('county', 'County', names[ids.COUNTY], ID_TAG),
      ADDRESS_POSTCODE_IDX =
        schema.addField('postcode', 'Postcode', names[ids.PCODE], ID_TAG),
      ADDRESS_GPS_IDX =
        schema.addField('gps', 'GPS', names[ids.GPS], ID_TAG),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                      [ADDRESS_ADDR_IDX, ADDRESS_TOWN_IDX, ADDRESS_CITY_IDX, ADDRESS_COUNTY_IDX, ADDRESS_POSTCODE_IDX], 
                      ID_TAG);

      $provide.constant('ADDRSCHEMA', {
        IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
        NAMES: names, // model names
        MODELPROPS: modelProps,

        SCHEMA: schema,
        // row indices
        ADDRESS_ADDR_IDX: ADDRESS_ADDR_IDX,
        ADDRESS_TOWN_IDX: ADDRESS_TOWN_IDX,
        ADDRESS_CITY_IDX: ADDRESS_CITY_IDX,
        ADDRESS_COUNTY_IDX: ADDRESS_COUNTY_IDX,
        ADDRESS_POSTCODE_IDX: ADDRESS_POSTCODE_IDX,
        ADDRESS_GPS_IDX: ADDRESS_GPS_IDX,

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
    getFilteredResource: getFilteredResource,
    stringifyAddress: stringifyAddress
    
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

  /**
   * Create a new address ResourceList object
   * @param   {string} id   Id of list
   * @param {object} args Argument object with the following properties:
   *   {string} id                          Id of list
   *   {string} title                       Title of list
   *   {Array}  list                        base list to use
   *   {number} [flags=storeFactory.NOFLAG] storeFactory flags
   * @returns {object} address ResourceList object
   */
  function newList (id, args) {
    var listArgs;
    if (args) {
      listArgs = angular.copy(args);
    } else {
      listArgs = {};
    }
    if (!listArgs.id) {
      listArgs.id = id;
    }
    listArgs.factory = 'addressFactory';

    return resourceFactory.newResourceList(storeId(id), listArgs);
//    var resList = resourceFactory.newResourceList(storeId(id), id, title, list, flags);
//    if (resList) {
//      resList.factory = this;
//    }
//    return resList;
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
        case ADDRSCHEMA.ADDRESS_ADDR_IDX:
          sortFxn = compareAddress;
          break;
        case ADDRSCHEMA.ADDRESS_TOWN_IDX:
          sortFxn = compareTown;
          break;
        case ADDRSCHEMA.ADDRESS_CITY_IDX:
          sortFxn = compareCity;
          break;
        case ADDRSCHEMA.ADDRESS_COUNTY_IDX:
          sortFxn = compareCounty;
          break;
        case ADDRSCHEMA.ADDRESS_POSTCODE_IDX:
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
    return resourceFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDRESS_ADDR_IDX, a, b);
  }

  function compareTown (a, b) {
    return resourceFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDRESS_TOWN_IDX, a, b);
  }

  function compareCity (a, b) {
    return resourceFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDRESS_CITY_IDX, a, b);
  }

  function compareCounty (a, b) {
    return resourceFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDRESS_COUNTY_IDX, a, b);
  }

  function comparePostcode (a, b) {
    return resourceFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDRESS_POSTCODE_IDX, a, b);
  }

  function stringifyAddress(addr, join) {
    if (!join) {
      join = ', ';
    }
    var str = '';
    forEachAddrSchemaField(function (idx, dialog, display, model, id) {
      model.forEach(function (property) {
        if (addr[property]) {
          var value = addr[property].trim();
          if (str) {
            str += join;
          }
          str += value;
        }
      });
    });
    return str;
  }


}




