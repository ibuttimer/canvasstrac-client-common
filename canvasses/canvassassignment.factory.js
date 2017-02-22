/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      {
        field: 'CANVASS', modelName: 'canvass', factory: 'canvassFactory',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'CANVASSER', modelName: 'canvasser', factory: 'userFactory',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'ADDRESSES', modelName: 'addresses', factory: 'addressFactory',
        dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY
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

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('canvassassignment'),
      schema = schemaProvider.getSchema('CanvassAssignment', modelProps, ids, ID_TAG),
      CANVASSASSIGN_CANVASS_IDX =
        schema.addFieldFromModelProp('canvass', 'Canvass', ids.CANVASS),
      CANVASSASSIGN_CANVASSER_IDX =
        schema.addFieldFromModelProp('canvasser', 'Canvasser', ids.CANVASSER),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                      [CANVASSASSIGN_CANVASS_IDX, CANVASSASSIGN_CANVASSER_IDX],
                      ID_TAG);

    $provide.constant('CANVASSASSIGN_SCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      CANVASSASSIGN_CANVASS_IDX: CANVASSASSIGN_CANVASS_IDX,
      CANVASSASSIGN_CANVASSER_IDX: CANVASSASSIGN_CANVASSER_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  })

  .filter('filterCanvassAssignment', ['SCHEMA_CONST', 'utilFactory', 'miscUtilFactory', function (SCHEMA_CONST, utilFactory, miscUtilFactory) {

    function filterCanvassAssignmentFilter(input, schema, filterBy) {

      // canvass assignment specific filter function

      // TODO filter canvass assignment function
      return input;
    }

    return filterCanvassAssignmentFilter;
  }])

  .factory('canvassAssignmentFactory', canvassAssignmentFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

canvassAssignmentFactory.$inject = ['$resource', '$injector', '$filter', 'baseURL', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'surveyFactory', 'canvassFactory',
  'addressFactory', 'electionFactory', 'userFactory', 'SCHEMA_CONST', 'CANVASSASSIGN_SCHEMA', 'consoleService'];
function canvassAssignmentFactory($resource, $injector, $filter, baseURL, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, surveyFactory, canvassFactory,
  addressFactory, electionFactory, userFactory, SCHEMA_CONST, CANVASSASSIGN_SCHEMA, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'canvassAssignmentFactory',
      getCanvassAssignment: getCanvassAssignment,
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,
      setFilter: setFilter,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      forEachSchemaField: forEachCanvassAssignSchemaField,
      getSortOptions: getSortOptions,
      getSortFunction: getSortFunction,

      ADDR_CANVSR_LINKCANVASSER: 'addrCanvsrlinkCanvasser', // canvasser whose allocation it is
      ADDR_CANVSR_LINKADDRESS: 'addrCanvsrlinkAddress',     // canvasser's address allocation 
      ADDR_CANVSR_CANVASSERLIST: 'addrCanvsrCanvasserList', // list ofcanvassers
      ADDR_CANVSR_ADDRESSLIST: 'addrCanvsrAddressList'      // list of addresses

    },
    con = consoleService.getLogger(factory.NAME),
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: CANVASSASSIGN_SCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    }),
    addrCanvsrLinkArgs = [factory.ADDR_CANVSR_LINKCANVASSER, factory.ADDR_CANVSR_LINKADDRESS,
        factory.ADDR_CANVSR_CANVASSERLIST, factory.ADDR_CANVSR_ADDRESSLIST];
  
  return factory;

  /* function implementation
    -------------------------- */

  function getCanvassAssignment () {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };

      add custom update & multiple save methods
    */
    return $resource(baseURL + 'canvassassignment/:id', { id: '@id' },
                      {
                        'update': { method: 'PUT' },
                        'saveMany': { method: 'POST', isArray: true }
                      });
  }

  
  /**
   * Read a server response canvass assignment object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  Canvass object
   */
  function readRspObject (response, args) {
    if (!args) {
      args = {};
    }
    if (!args.convert) {
      args.convert = readRspObjectValueConvert;
    }
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = CANVASSASSIGN_SCHEMA.SCHEMA.read(response, stdArgs);

    canvassFactory.processAddressResultsLink(response, stdArgs);

    processAddressCanvasserLink(response, stdArgs);

    con.debug('Read canvass assignment rsp object: ' + object);

    return object;
  }

  /**
   * Process the linking of canvassers and addresses
   * @param {object} response   Server response
   * @param {object} args       arguments object
   */
  function processAddressCanvasserLink (response, args) {
    if (args.linkAddressAndCanvasser) {
      var stdArgs = resourceFactory.standardiseArgs(args),
        linkArg = {};
      addrCanvsrLinkArgs.forEach(function (flag) {
        linkArg[flag] = resourceFactory.findAllInStandardArgs(stdArgs, function (arg) {
          return arg[flag];
        })
      });

      linkAddressAndCanvasser(linkArg, response, args.linkAddressAndCanvasser.labeller);
    }
  }

  /**
   * Convert values read from a server canvass assignment response
   * @param {number}    schema id 
   * @param {object}    read value
   * @returns {object}  Converted value
   */
  function readRspObjectValueConvert(id, value) {
    switch (id) {
      case CANVASSASSIGN_SCHEMA.IDs.CREATED:
      case CANVASSASSIGN_SCHEMA.IDs.UPDATED:
        value = new Date(value);
        break;
      default:
        // other fields require no conversion
        break;
    }
    return value;
  }

  /**
   * Read a canvass assignment response from the server
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array}  objId       id/array of ids of canvass & survey objects to save response data to
   *    {string|Array}  addrId      id/array of ids of list object(s) to save address data to
   *    {string|Array}  userId      id/array of ids of list object to save canvasser data to
   *    {number}        flags       storefactory flags
   *    {object}        surveyArgs  arguments to process embedded survey sub doc, 
   *                                @see surveyFactory.readResponse() for details
   *    {object}        electionArgs arguments to process embedded election sub doc, 
   *                                @see electionFactory.readResponse() for details
   *    {function}      next        function to call after processing
   * @return {object}   Canvass object
   */
  function readResponse (response, args) {

    var object = readRspObject(response, args);
    return storeRspObject(object, args);
  }

  /**
   * Store a canvass assignment response from the server
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string|Array}  objId       id/array of ids of canvass & survey objects to save response data to
   *    {string|Array}  addrId      id/array of ids of list object(s) to save address data to
   *    {string|Array}  userId      id/array of ids of list object to save canvasser data to
   *    {number}        flags       storefactory flags
   *    {object}        surveyArgs  arguments to process embedded survey sub doc, 
   *                                @see surveyFactory.readResponse() for details
   *    {object}        electionArgs arguments to process embedded election sub doc, 
   *                                @see electionFactory.readResponse() for details
   *    {function}      next        function to call after processing
   * @return {object}   Canvass object
   */
  function storeRspObject (obj, args) {

    var subObjects, i, stdArgs;

    // store sub objects first
    if (args.subObj) {
      subObjects = miscUtilFactory.toArray(args.subObj);
      for (i = 0; i < subObjects.length; ++i) {
        stdArgs = resourceFactory.standardiseArgs(subObjects[i]);

        resourceFactory.storeSubDoc(obj, stdArgs, args);
      }
    }

    con.debug('Store canvass assignment response: ' + obj);

    // just basic storage args as subdocs have been processed above
    var storeArgs = resourceFactory.copyBasicStorageArgs(args, {
      factory: $injector.get(factory.NAME)
    });

    return resourceFactory.storeServerRsp(obj, storeArgs);
  }

  /**
   * Create storeFactory id
   * @param {string}   id   Factory id to generate storeFactory id from
   */
  function storeId (id) {
    return CANVASSASSIGN_SCHEMA.ID_TAG + id;
  }
  
  /**
   * Set the filter for a canvass assignment ResourceList object
   * @param {string} id     Factory id of object
   * @param   {object} [filter={}] Filter object to use, ResourceFilter object or no filter
   * @param {number} flags  storefactory flags
   * @returns {object} canvass assignment ResourceList object
   */
  function setFilter(id, filter, flags) {
    if (!filter) {
      filter = newFilter();
    }
    return resourceFactory.setFilter(storeId(id), filter, flags);
  }

  /**
   * Get the default sort options for a canvass assignment ResourceList object
   * @returns {object} canvass assignment ResourceList sort options
   */
  function getSortOptions() {
    return CANVASSASSIGN_SCHEMA.SORT_OPTIONS;
  }

  /**
   * Execute the callback on each of the schema fields
   */
  function forEachCanvassAssignSchemaField (callback) {
    CANVASSASSIGN_SCHEMA.SCHEMA.forEachField(callback);
  }
  
  /**
   * Get a new filter object
   * @param {object} base           filter base object
   * @param {function} customFilter custom filter function
   * @returns {object} canvass assignment ResourceList filter object
   */
  function newFilter(base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = filterFactory.newResourceFilter(CANVASSASSIGN_SCHEMA.SCHEMA, base);
    filter.customFunction = customFilter;
    return filter;
  }
  
  /**
   * Generate a filtered list
   * @param {object} reslist    canvass assignment ResourceList object to filter
   * @param {object} filter     filter to apply
   * @param {function} xtraFilter Function to provide additional filtering
   * @returns {Array} filtered list
   */
  function getFilteredList (reslist, filter, xtraFilter) {
    // canvass assignment specific filter function
    return filterFactory.getFilteredList('filterCanvassAssignment', reslist, filter, xtraFilter);
  }
  
  /**
   * Default canvass assignment ResourceList custom filter function
   * @param {object} reslist    canvass assignment ResourceList object to filter
   * @param {object} filter     filter to apply
   */
  function filterFunction(reslist, filter) {
    // canvass assignment specific filter function
    reslist.filterList = getFilteredList(reslist, filter);
  }
  
  /**
   * Get the sort function for a canvass assignment ResourceList
   * @param   {object} sortOptions  List of possible sort option
   * @param   {object} sortBy       Key to sort by
   * @returns {function} sort function
   */
  function getSortFunction(options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === CANVASSASSIGN_SCHEMA.ID_TAG) {
        switch (sortItem.index) {
          //case CANVASSASSIGN_SCHEMA.CANVASSASSIGN_CANVASS_IDX:
          //  sortFxn = compareAvailable;
          //  break;
          //case CANVASSASSIGN_SCHEMA.CANVASSASSIGN_CANVASSER_IDX:
          //  sortFxn = compareDontCanvass;
          //  break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }


  function linkAddressAndCanvasser(linkArg, response, labeller) {
    if (linkArg) {
      var i = 0,
        lists = {};
      addrCanvsrLinkArgs.forEach(function (flag) {
        if (linkArg[flag]) {
          ++i;
        }
      });
      if (i === addrCanvsrLinkArgs.length) {
        // get all objects
        addrCanvsrLinkArgs.forEach(function (flag) {
          lists[flag] = [];
          miscUtilFactory.toArray(linkArg[flag]).forEach(function (objArg) {
            lists[flag].push(resourceFactory.getObjectInfo(response, objArg).object);
          });
        });

        i = 0;
        addrCanvsrLinkArgs.forEach(function (flag) {
          if (lists[flag].length) {
            ++i;
          }
        });
        if (i === addrCanvsrLinkArgs.length) {
          // have all the info
          if (lists[factory.ADDR_CANVSR_LINKCANVASSER].length != 1) {
            throw new Error('Multiple link canvassers specified');
          }
          if (lists[factory.ADDR_CANVSR_LINKADDRESS].length != 1) {
            throw new Error('Multiple link addresses specified');
          }
          var canvasserToLink,
            addressToLink;

          lists[factory.ADDR_CANVSR_LINKCANVASSER].forEach(function (linkCanvasser) {
            // find canvasser whose allocation it is in list of assigned canvassers
            lists[factory.ADDR_CANVSR_CANVASSERLIST].forEach(function (canvasserList) {
              canvasserToLink = canvasserList.find(function (canvsr) {
                return (canvsr._id === linkCanvasser._id);
              });
              if (canvasserToLink) {
                lists[factory.ADDR_CANVSR_LINKADDRESS].forEach(function (linkAddressList) {
                  linkAddressList.forEach(function (linkAddress) {
                    // find address to link in list of addresses  
                    lists[factory.ADDR_CANVSR_ADDRESSLIST].forEach(function (addressList) {
                      addressToLink = addressList.find(function (addr) {
                        return (addr._id === linkAddress._id);
                      });
                      if (addressToLink) {
                        linkCanvasserToAddr(canvasserToLink, addressToLink, labeller);
                      }
                    });
                  });
                });
              }
            });
          });
        }
      }

    }
  }

  /**
   * Link the specified canvasser and address
   * @param {object}   canvasser  Canvasser object to link
   * @param {object}   addr       Address object to link
   */
  function linkCanvasserToAddr (canvasser, addr, labeller) {
    if (!canvasser.addresses) {
      canvasser.addresses = [];
    }
    if (findAddrIndex(canvasser, addr) < 0) {
      canvasser.addresses.push(addr._id); // not in list so add
    }

    addr.canvasser = canvasser._id;
    addr.badge = getFirstLetters(canvasser.person.firstname) + 
                  getFirstLetters(canvasser.person.lastname);

    if (!canvasser.labelClass) {
      canvasser.labelClass = labeller();
    }
    addr.labelClass = canvasser.labelClass;
  }

  /**
   * Link the specified canvasser and address
   * @param {object}   canvasser  Canvasser object to link
   * @param {object}   addr       Address object to link
   */
  function findAddrIndex (canvasser, addr) {
    return canvasser.addresses.findIndex(function (entry) {
                                            return (entry === this._id);
                                          }, addr);
  }

  /**
   * Get the first letters of all words in a string
   * @param {string}   str  String to get leading letter from
   * @return {string}  String of leading letters
   */
  function getFirstLetters (str) {
    var splits,
      letters = '';
    if (str) {
      splits = str.split(' ');
      splits.forEach(function (split) {
        letters += split.charAt(0);
      });
    }
    return letters;
  }

  /**
   * Unlink the specified canvasser and address
   * @param {object}   canvasser  Canvasser object to unlink
   * @param {object}   addr       Address object to unlink
   */
  function unlinkAddrFromCanvasser (canvasser, addr) {
    if (canvasser.addresses) {
      var idx = findAddrIndex(canvasser, addr);
      if (idx >= 0) {
        canvasser.addresses.splice(idx, 1); // remove from list
      }
    }
    delete addr.canvasser;
    delete addr.badge;
  }




}

