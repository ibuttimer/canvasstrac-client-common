/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      {
        field: 'ADDR1', modelName: 'addrLine1',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'ADDR2', modelName: 'addrLine2',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'ADDR3', modelName: 'addrLine3',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'TOWN', modelName: 'town',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'CITY', modelName: 'city',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'COUNTY', modelName: 'county',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'COUNTRY', modelName: 'country',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'PCODE', modelName: 'postcode',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'GPS', modelName: 'gps',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      {
        field: 'VOTEDIST', modelName: 'votingDistrict',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'OWNER', modelName: 'owner',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
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

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('addrs'),
      schema = schemaProvider.getSchema('Address', modelProps, ids, ID_TAG),
      ADDRESS_ADDR_IDX = 
        schema.addFieldFromModelProp('addr', 'Address', [ids.ADDR1, ids.ADDR2, ids.ADDR3]),
      ADDRESS_TOWN_IDX = 
        schema.addFieldFromModelProp('town', 'Town', ids.TOWN),
      ADDRESS_CITY_IDX = 
        schema.addFieldFromModelProp('city', 'City', ids.CITY),
      ADDRESS_COUNTY_IDX = 
        schema.addFieldFromModelProp('county', 'County', ids.COUNTY),
      ADDRESS_POSTCODE_IDX =
        schema.addFieldFromModelProp('postcode', 'Postcode', ids.PCODE),
      ADDRESS_GPS_IDX =
        schema.addFieldFromModelProp('gps', 'GPS', ids.GPS),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                      [ADDRESS_ADDR_IDX, ADDRESS_TOWN_IDX, ADDRESS_CITY_IDX, ADDRESS_COUNTY_IDX, ADDRESS_POSTCODE_IDX], 
                      ID_TAG);

      $provide.constant('ADDRSCHEMA', {
        IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
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

  .filter('filterAddr', ['miscUtilFactory', 'SCHEMA_CONST', function (miscUtilFactory, SCHEMA_CONST) {

    function filterAddrFilter (input, schema, filterBy) {
      
      // address specific filter function
      var out = [];

      if (!miscUtilFactory.isEmpty(filterBy)) {
        var testCnt = 0,  // num of fields to test as speced by filter
          matchCnt;       // num of fields matching filter
        schema.forEachField(function(idx, fieldProp) {
          if (filterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]]) {  // filter uses dialog properties
            ++testCnt;
          }
        });
        angular.forEach(input, function (addr) {
          matchCnt = 0;
          schema.forEachField(function(idx, fieldProp) {
            var filterVal = filterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]];  // filter uses dialog properties
            if (filterVal) {
              filterVal = filterVal.toLowerCase();
              // apply OR logic to multiple model fields
              var match = false,
                model = fieldProp[SCHEMA_CONST.MODEL_PROP];
              for (var j = 0; !match && (j < model.length); ++j) {
                var addrVal = addr[model[j]];
                if (addrVal) {
                  match = (addrVal.toLowerCase().indexOf(filterVal) >= 0);
                }
              }
              if (match) {
                ++matchCnt;
                if (matchCnt === testCnt) {
                  out.push(addr);
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

    return filterAddrFilter;
  }])

  .factory('addressFactory', addressFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

addressFactory.$inject = ['$resource', '$filter', '$injector', 'baseURL', 'consoleService', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'SCHEMA_CONST', 'ADDRSCHEMA'];

function addressFactory($resource, $filter, $injector, baseURL, consoleService, storeFactory, resourceFactory, compareFactory, filterFactory, SCHEMA_CONST, ADDRSCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'addressFactory',
      getAddresses: getAddresses,
      getCount: getCount,

      readRspObject: readRspObject,

      setFilter: setFilter,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      forEachSchemaField: forEachAddrSchemaField,
      getSortOptions: getSortOptions,
      getSortFunction: getSortFunction,
      getFilteredResource: getFilteredResource,
      stringifyAddress: stringifyAddress
    },
    con = consoleService.getLogger(factory.NAME),
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: ADDRSCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    });
  
  return factory;

  /* function implementation
    -------------------------- */

  function getAddresses () {
    return resourceFactory.getResources('addresses');
  }

  function getCount () {
    return resourceFactory.getCount('addresses');
  }

  /**
   * Read a server response address object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  Address object
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
      object = ADDRSCHEMA.SCHEMA.read(response, stdArgs);

    con.debug('Read address rsp object: ' + object);

    return object;
  }

  /**
   * Create storeFactory id
   * @param {string}   id   Factory id to generate storeFactory id from
   */
  function storeId(id) {
    return ADDRSCHEMA.ID_TAG + id;
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
  
  function setFilter (id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
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
    var filter = filterFactory.newResourceFilter(ADDRSCHEMA.SCHEMA, base);
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
    // address specific filter function
    return filterFactory.getFilteredList('filterAddr', reslist, filter, xtraFilter);
  }
  
  function filterFunction (addrList, filter) {
    // address specific filter function
    addrList.filterList = getFilteredList(addrList, filter);
  }
  
  
  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === ADDRSCHEMA.ID_TAG) {
        switch (sortItem.index) {
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
    }
    return sortFxn;
  }

  function compareAddress (a, b) {
    return compareFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDRESS_ADDR_IDX, a, b);
  }

  function compareTown (a, b) {
    return compareFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDRESS_TOWN_IDX, a, b);
  }

  function compareCity (a, b) {
    return compareFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDRESS_CITY_IDX, a, b);
  }

  function compareCounty (a, b) {
    return compareFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDRESS_COUNTY_IDX, a, b);
  }

  function comparePostcode (a, b) {
    return compareFactory.compareStringFields(ADDRSCHEMA.SCHEMA, ADDRSCHEMA.ADDRESS_POSTCODE_IDX, a, b);
  }

  function stringifyAddress (addr, join) {
    if (!join) {
      join = ', ';
    }
    var str = '';
    forEachAddrSchemaField(function (idx, fieldProp) {
      fieldProp[SCHEMA_CONST.MODEL_PROP].forEach(function (property) {
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




