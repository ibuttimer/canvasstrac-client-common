/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      { field: 'ID', modelName: '_id', dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID },
      { field: 'NAME', modelName: 'name', dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING },
      { field: 'DESCRIPTION', modelName: 'description', dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING },
      { field: 'STARTDATE', modelName: 'startDate', dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.DATE },
      { field: 'ENDDATE', modelName: 'endDate', dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.DATE },
      { field: 'ELECTION', modelName: 'election', dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID },
      { field: 'SURVEY', modelName: 'survey', dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID },
      { field: 'ADDRESSES', modelName: 'addresses', dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY },
      { field: 'CANVASSERS', modelName: 'canvassers', dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY },
      { field: 'RESULTS', modelName: 'results', dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY }
    ],
      ids = {},
      modelProps = [],
      i;

    for (i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index
      modelProps.push({
        id: i,
        modelName: details[i].modelName, 
        dfltValue: details[i].dfltValue,
        type: details[i].type
      });
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('canvass'),
      schema = schemaProvider.getSchema('Canvass', modelProps, ID_TAG),
      CANVASS_NAME_IDX =
        schema.addFieldFromModelProp('name', 'Name', ids.NAME),
      CANVASS_DESCRIPTION_IDX =
        schema.addFieldFromModelProp('description', 'Description', ids.DESCRIPTION),
      CANVASS_STARTDATE_IDX =
        schema.addFieldFromModelProp('start', 'Start Date', ids.STARTDATE),
      CANVASS_ENDDATE_IDX =
        schema.addFieldFromModelProp('end', 'End Date', ids.ENDDATE),
      CANVASS_ELECTION_IDX =
        schema.addFieldFromModelProp('election', 'Election', ids.ELECTION),
      CANVASS_SURVEY_IDX =
        schema.addFieldFromModelProp('survey', 'Survey', ids.SURVEY),

      // generate list of sort options
      sortOptions = schemaProvider.makeSortList(schema, 
                      [CANVASS_NAME_IDX, CANVASS_DESCRIPTION_IDX, CANVASS_STARTDATE_IDX, CANVASS_ENDDATE_IDX, CANVASS_ELECTION_IDX],
                      ID_TAG);

    $provide.constant('CANVASSSCHEMA', {
      IDs: ids,     // id indices, i.e. ADDR1 == 0 etc.
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

canvassFactory.$inject = ['$resource', '$injector', 'baseURL', 'storeFactory', 'resourceFactory', 'miscUtilFactory', 'surveyFactory', 'questionFactory',
  'addressFactory', 'electionFactory', 'userFactory', 'canvassResultFactory', 'SCHEMA_CONST', 'CANVASSSCHEMA', 'SURVEYSCHEMA', 'RESOURCE_CONST', 'CHARTS', 'consoleService'];
function canvassFactory($resource, $injector, baseURL, storeFactory, resourceFactory, miscUtilFactory, surveyFactory, questionFactory,
  addressFactory, electionFactory, userFactory, canvassResultFactory, SCHEMA_CONST, CANVASSSCHEMA, SURVEYSCHEMA, RESOURCE_CONST, CHARTS, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'canvassFactory',
      getCanvasses: getCanvasses,
      getCanvassAllocation: getCanvassAllocation,
      readRspObject: readRspObject,
      readCanvassRsp: readCanvassRsp,
      storeRspObject: storeRspObject,
      readCanvassAllocationRsp: readCanvassAllocationRsp,
      setLabeller: setLabeller,
      linkCanvasserToAddr: linkCanvasserToAddr,
      unlinkAddrFromCanvasser: unlinkAddrFromCanvasser,
      unlinkAddrListFromCanvasser: unlinkAddrListFromCanvasser
    },
    con = consoleService.getLogger(factory.NAME),
    labeller,
    stdFactory = resourceFactory.registerStandardFactory(factory.NAME, {
      storeId: storeId,
      schema: CANVASSSCHEMA.SCHEMA,
      addInterface: factory // add standard factory functions to this factory
    });

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
      args = {};
    }
    if (!args.convert) {
      args.convert = readRspObjectValueConvert;
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
   * Set the labeling function
   * @param {function} labelfunc Function to return label class
   */
  function setLabeller (labelfunc) {
    labeller = labelfunc;
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
   * @param {object}   obj        Object to store
   * @param {object}   args       process arguments object
   *                              @see resourceFactory.storeServerRsp()
   * @return {object}   Canvass object
   */
  function storeRspObject (obj, args) {

    var subObjects, i, stdArgs,
      getModelName = CANVASSSCHEMA.SCHEMA.getModelName,
      addrArgs, addrPath = getModelName(CANVASSSCHEMA.IDs.ADDRESSES),
      resultArgs, resultPath = getModelName(CANVASSSCHEMA.IDs.RESULTS),
      surveyArgs, surveyPath = getModelName(CANVASSSCHEMA.IDs.SURVEY);
    
    // store sub objects first
    if (args.subObj) {
      subObjects = miscUtilFactory.toArray(args.subObj);
      for (i = 0; i < subObjects.length; ++i) {
        stdArgs = resourceFactory.standardiseArgs(subObjects[i]);

        if (stdArgs.path === addrPath) {
          addrArgs = stdArgs;
        } else if (stdArgs.path === resultPath) {
          resultArgs = stdArgs;
        } else if (stdArgs.path === surveyPath) {
          surveyArgs = stdArgs;
        }
        
        resourceFactory.storeSubDoc(obj, stdArgs, args);
      }
      
      // TODO come up with method of generalising the linking of fields
      // cringe!!!
      if (addrArgs && resultArgs) {
        linkAddrListAndResults(resultArgs.objId, addrArgs.objId);
      }
      if (surveyArgs && resultArgs) {
        linkQuestionsAndResults(resultArgs, surveyArgs);
      }
      
    }

    con.debug('Store canvass response: ' + obj);

    // just basic storage args as subdocs have been processed above
    var storeArgs = resourceFactory.copyBasicStorageArgs(args, {
        factory: $injector.get(factory.NAME)
      });

    return resourceFactory.storeServerRsp(obj, storeArgs);
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
              canvasser.labelClass = args.labeller();
            } else if (labeller) {
              canvasser.labelClass = labeller();
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
  function linkAddrListAndResults (resultsId, addrId) {
    if (resultsId && addrId) {
      // set list to a copy of the response list
      var addrArray = miscUtilFactory.toArray(addrId),
        changed = [];

      miscUtilFactory.toArray(resultsId).forEach(function (resId) {
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
                  if (changed.indexOf(addrList) === -1) {
                    changed.push(addrList);
                  }
                }
              }
            });
          });
        }
      });
      changed.forEach(function (list) {
        list.exeChanged();
      });
    }
  }

  /**
    * Link survey questions to canvass results
    * @param {string|Array} resultArgs  id/array of ids of canvass result lists
    * @param {string|Array} surveyArgs  id/array of ids of survey objects
    */
  function linkQuestionsAndResults (resultArgs, surveyArgs) {
    if (resultArgs && surveyArgs) {
      // set list to a copy of the response list
      var i, 
        quesArray = [], // array of question lists
        quesPath = SURVEYSCHEMA.SCHEMA.getModelName(SURVEYSCHEMA.IDs.QUESTIONS),
        resArray = miscUtilFactory.toArray(resultArgs.objId);
      
      // retrieve all local work question lists
      miscUtilFactory.toArray(surveyArgs).forEach(function (survey) {
        if (survey.subObj) {
          miscUtilFactory.toArray(survey.subObj).forEach(function (sub) {
            if (sub.path === quesPath) {
              // questions local work object
              var quesList = sub.factory.getList(sub.objId);
              if (quesList) {
                quesArray.push(quesList);
                
                quesList.forEachInList(function (question) {
                  if (sub.factory.showQuestionOptions(question.type)) {
                    question.labels = question.options;

                    /* chart.js pie, polarArea & doughnut charts may be displayed using
                        single data series (i.e. data = []), whereas chart.js radar, line &
                        bar require multiple data series (i.e. data = [[], []]) */
                    var array = []; // raw data array
                    for (i = 0; i < question.labels.length; ++i) {
                      array[i] = 0;

                      // add properties to the question whose values are the indices into the data array
                      question[makeOptionIndexPropertyName(question.labels[i])] = i;
                    }
                    question.chart = resultArgs.customArgs.getChartType(question.type);
                    switch (question.chart) {
                      case CHARTS.PIE:
                      case CHARTS.POLAR:
                      case CHARTS.DOUGHNUT:
                        question.data = array;
                        // series info not required
                        break;
                      case CHARTS.BAR:
                      case CHARTS.RADAR:
                      case CHARTS.LINE:
                        question.data = [array];
                        question.series = ['0'];  // just one series
                        break;
                    }
                    question.maxValue = 0;
                    
                  } else if (sub.factory.showTextInput(question.type)) {
                    question.data = [];
                  }
                });
              }
            }
          });
        }
      });

      if (quesArray.length) {
        // loop through results linking answers & questions
        var list,
          start,
          ques,
          procObj = function (list) {
            var self = this;
            self.list = list;
            self.answer = undefined;
            self.question = undefined;
            self.seriesIdx = -1;
            
            self.setAnswer = function (answer) {
              self.answer = answer;
            };
            self.setQuestion = function (question) {
              self.question = question;
            };
            self.setSeriesIdx = function (seriesIdx) {
              self.seriesIdx = seriesIdx;
            };
            self.clrSeriesIdx = function () {
              self.seriesIdx = -1;
            };

            self.testQuestionId = function (ques) {
              var result = false;
              if (self.answer.question) {
                result = (self.answer.question._id === ques._id);
              }
              return result;
            };
            self.procData = function (ans) {
              var idx,
                value;

              if (questionFactory.showRankingNumber(self.question.type)) {
                /* if its a ranking question the answer is the value between min & 
                    max rank, not the displayed options */
                idx = parseInt(ans) - self.question.rangeMin;
              } else {
                idx = self.question[makeOptionIndexPropertyName(ans)];
              }
              if (idx >= 0) {
                if (self.seriesIdx >= 0) {
                  value = ++self.question.data[self.seriesIdx][idx];
                } else {
                  value = ++self.question.data[idx];
                }
                if (value > self.question.maxValue) {
                  self.question.maxValue = value;
                }
              }
            };
          };
        resArray.forEach(function (resId) {
          list = canvassResultFactory.getList(resId);
          if (list) {
            var runnerObj = new procObj(list);
            // loop through results 
            list.forEachInList(function (result) {
              if (result.answers && result.answers.length) {

                // loop thru answers looking for questions from list
                result.answers.forEach(function (answer) {
                  runnerObj.setAnswer(answer);

                  quesArray.forEach(function (qlist) {
                    for (start = 0; start >= 0; ++start) {
                      start = qlist.findIndexInList(runnerObj.testQuestionId, start);
                      if (start >= 0) {
                        ques = qlist.getFromList(start);
                        
                        // set data for options from answer
                        if (ques) {
                          if (questionFactory.showQuestionOptions(ques.type)) {
                            runnerObj.setQuestion(ques);
                            if (ques.series) {
                              // only one series for now but ..
                              runnerObj.setSeriesIdx(ques.series.length - 1);
                            } else {
                              runnerObj.clrSeriesIdx();
                            }

                            var splits = answer.answer.split(',');
                            splits.forEach(runnerObj.procData);

                          } else if (questionFactory.showTextInput(ques.type)) {
                            ques.data.push(answer.answer);
                          }
                        }
                      } else {
                        break;
                      }
                    }
                  });
                });
              }
            });
            
            quesArray.forEach(function (qlist) {
              qlist.exeChanged();  // objects in list have changed, trigger listeners 
            });
          }
        });
      }                                                          
    }
  }

  function makeOptionIndexPropertyName (option) {
    return 'optIdx_' + option;
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
    
    if (!canvasser.labelClass) {
      if (labeller) {
        canvasser.labelClass = labeller();
      }
    }
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

}

