/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'CANVASSSCHEMA', 'USERSCHEMA', 'ADDRSCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, CANVASSSCHEMA, USERSCHEMA, ADDRSCHEMA) {

    var details = [
      SCHEMA_CONST.ID,
      schemaProvider.getObjectIdModelPropArgs('canvass', 'canvassFactory', 'canvass', CANVASSSCHEMA, CANVASSSCHEMA.IDs.ID, { field: 'CANVASS' }),
      schemaProvider.getObjectIdModelPropArgs('canvasser', 'userFactory', 'user', USERSCHEMA, USERSCHEMA.IDs.ID, { field: 'CANVASSER' }),
      schemaProvider.getObjectIdArrayModelPropArgs('addresses', 'addressFactory', 'address', ADDRSCHEMA, ADDRSCHEMA.IDs.ID, { field: 'ADDRESSES' }),
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
  }])

  .factory('canvassAssignmentFactory', canvassAssignmentFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

canvassAssignmentFactory.$inject = ['$injector', '$filter', 'baseURL', 'storeFactory', 'resourceFactory', 'compareFactory', 'filterFactory', 'miscUtilFactory', 'surveyFactory', 'canvassFactory',
  'addressFactory', 'electionFactory', 'userFactory', 'SCHEMA_CONST', 'CANVASSASSIGN_SCHEMA', 'consoleService', 'undoFactory'];
function canvassAssignmentFactory($injector, $filter, baseURL, storeFactory, resourceFactory, compareFactory, filterFactory, miscUtilFactory, surveyFactory, canvassFactory,
  addressFactory, electionFactory, userFactory, SCHEMA_CONST, CANVASSASSIGN_SCHEMA, consoleService, undoFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'canvassAssignmentFactory',
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,

      getSortFunction: getSortFunction,

      linkCanvasserToAddr: linkCanvasserToAddr,
      unlinkAddrFromCanvasser: unlinkAddrFromCanvasser,
      unlinkAddrListFromCanvasser: unlinkAddrListFromCanvasser,
      setLabeller: setLabeller,

      // objects to be extracted from response
      ADDR_CANVSR_LINKCANVASSER: 'addrCanvsrlinkCanvasser',   // canvasser whose allocation it is
      ADDR_CANVSR_LINKADDRESS: 'addrCanvsrlinkAddress',       // canvasser's address allocation 
      ADDR_CANVSR_CANVASSERARRAY: 'addrCanvsrCanvasserArray', // array of canvassers
      ADDR_CANVSR_ADDRESSARRAY: 'addrCanvsrAddressArray',     // array of addresses
      // objects to be extracted from store
      ADDR_CANVSR_CANVASSERLIST: 'addrCanvsrCanvasserList',   // ResourceList of canvassers
      ADDR_CANVSR_ADDRESSLIST: 'addrCanvsrAddressList'        // ResourceList of addresses

    },
    con = consoleService.getLogger(factory.NAME),
    addrCanvsrLinkArgs = [factory.ADDR_CANVSR_LINKCANVASSER, factory.ADDR_CANVSR_LINKADDRESS],
    addrCanvsrCanvsrsArgs = [factory.ADDR_CANVSR_CANVASSERARRAY, factory.ADDR_CANVSR_CANVASSERLIST],
    addrCanvsrAddrsArgs = [factory.ADDR_CANVSR_ADDRESSARRAY, factory.ADDR_CANVSR_ADDRESSLIST],
    addrCanvsrObjArgs = addrCanvsrLinkArgs.concat(factory.ADDR_CANVSR_ADDRESSARRAY, factory.ADDR_CANVSR_CANVASSERARRAY),
    addrCanvsrListArgs = [factory.ADDR_CANVSR_CANVASSERLIST, factory.ADDR_CANVSR_ADDRESSLIST],
    addrCanvsrAllArgs = addrCanvsrObjArgs.concat(addrCanvsrListArgs),
    dfltLabeller;

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: CANVASSASSIGN_SCHEMA.ID_TAG,
    schema: CANVASSASSIGN_SCHEMA.SCHEMA,
    sortOptions: CANVASSASSIGN_SCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      assignment: resourceFactory.getResourceConfigWithId('canvassassignment', {
                        saveMany: { method: 'POST', isArray: true }
                      }),
      canvasses: resourceFactory.getResourceConfig('canvassassignment/canvasses')
    }
  });

  return factory;

  /* function implementation
    -------------------------- */

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

    canvassFactory.processAddressResultsLink(object, stdArgs);

    processAddressCanvasserLink(object, stdArgs);

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
      addrCanvsrAllArgs.forEach(function (flag) {
        linkArg[flag] = resourceFactory.findAllInStandardArgs(stdArgs, function (arg) {
          return arg[flag];
        });
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

  /**
   * Link addresses & canvassers
   * @throws {Error} for incorrect arguments
   * @param   {object}   linkArg  Link arguments
   * @param   {object}   response Data to process
   * @param   {function} labeller Function to generate label classes
   */
  function linkAddressAndCanvasser(linkArg, response, labeller) {
    if (linkArg) {
      var link = countProperties(addrCanvsrLinkArgs, linkArg),
        canvsrs = countProperties(addrCanvsrCanvsrsArgs, linkArg),
        addrs = countProperties(addrCanvsrAddrsArgs, linkArg),
        lists = {},
        addressToLink;
      
      // check have all the args
      if ((link === addrCanvsrLinkArgs.length) && (canvsrs >= 1) && (addrs >= 1)) {
        // have all link args and, canvassers & addresses to connect
        // response may be an array depending on query params
        miscUtilFactory.toArray(response).forEach(function (canvasserAssignment) {

          // get the objects
          addrCanvsrObjArgs.forEach(function (flag) {
            lists[flag] = [];
            miscUtilFactory.toArray(linkArg[flag]).forEach(function (objArg) {
              lists[flag].push(resourceFactory.getObjectInfo(canvasserAssignment, objArg).object);
            });
          });
          // get the lists
          addrCanvsrListArgs.forEach(function (flag) {
            lists[flag] = [];
            miscUtilFactory.toArray(linkArg[flag]).forEach(function (listArg) {
              miscUtilFactory.toArray(listArg.objId).forEach(function (objId) {
                lists[flag].push(listArg.factory.getList(objId));
              });
            });
          });

          // check have all the data
          link = countPropertiesLength(addrCanvsrLinkArgs, linkArg);
          canvsrs = countPropertiesLength(addrCanvsrCanvsrsArgs, linkArg);
          addrs = countPropertiesLength(addrCanvsrAddrsArgs, linkArg);
          if ((link === addrCanvsrLinkArgs.length) && (canvsrs >= 1) && (addrs >= 1)) {
            // have all the info i.e. canvasser whose alloc it is and the allocations in the canvass subdoc
            var canvasserToLink,
              linkCanvasserData = lists[factory.ADDR_CANVSR_LINKCANVASSER], // array of link canvasser
              linkAddressData = lists[factory.ADDR_CANVSR_LINKADDRESS],     // array of link canvasser's addresses
              linkCanvasserListArray = [],   // array of array's of canvassers
              linkAddressListArray = [];     // array of array's of addresses
            if (linkCanvasserData.length > 1) {
              throw new Error('Multiple link canvassers specified');
            }
            if (linkAddressData.length > 1) {
              throw new Error('Multiple link addresses specified');
            }

            addrCanvsrCanvsrsArgs.forEach(function (canvsrs) {
              if (lists[canvsrs].length) {
                linkCanvasserListArray.push(lists[canvsrs]);
              }
            });
            addrCanvsrAddrsArgs.forEach(function (addrs) {
              if (lists[addrs].length) {
                linkAddressListArray.push(lists[addrs]);
              }
            });

            linkCanvasserData.forEach(function (linkCanvasser) {
              if (linkCanvasser) {
                // find canvasser whose allocation it is in list of assigned canvassers
                linkCanvasserListArray.forEach(function (linkCanvasserListData) {
                  linkCanvasserListData.forEach(function (canvasserList) {
                    var canvsrFind;
                    if (canvasserList.isResourceList) {
                      canvsrFind = 'findInList';  // resource list find function
                    } else {
                      canvsrFind = 'find';        // Array find function
                    }
                    canvasserToLink = canvasserList[canvsrFind](function (canvsr) {
                      return (canvsr._id === linkCanvasser._id);
                    });
                    if (canvasserToLink) {

                      // save id of canvasser's allocation record
                      canvasserToLink.allocId = canvasserAssignment._id;

                      // find the allocated address in the list of assigned addresses
                      linkAddressData.forEach(function (linkAddressList) {
                        if (linkAddressList) {
                          linkAddressList.forEach(function (linkAddress) {
                            // find address to link in list of addresses
                            linkAddressListArray.forEach(function (linkAddressListData) {
                              linkAddressListData.forEach(function (addressList) {
                                var addrFind;
                                if (addressList.isResourceList) {
                                  addrFind = 'findInList';  // resource list find function
                                } else {
                                  addrFind = 'find';        // Array find function
                                }
                                addressToLink = addressList[addrFind](function (addr) {
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
                    }
                  });
                });
              }
            });
          }
        });
      }
    }
  }

  /**
   * Count the number of specified properties in an object
   * @param {array} props   Array of property names
   * @param {object} obj    Object to check
   * @returns {number} Property count
   */
  function countProperties(props, obj) {
    var i = 0;
    props.forEach(function (prop) {
      if (obj[prop]) {
        ++i;
      }
    });
    return i;
  }

  /**
   * Count the number of specified array properties in an object with length > 0
   * @param {array} props   Array of property names
   * @param {object} obj    Object to check
   * @returns {number} Property count
   */
  function countPropertiesLength(props, obj) {
    var i = 0;
    props.forEach(function (prop) {
      if (obj[prop].length) {
        ++i;
      }
    });
    return i;
  }

  /**
   * Link the specified canvasser and address
   * @param {object}   canvasser Canvasser object to link
   * @param {object}   addr      Address object to link
   * @param {function} labeller  Label class generator function
   * @param {boolean}  rtnUndo   Generate undo  object
   * @return {object}   undo object
   */
  function linkCanvasserToAddr (canvasser, addr, labeller, rtnUndo) {
    var undo;
    
    if (typeof labeller === 'boolean') {
      rtnUndo = labeller;
      labeller = undefined;
    }

    if (!canvasser.addresses) {
      canvasser.addresses = [];
    }
    if (findAddrIndex(canvasser, addr) < 0) {
      canvasser.addresses.push(addr._id); // not in list so add
    }

    addr.canvasser = canvasser._id;
    if (!canvasser.badge) {
      canvasser.badge = makeCanvasserBadge(canvasser);
    }
    addr.badge = canvasser.badge;

    if (!canvasser.labelClass) {
      if (labeller) {
        canvasser.labelClass = labeller();
      } else if (dfltLabeller) {
        canvasser.labelClass = dfltLabeller();
      }
    }
    addr.labelClass = canvasser.labelClass;
    
    if (rtnUndo) {
      undo = undoFactory.newUndoStep(
        factory.unlinkAddrFromCanvasser.bind(factory, canvasser, addr)
      );
    }
    
    return undo;
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
   * Generate a canvasser badge
   * @param   {object} canvasser Canvasser object
   * @returns {string} badge
   */
  function makeCanvasserBadge (canvasser) {
    return getFirstLetters(canvasser.person.firstname) +
            getFirstLetters(canvasser.person.lastname);
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
   * @param {object}  canvasser Canvasser object to unlink
   * @param {object}  addr      Address object to unlink
   * @param {boolean} rtnUndo   Generate undo  object
   * @return {object}  undo object
   */
  function unlinkAddrFromCanvasser (canvasser, addr, rtnUndo) {
    var undo,
      idx;
    if (canvasser.addresses) {
      idx = findAddrIndex(canvasser, addr);
      if (idx >= 0) {
        canvasser.addresses.splice(idx, 1);
        
        if (rtnUndo) {
          undo = undoFactory.newUndoStep(
            factory.linkCanvasserToAddr.bind(factory, canvasser, addr)
          );
        }
      }
    }
    delete addr.canvasser;
    delete addr.badge;

    return undo;
  }

  /**
   * Unlink the specified canvasser and all addresses in a list
   * @param {object}   canvasser  Canvasser object to unlink
   * @param {array}   addrArray   List of address objects to unlink
   * @param {boolean} rtnUndo   Generate undo  object
   * @return {array} array of undo objects
   */
  function unlinkAddrListFromCanvasser (canvasser, addrArray, rtnUndo) {
    var undo = [];
    if (canvasser.addresses) {
      canvasser.addresses.forEach(function (addrId) {
        var addr = addrArray.find(function (entry) {
                                    return (entry._id === this);
                                  }, addrId);
        if (addr) {
          delete addr.canvasser;
          delete addr.badge;
          
          if (rtnUndo) {
            undo.push(undoFactory.newUndoStep(
              factory.linkCanvasserToAddr.bind(factory, canvasser, addr)
            ));
          }
        }
      });
    }
    canvasser.addresses = [];

    return (undo.length ? undo : undefined);
  }

  /**
   * Set the labeling function
   * @param {function} labelfunc Function to return label class
   */
  function setLabeller (labelfunc) {
    dfltLabeller = labelfunc;
  }

}

