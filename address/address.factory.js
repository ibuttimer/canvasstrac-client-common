/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      schemaProvider.getStringModelPropArgs('addrLine1', { field: 'ADDR1' }),
      schemaProvider.getStringModelPropArgs('addrLine2', { field: 'ADDR2' }),
      schemaProvider.getStringModelPropArgs('addrLine3', { field: 'ADDR3' }),
      schemaProvider.getStringModelPropArgs('town', { field: 'TOWN' }),
      schemaProvider.getStringModelPropArgs('city', { field: 'CITY' }),
      schemaProvider.getStringModelPropArgs('county', { field: 'COUNTY' }),
      schemaProvider.getStringModelPropArgs('country', { field: 'COUNTRY' }),
      schemaProvider.getStringModelPropArgs('postcode', { field: 'PCODE' }),
      schemaProvider.getStringModelPropArgs('gps', { field: 'GPS' }),
      schemaProvider.getObjectIdModelPropArgs('votingDistrict', undefined, undefined, undefined, undefined, { field: 'VOTEDIST' }),
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
  }])

  .factory('addressFactory', addressFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

addressFactory.$inject = ['$filter', '$injector', 'baseURL', 'consoleService', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'SCHEMA_CONST', 'ADDRSCHEMA'];

function addressFactory($filter, $injector, baseURL, consoleService, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, SCHEMA_CONST, ADDRSCHEMA) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'addressFactory',

      readRspObject: readRspObject,

      getSortFunction: getSortFunction,
      stringifyAddress: stringifyAddress
    },
    con = consoleService.getLogger(factory.NAME);

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: ADDRSCHEMA.ID_TAG,
    schema: ADDRSCHEMA.SCHEMA,
    sortOptions: ADDRSCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      address: resourceFactory.getResourceConfigWithId('addresses'),
      count: resourceFactory.getResourceConfig('addresses/count')
    }
  });
  
  return factory;

  /* function implementation
    -------------------------- */

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
    factory.forEachSchemaField(function (fieldProp) {
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




