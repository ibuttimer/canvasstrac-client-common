/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(function ($provide, schemaProvider, SCHEMA_CONST) {

    var details = [
      SCHEMA_CONST.ID,
      {
        field: 'NAME', modelName: 'name',
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING
      },
      { field: 'DESCRIPTION', modelName: 'description', 
        dfltValue: '', type: SCHEMA_CONST.FIELD_TYPES.STRING },
      {
        field: 'STARTDATE', modelName: 'startDate',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.DATE
      },
      {
        field: 'ENDDATE', modelName: 'endDate',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.DATE
      },
      {
        field: 'ELECTION', modelName: 'election', factory: 'electionFactory',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'SURVEY', modelName: 'survey', factory: 'surveyFactory',
        dfltValue: undefined, type: SCHEMA_CONST.FIELD_TYPES.OBJECTID
      },
      {
        field: 'ADDRESSES', modelName: 'addresses', factory: 'addressFactory',
        dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY
      },
      {
        field: 'CANVASSERS', modelName: 'canvassers', factory: 'userFactory',
        dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY
      },
      {
        field: 'RESULTS', modelName: 'results', factory: 'canvassResultFactory',
        dfltValue: [], type: SCHEMA_CONST.FIELD_TYPES.OBJECTID_ARRAY
      }
    ],
      ids = {},
      modelProps = [],
      i;

    for (i = 0; i < details.length; ++i) {
      ids[details[i].field] = i;          // id is index

      var args = angular.copy(details[i]);
      args.id = i;
      modelProps.push(schemaProvider.getModelPropObject(args));
    }

    var ID_TAG = SCHEMA_CONST.MAKE_ID_TAG('canvass'),
      schema = schemaProvider.getSchema('Canvass', modelProps, ids, ID_TAG),
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
      readRspObject: readRspObject,
      readResponse: readResponse,
      storeRspObject: storeRspObject,
      setLabeller: setLabeller,
      linkCanvasserToAddr: linkCanvasserToAddr,
      unlinkAddrFromCanvasser: unlinkAddrFromCanvasser,
      unlinkAddrListFromCanvasser: unlinkAddrListFromCanvasser,

      processAddressResultsLink: processAddressResultsLink,
      ADDR_RES_LINKADDRESS: 'addrResLinkAddr',  // link address flag for linking addresses & results
      ADDR_RES_LINKRESULT: 'addrResLinkRes',    // link result flag for linking addresses & results

      QUES_RES_LINKQUES: 'quesResLinkQues', // link results flag for linking questions & results
      QUES_RES_LINKRES: 'quesResLinkRes'    // link results flag for linking questions & results

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
    // add resources required by Schema object
    resourceFactory.addResourcesToArgs(args);

    var stdArgs = resourceFactory.standardiseArgs(args),
      object = CANVASSSCHEMA.SCHEMA.read(response, stdArgs);

    processAddressResultsLink(response, stdArgs);

    con.debug('Read canvass rsp object: ' + object);

    return object;
  }

  /**
   * Process the linking of addresses and results
   * @param {object} response   Server response
   * @param {object} args       arguments object
   */
  function processAddressResultsLink (response, args) {
    if (args.linkAddressAndResult) {
      var stdArgs = resourceFactory.standardiseArgs(args),
        addr = resourceFactory.findAllInStandardArgs(stdArgs, function (arg) {
          return arg[factory.ADDR_RES_LINKADDRESS];
        }),
        result = resourceFactory.findAllInStandardArgs(stdArgs, function (arg) {
          return arg[factory.ADDR_RES_LINKRESULT];
        });
        
      linkAddressAndResults(addr, result, response);
    }
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
  function readResponse (response, args) {

    var object = readRspObject(response, args);
    return storeRspObject(object, args);
  }

  /**
   * Store a canvass response from the server
   * @param {object}   obj        Object to store
   * @param {object}   args       process arguments object
   *                              @see resourceFactory.storeServerRsp()
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

    con.debug('Store canvass response: ' + obj);

    // just basic storage args as subdocs have been processed above
    var storeArgs = resourceFactory.copyBasicStorageArgs(args, {
        factory: $injector.get(factory.NAME)
      });

    return resourceFactory.storeServerRsp(obj, storeArgs);
  }

  /**
    * Link addresses to canvass results
    * @param {object|Array} addrArgs    arg object/array of arg objects of addresses
    * @param {object|Array} resultsId   arg object/array of arg objects of results
    */
  function linkAddressAndResults (addrArgs, resultArgs, response) {
    if (addrArgs && resultArgs) {
      var addresses = [],
        results = [];

      miscUtilFactory.toArray(addrArgs).forEach(function (addrArg) {
        addresses.push(resourceFactory.getObjectInfo(response, addrArg).object);
      });
      miscUtilFactory.toArray(resultArgs).forEach(function (resArg) {
        results.push(resourceFactory.getObjectInfo(response, resArg).object);
      });

      if (addresses.length && results.length) {
        results.forEach(function (result) {
          result.forEach(function (resObj) {
            addresses.forEach(function (address) {
              var addr = address.find(function (entry) {
                return (entry._id === resObj.address._id);
              });
              if (addr) {
                // link address and canvass result
                addr.canvassResult = resObj._id;
              }
            })
          });
        });
      }
    }
  }

  /**
    * Link addresses to canvass results
    * @param {string|Array} resultsId   id/array of ids of canvass result lists
    * @param {string|Array} addrId      id/array of ids of address lists
    */
  function linkAddrListAndResults(resultsId, addrId) {
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
                    if (resultArgs.customArgs) {
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
                    } else {
                      question.data = array;
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

