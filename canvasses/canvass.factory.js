/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider) {

    var details = [
      { field: 'ID', modelName: '_id', dfltValue: undefined },
      { field: 'NAME', modelName: 'name', dfltValue: '' },
      { field: 'DESCRIPTION', modelName: 'description', dfltValue: '' },
      { field: 'STARTDATE', modelName: 'startDate', dfltValue: undefined },
      { field: 'ENDDATE', modelName: 'endDate', dfltValue: undefined },
      { field: 'ELECTION', modelName: 'election', dfltValue: undefined },
      { field: 'SURVEY', modelName: 'survey', dfltValue: undefined },
      { field: 'ADDRESSES', modelName: 'addresses', dfltValue: [] },
      { field: 'CANVASSERS', modelName: 'canvassers', dfltValue: [] },
      { field: 'RESULTS', modelName: 'results', dfltValue: [] }
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

    var ID_TAG = 'canvass.',
      schema = schemaProvider.getSchema('Canvass', modelProps),
      CANVASS_NAME_IDX =
        schema.addField('name', 'Name', names[ids.NAME], ID_TAG),
      CANVASS_DESCRIPTION_IDX =
        schema.addField('description', 'Description', names[ids.DESCRIPTION], ID_TAG),
      CANVASS_STARTDATE_IDX =
        schema.addField('start', 'Start Date', names[ids.STARTDATE], ID_TAG),
      CANVASS_ENDDATE_IDX =
        schema.addField('end', 'End Date', names[ids.ENDDATE], ID_TAG),
      CANVASS_ELECTION_IDX =
        schema.addField('election', 'Election', names[ids.ELECTION], ID_TAG),
      CANVASS_SURVEY_IDX =
        schema.addField('survey', 'Survey', names[ids.SURVEY], ID_TAG),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                      [CANVASS_NAME_IDX, CANVASS_DESCRIPTION_IDX, CANVASS_STARTDATE_IDX, CANVASS_ENDDATE_IDX, CANVASS_ELECTION_IDX],
                      ID_TAG);

    $provide.constant('CANVASSSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
      NAMES: names, // model names
      MODELPROPS: modelProps,

      SCHEMA: schema,
      // row indices
      CANVASS_NAME_IDX: CANVASS_NAME_IDX,
      CANVASS_DESCRIPTION_IDX: CANVASS_DESCRIPTION_IDX,
      CANVASS_STARTDATE_IDX: CANVASS_STARTDATE_IDX,
      CANVASS_ENDDATE_IDX: CANVASS_ENDDATE_IDX,
      CANVASS_ELECTION_IDX: CANVASS_ELECTION_IDX,
      CANVASS_SURVEY_IDX: CANVASS_SURVEY_IDX,

      SORT_OPTIONS: sortOptions,
      ID_TAG: ID_TAG
    });
  })

  .factory('canvassFactory', canvassFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

canvassFactory.$inject = ['$resource', '$injector', 'baseURL', 'storeFactory', 'resourceFactory', 'miscUtilFactory', 'surveyFactory',
  'addressFactory', 'electionFactory', 'userFactory', 'canvassResultFactory', 'CANVASSSCHEMA', 'consoleService'];
function canvassFactory($resource, $injector, baseURL, storeFactory, resourceFactory, miscUtilFactory, surveyFactory,
  addressFactory, electionFactory, userFactory, canvassResultFactory, CANVASSSCHEMA, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      getCanvasses: getCanvasses,
      getCanvassAllocation: getCanvassAllocation,
      readRspObject: readRspObject,
      readCanvassRsp: readCanvassRsp,
      storeRspObject: storeRspObject,
      readCanvassAllocationRsp: readCanvassAllocationRsp,
      newObj: newObj,
      duplicateObj: duplicateObj,
      delObj: delObj,
      setObj: setObj,
      getObj: getObj,
      initObj: initObj,
      linkCanvasserToAddr: linkCanvasserToAddr,
      unlinkAddrFromCanvasser: unlinkAddrFromCanvasser,
      unlinkAddrListFromCanvasser: unlinkAddrListFromCanvasser
    },
    con = consoleService.getLogger('canvassFactory');
  
  return factory;

  /* function implementation
    -------------------------- */

  function getCanvasses () {
    return resourceFactory.getResources('canvasses');
  }
  
  function getCanvassAllocation () {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };

      add custom update & multiple save methods
    */
    return $resource(baseURL + 'canvassassignment/:id', {id:'@id'},
                      {'update': {method: 'PUT'},
                       'saveMany': {method: 'POST', isArray: true}
                      });
  }
  
  
  /**
   * Read a server response canvass object
   * @param {object} response   Server response
   * @param {object} args       arguments object
   *                            @see Schema.readProperty() for details
   * @returns {object}  Canvass object
   */
  function readRspObject (response, args) {
    if (!args) {
      args = {
        convert: readRspObjectValueConvert
      };
    }
    var canvass = CANVASSSCHEMA.SCHEMA.readProperty(response, args);

    con.debug('Read canvass rsp object: ' + canvass);

    return canvass;
  }

  /**
   * Convert values read from a server canvass response
   * @param {number}    schema id 
   * @param {object}    read value
   * @returns {object}  Converted value
   */
  function readRspObjectValueConvert(id, value) {
    switch (id) {
      case CANVASSSCHEMA.IDs.STARTDATE:
      case CANVASSSCHEMA.IDs.ENDDATE:
        value = new Date(value);
        break;
      case CANVASSSCHEMA.IDs.ELECTION:
        value = electionFactory.readRspObject(value);
        break;
      case CANVASSSCHEMA.IDs.SURVEY:
        value = surveyFactory.readRspObject(value);
        break;
      default:
        // other fields require no conversion
        break;
    }
    return value;
  }

  /**
   * Read a canvass response from the server
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object 
   *    @see storeRspObject() for details
   * @return {object}   Canvass ResourceList object
   */
  function readCanvassRsp (response, args) {

    var canvass = readRspObject(response);
    return storeRspObject(canvass, args);
  }

  /**
   * Store a canvass response from the server
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object as per resourceFactory.storeServerRsp()
   *                              without 'factory' argument, i.e.
   *    {string|Array}  objId       id/array of ids of canvass & survey objects to save response data to
   *    {number}        flags       storefactory flags
   *    {function}      next        function to call after processing
   *                              @see resourceFactory.storeServerRsp()
   *                              With the addition of the following:
   *    {string|Array}  addrId      id/array of ids of list object(s) to save address data to
   *    {string|Array}  userId      id/array of ids of list object to save canvasser data to
   *    {string|Array}  resultsId   id/array of ids of list object to save canvass results to
   *    {object}        surveyArgs  arguments to process embedded survey sub doc, 
   *                                @see surveyFactory.readSurveyRsp() for details
   *    {object}        electionArgs arguments to process embedded election sub doc, 
   *                                @see electionFactory.readElectionRsp() for details
   * @return {object}   Canvass ResourceList object
   */
  function storeRspObject (canvass, args) {

    var flags = (args.flags || storeFactory.NOFLAG),
      array;

    if (canvass.election && args.electionArgs) {
      var election = electionFactory.storeRspObject(canvass.election, args.electionArgs);
      canvass.election = election._id;
    }
    if (canvass.survey && args.surveyArgs) {
      var survey = surveyFactory.storeRspObject(canvass.survey, args.surveyArgs);
      canvass.survey = survey._id;
    }
    // addresses/canvassers/results are all populated
    if (args.addrId) {
      if (!canvass.addresses) {
        canvass.addresses = [];
      }
      processPopulatedSubDoc(canvass.addresses, args.addrId, addressFactory, flags);
    }
    if (args.userId) {
      if (!canvass.canvassers) {
        canvass.canvassers = [];
      }
      processPopulatedSubDoc(canvass.canvassers, args.userId, userFactory, flags);
    }
    if (args.resultsId) {
      if (!canvass.results) {
        canvass.results = [];
      }
      processPopulatedSubDoc(canvass.results, args.resultsId, canvassResultFactory, flags);

      linkAddrListAndResults(args.resultsId, args.addrId);
    }

    con.debug('Store canvass response: ' + canvass);

    var factory = this,
      storeArgs;
    if (!factory) {
      // call original was inside a forEach so there is no this context
      factory = $injector.get('canvassFactory');
    }

    storeArgs = miscUtilFactory.copyProperties(args, {
        factory: factory
      }, ['objId', 'flags', 'storage', 'next']);

    return resourceFactory.storeServerRsp(canvass, storeArgs);
  }

  /**
   * Copy an array between objects.
   * @param {object} from   Object to copy from
   * @param {object} to     Object to copy to
   * @param {string} name   Name fo array property
   */
  function readArray (from, to, name) {
    if (from[name]) {
      to[name] = from[name];
    } else {
      to[name] = [];
    }
    return to[name];
  }
  
  /**
   * Process a populated sub document array, by copying the data to a new factory object and 
   * transforming the original to ObjectIds.
   * @param {Array}         array   Populated array received from host
   * @param {Array|string}  ids     Factory id/array of ids to copy data to
   * @param {object}        factory Factory to use to generate new factory objects
   * @param {number}        flags   storefactory flags
   */
  function processPopulatedSubDoc (array, ids, factory, flags) {
    if (ids) {
      // jic no native implementation is available
      miscUtilFactory.arrayPolyfill();

      // set list to a copy of the response list
      var idArray = miscUtilFactory.toArray(ids),
        arrayCopy = angular.copy(array);

      idArray.forEach(function (id) {
        var list = factory.getList(id);
        if (!list && storeFactory.doCreateAny(flags)) {
          list = factory.newList(id);
        }
        if (list) {
          // set list to copy
          list.setList(arrayCopy, flags);
        }
      });

      // change objects in response to what host expects i.e. ObjectIds
      for (var i = 0; i < array.length; ++i) {
        array[i] = array[i]._id;
      }
    }
  }

  /**
   * Read a canvass allocation response from the server
   * @param {object}   response   Server response
   * @param {object}   args       process arguments object with following properties
   *    {string} addrId       id of list object to save address data to
   *    {string} userId       id of list object to save canvasser data to
   *    {number} flags        storefactory flags
   *    {function} labeller   function to return a class for a label
   *    {object} canvassArgs  arguments to process embedded canvass sub doc, 
   *                          @see storeRspObject() for details
   *    {function} next       function to call after processing
   * @return {object}   Canvass object
   */
  function readCanvassAllocationRsp (response, args) {

    var flags = (args.flags || storeFactory.NOFLAG),
      usrList,
      addrList,
      labelIdx = 0,
      rspArray = miscUtilFactory.toArray(response);
    
    // TODO processing as array but what about multiple allocation for different canvasses?

    // jic no native implementation is available
    miscUtilFactory.arrayPolyfill();

    rspArray.forEach(function (allocation) {
      var canvassResList,
        testCanvasser = function (entry) {
          return (entry._id === allocation.canvasser._id);
        };

      // process canvass sub doc if required
      if (args.canvassArgs && allocation.canvass) {
        canvassResList = readCanvassRsp(allocation.canvass, args.canvassArgs);
      }

      if (args.userId) {
        usrList = userFactory.getList(args.userId);
        if (storeFactory.doCreateAny(flags) && allocation.canvasser) {
          // look for user in existing list from canvass subdoc if processed
          var existId;
          if (args.canvassArgs) {
            existId = args.canvassArgs.userId;
          }

          usrList = findInExistingList(
            existId, args.userId, userFactory, testCanvasser, flags, allocation.canvasser,
            function (resp) {
              return userFactory.readUserRsp(resp, {
                objId: args.userId,
                flags: flags
              });
            });
        }
        if (args.addrId) {
          addrList = addressFactory.getList(args.addrId);
        }

        if (usrList && addrList) {

          // find canvasser
          var canvasser = usrList.findInList(testCanvasser);
          if (canvasser) {

            canvasser.allocId = allocation._id;

            if (args.labeller) {
              canvasser.labelClass = args.labeller(labelIdx++);
            }

            if (!canvasser.addresses) {
              canvasser.addresses = []; // array of ids
            }

            if (allocation.addresses) {
              // link canvasser to each address in allocation
              allocation.addresses.forEach(function (addr) {
                // find address in address list & set link
                var testAddress = function (entry) {
                  return (entry._id === addr._id);
                },
                  addrObj = addrList.findInList(testAddress);

                var existId;
                if (args.canvassArgs) {
                  existId = args.canvassArgs.addrId;
                }

                addrList = findInExistingList(
                  existId, args.addrId, addressFactory, testAddress, flags, addr,
                  function (resp) {
                    return userFactory.readUserRsp(resp, {
                      objId: args.userId,
                      flags: flags
                    });
                  });
                if (addrObj) {
                  linkCanvasserToAddr(canvasser, addrObj);
                }
              });
            }
          }
          if (storeFactory.doApplyFilter(flags)) {
            usrList.applyFilter();
            addrList.applyFilter();
          }
        }
      }
    });

    if (args.next) {
      args.next();
    }
  }

  /**
    * Find an object in an existing list and add the same object to a new list if possible
    * @param {string|Array}   existId     id/array of ids of existing list
    * @param {string}         newId       id of new list to add object to
    * @param {function}       testFxn     function to test objects
    * @param {function}       factory     factory to process lists
    * @param {object}         resp        object received from server
    * @param {function}       processFxn  function to process adding new object if no existing found
    */
  function findInExistingList (existId, newId, factory, testFxn, flags, resp, processFxn) {
    var newList = factory.getList(newId);  // get new list

    if (existId) {
      var idArray = miscUtilFactory.toArray(existId),
        existList = factory.getList(idArray[0]);  // get existing list

      if (existList) {
        var existing = existList.findInList(testFxn);
        if (existing) {
          // copy info from resp into existing
          miscUtilFactory.copyProperties(resp, existing);

          // add (i.e. same object) to the new list
          if (!newList || (newList.count === 0)) {
            // create or set single entry list
            newList = factory.setList(newId, [existing], flags);
          } else if (!newList.findInList(testFxn)) {
            // add to existing list
            newList.addToList(existing);
          }
        }
      }
    }
    if (!newList) {
      // process response
      newList = processFxn(resp);
    } else if (!newList.findInList(testFxn)) {
      // add to existing list
      newList.addToList(resp);
    }
    return newList;
  }


  /**
    * Link addresses to canvass results
    * @param {string|Array} resultsId   id/array of ids of canvass result lists
    * @param {string|Array} addrId      id/array of ids of address lists
    */
  function linkAddrListAndResults(resultsId, addrId) {
    if (addrId) {
      // set list to a copy of the response list
      var addrArray = miscUtilFactory.toArray(addrId),
        resArray = miscUtilFactory.toArray(resultsId);

      resArray.forEach(function (resId) {
        var list = canvassResultFactory.getList(resId);
        if (list) {
          list.forEachInList(function (result) {
            addrArray.forEach(function (addrId) {
              var addrList = addressFactory.getList(addrId);
              if (addrList) {
                var addr = addrList.findInList(function (entry) {
                  return (entry._id === result.address._id);
                });
                if (addr) {
                  // link address and canvass result
                  addr.canvassResult = result._id;
                  addrList.exeChanged();
                }
              }
            });
          });
        }
      });
    }
  }


  /**
   * Link the specified canvasser and address
   * @param {object}   canvasser  Canvasser object to link
   * @param {object}   addr       Address object to link
   */
  function linkCanvasserToAddr (canvasser, addr) {
    if (!canvasser.addresses) {
      canvasser.addresses = [];
    }
    if (canvasser.addresses.findIndex(elementTest, addr) < 0) {
      canvasser.addresses.push(addr._id);
    }

    addr.canvasser = canvasser._id;
    var badge = '';
    if (canvasser.person.firstname) {
      badge += getFirstLetters(canvasser.person.firstname);
    }
    if (canvasser.person.lastname) {
      badge += getFirstLetters(canvasser.person.lastname);
    }
    addr.badge = badge;
    
    addr.labelClass = canvasser.labelClass;
  }
  
  /**
   * Get the first letters of all words in a string
   * @param {string}   str  String to get leading letter from
   * @return {string}  String of leading letters
   */
  function getFirstLetters (str) {
    var splits = str.split(' '),
      letters = '';
    splits.forEach(function (split) {
      letters += split.charAt(0);
    });
    return letters;
  }
  

  function elementIdTest (element) {
    return (element._id === this);
  }

  function elementTest (element) {
    return (element === this._id);
  }

  /**
   * Unlink the specified canvasser and address
   * @param {object}   canvasser  Canvasser object to unlink
   * @param {object}   addr       Address object to unlink
   */
  function unlinkAddrFromCanvasser (canvasser, addr) {
    if (canvasser.addresses) {
      var idx = canvasser.addresses.findIndex(elementTest, addr);
      if (idx >= 0) {
        canvasser.addresses.splice(idx, 1);
      }
    }
    delete addr.canvasser;
    delete addr.badge;
  }
  
  /**
   * Unlink the specified canvasser and all addresses in a list
   * @param {object}   canvasser  Canvasser object to unlink
   * @param {object}   addrList   List of address objects to unlink
   */
  function unlinkAddrListFromCanvasser (canvasser, addrList) {
    if (canvasser.addresses) {
      canvasser.addresses.forEach(function (addrId) {
        var addr = addrList.find(elementIdTest, addrId);
        if (addr) {
          delete addr.canvasser;
          delete addr.badge;
        }
      });
    }
    canvasser.addresses = [];
  }
  
  /**
   * Create storeFactory id
   * @param {string}   id   Factory id to generate storeFactory id from
   */
  function storeId (id) {
    return CANVASSSCHEMA.ID_TAG + id;
  }
  
  /**
   * Create a new canvass object
   * @param {string} id     Factory id of new object
   * @param {number} flags  storefactory flags
   */
  function newObj (id, flags) {
    return storeFactory.newObj(storeId(id), CANVASSSCHEMA.SCHEMA.getObject(), flags);
  }
  
  /**
   * Create a new canvass object by duplicating an existing object
   * @param {string} id     Factory id of new object
   * @param {string} srcId  Factory id of object to duplicate
   * @param {number} flags  storefactory flags
   */
  function duplicateObj (id, srcId, flags) {
    return storeFactory.duplicateObj(storeId(id), storeId(srcId), flags);
  }
  
  /**
   * Delete a canvass object
   * @param {string} id     Factory id of object to delete
   * @param {number} flags  storefactory flags
   */
  function delObj (id, flags) {
    return storeFactory.delObj(storeId(id), flags);
  }

  /**
   * Set a canvass object
   * @param {string} id     Factory id of object to set
   * @param {object} id     data to set
   * @param {number} flags  storefactory flags
   */
  function setObj (id, data, flags) {
    return storeFactory.setObj(storeId(id), data, flags, CANVASSSCHEMA.SCHEMA.getObject());
  }
  
  /**
   * Get a canvass object
   * @param {string} id     Factory id of object to get
   * @param {number} flags  storefactory flags
   */
  function getObj (id, flags) {
    return storeFactory.getObj(storeId(id), flags);
  }
  
  /**
   * Initialise a canvass object
   * @param {string} id     Factory id of object to init
   */
  function initObj (id) {
    setObj(id, CANVASSSCHEMA.SCHEMA.getObject());
  }
  
}

