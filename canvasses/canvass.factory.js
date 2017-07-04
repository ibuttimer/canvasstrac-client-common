/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', 'ELECTIONSCHEMA', 'SURVEYSCHEMA', 'ADDRSCHEMA', 'USERSCHEMA', function ($provide, schemaProvider, SCHEMA_CONST, ELECTIONSCHEMA, SURVEYSCHEMA, ADDRSCHEMA, USERSCHEMA) {

    var details = [
      SCHEMA_CONST.ID,
      schemaProvider.getStringModelPropArgs('name', { field: 'NAME' }),
      schemaProvider.getStringModelPropArgs('description', { field: 'DESCRIPTION' }),
      schemaProvider.getDateModelPropArgs('startDate', undefined, { field: 'STARTDATE' }),
      schemaProvider.getDateModelPropArgs('endDate', undefined, { field: 'ENDDATE' }),
      schemaProvider.getObjectIdModelPropArgs('election', 'electionFactory', 'election', ELECTIONSCHEMA, ELECTIONSCHEMA.IDs.ID, { field: 'ELECTION' }),
      schemaProvider.getObjectIdModelPropArgs('survey', 'surveyFactory', 'survey', SURVEYSCHEMA, SURVEYSCHEMA.IDs.ID, { field: 'SURVEY' }),
      schemaProvider.getObjectIdArrayModelPropArgs('addresses', 'addressFactory', 'address',  ADDRSCHEMA, ADDRSCHEMA.IDs.ID, { field: 'ADDRESSES' }),
      schemaProvider.getObjectIdArrayModelPropArgs('canvassers', 'userFactory', 'user', USERSCHEMA, USERSCHEMA.IDs.ID, { field: 'CANVASSERS' }),
      schemaProvider.getObjectIdArrayModelPropArgs('results', 'canvassResultFactory', 'result', undefined, undefined, { field: 'RESULTS' })
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
  }])

  .factory('canvassFactory', canvassFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

canvassFactory.$inject = ['$injector', 'baseURL', 'storeFactory', 'resourceFactory', 'filterFactory', 'miscUtilFactory', 'surveyFactory', 'questionFactory',
  'addressFactory', 'electionFactory', 'userFactory', 'canvassResultFactory', 'SCHEMA_CONST', 'CANVASSSCHEMA', 'SURVEYSCHEMA', 'RESOURCE_CONST', 'CHARTS', 'consoleService'];
function canvassFactory($injector, baseURL, storeFactory, resourceFactory, filterFactory, miscUtilFactory, surveyFactory, questionFactory,
  addressFactory, electionFactory, userFactory, canvassResultFactory, SCHEMA_CONST, CANVASSSCHEMA, SURVEYSCHEMA, RESOURCE_CONST, CHARTS, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'canvassFactory',
    readRspObject: readRspObject,
    readResponse: readResponse,

    getSortFunction: getSortFunction,

    storeRspObject: storeRspObject,

    processAddressResultsLink: processAddressResultsLink,
    ADDR_RES_LINKADDRESS: 'addrResLinkAddr',  // link address flag for linking addresses & results
    ADDR_RES_LINKRESULT: 'addrResLinkRes',    // link result flag for linking addresses & results

    QUES_RES_LINKQUES: 'quesResLinkQues', // link results flag for linking questions & results
    QUES_RES_LINKRES: 'quesResLinkRes'    // link results flag for linking questions & results

  },
  con;  // console logger

  if (consoleService.isEnabled(factory.NAME)) {
    con = consoleService.getLogger(factory.NAME);
  }

  resourceFactory.registerStandardFactory(factory.NAME, {
    storeId: CANVASSSCHEMA.ID_TAG,
    schema: CANVASSSCHEMA.SCHEMA,
    sortOptions: CANVASSSCHEMA.SORT_OPTIONS,
    addInterface: factory, // add standard factory functions to this factory
    resources: {
      canvass: resourceFactory.getResourceConfigWithId('canvasses')
    }
  });

  return factory;

  /* function implementation
    -------------------------- */

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
    processQuestionResultsLink(response, stdArgs);

    if (con) {
      con.debug('Read canvass rsp object: ' + object);
    }

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
   * Process the linking of questions and results
   * @param {object} response   Server response
   * @param {object} args       arguments object
   */
  function processQuestionResultsLink (response, args) {
    if (args.linkQuestionAndResult) {
      var stdArgs = resourceFactory.standardiseArgs(args),
        ques = resourceFactory.findAllInStandardArgs(stdArgs, function (arg) {
          return arg[factory.QUES_RES_LINKQUES];
        }),
        result = resourceFactory.findAllInStandardArgs(stdArgs, function (arg) {
          return arg[factory.QUES_RES_LINKRES];
        });

      linkQuestionAndResults(ques, result, response);
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

    // async version
    //factory.storeRspObjectTest(factory.NAME, resourceFactory, obj, args, con, 'canvass');

    var subObjects, i, stdArgs;

    // store sub objects first
    if (args.subObj) {
      subObjects = miscUtilFactory.toArray(args.subObj);

      if (con) {
        con.debug('Store canvass subobjs: ' + subObjects.length);
      }

      for (i = 0; i < subObjects.length; ++i) {
        stdArgs = resourceFactory.standardiseArgs(subObjects[i]);

        resourceFactory.storeSubDoc(obj, stdArgs, args);
        if (con) {
          con.debug('Stored canvass subobj[' + i + ']: ' + subObjects[i].objId);
        }
      }
    }

    if (con) {
      con.debug('Store canvass response: ' + obj);
    }

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
    * @param {object} response          object to read data from
    */
  function linkAddressAndResults (addrArgs, resultArgs, response) {
    if (addrArgs && resultArgs) {
      var addresses,
        results,
        obj,
        map;

      miscUtilFactory.toArray(response).forEach(function (rsp) {
        addresses = []; // array of address maps
        results = [];   // array of arrays of results

        miscUtilFactory.toArray(addrArgs).forEach(function (addrArg) {
          obj = resourceFactory.getObjectInfo(rsp, addrArg).object;
          if (obj) {
            map = miscUtilFactory.arrayToMap(obj, '_id');
            addresses.push(map);
          }
        });
        miscUtilFactory.toArray(resultArgs).forEach(function (resArg) {
          obj = resourceFactory.getObjectInfo(rsp, resArg).object;
          if (obj) {
            results.push(obj);
          }
        });

        if (con) {
          con.debug('linkAddressAndResults: addresses ' + addresses.length + ' results ' + results.length);
        }

        if (addresses.length && results.length) {
          results.forEach(function (result) {
            result.forEach(function (resObj) {
              addresses.forEach(function (address) {
                if (address[resObj.address._id]) {  // result address id found in address map
                  // link address and canvass result
                  address.canvassResult = resObj._id;
                }
              });
            });
          });
        }
      });
    }
  }

  /**
    * Link questions to canvass results
    * @param {object|Array} quesArgs    arg object/array of arg objects of questions
    * @param {object|Array} resultsId   arg object/array of arg objects of results
    * @param {object} response          object to read data from
    */
  function linkQuestionAndResults (quesArgs, resultArgs, response) {
    if (quesArgs && resultArgs) {
      var quesLists = [],
        resLists = [],
        i, resData, obj;

      miscUtilFactory.toArray(quesArgs).forEach(function (quesArg) {
        obj = resourceFactory.getObjectInfo(response, quesArg).object;
        if (obj) {
          quesLists.push({
            list: obj,                // questions array
            factory: quesArg.factory  // factory to handle them
          });
        }
      });
      miscUtilFactory.toArray(resultArgs).forEach(function (resArg) {
        obj = resourceFactory.getObjectInfo(response, resArg).object;
        if (obj) {
          resLists.push({
            list: obj,  // results array
            getChartType: (resArg.customArgs ? resArg.customArgs.getChartType : undefined)
          });
        }
      });

      if (quesLists.length && resLists.length) {
        // loop questions initialising results related data
        quesLists.forEach(function (questionList) {
          questionList.list.forEach(function (question) {
            resData = {
              // labels, chart, data, series, maxValue, data indices properties
            }; // put all results related stuff in a single object
            if (questionList.factory.showQuestionOptions(question.type)) {
              resData.labels = question.options;

              /* chart.js pie, polarArea & doughnut charts may be displayed using
                  single data series (i.e. data = []), whereas chart.js radar, line &
                  bar require multiple data series (i.e. data = [[], []]) */
              var array = []; // raw data array
              for (i = 0; i < resData.labels.length; ++i) {
                array[i] = 0;

                // add properties to the question whose values are the indices into the data array
                resData[makeOptionIndexPropertyName(resData.labels[i])] = i;
              }
              
              resLists.forEach(function (res) {
                if (res.getChartType) {
                  resData.chart = res.getChartType(question.type);
                  switch (resData.chart) {
                    case CHARTS.PIE:
                    case CHARTS.POLAR:
                    case CHARTS.DOUGHNUT:
                      resData.data = array;
                      // series info not required
                      break;
                    case CHARTS.BAR:
                    case CHARTS.RADAR:
                    case CHARTS.LINE:
                      resData.data = [array];
                      resData.series = ['0'];  // just one series
                      break;
                  }
                }
              });
              resData.maxValue = 0;

            } else if (questionList.factory.showTextInput(question.type)) {
              resData.data = [];
            }
            question.resData = resData;
          });
        });
        
        // loop through results linking answers & questions
        var ansProcessor = new AnswerProcessor();
        resLists.forEach(function (res) {
          if (res.list) {
            // loop through results 
            res.list.forEach(function (result) {
              if (result.answers && result.answers.length) {

                // loop thru answers looking for questions from list
                result.answers.forEach(function (answer) {
                  ansProcessor.setAnswer(answer);

                  quesLists.forEach(function (questionList) {
                    questionList.list.forEach(function (question) {
                      if (ansProcessor.testQuestionId(question)) {
                        // set data for options from answer
                        resData = question.resData;
                        if (questionFactory.showQuestionOptions(question.type)) {
                          ansProcessor.setQuestion(question);

                          if (resData.series) {
                            // only one series for now but ..
                            ansProcessor.setSeriesIdx(resData.series.length - 1);
                          } else {
                            ansProcessor.clrSeriesIdx();
                          }

                          var splits = answer.answer.split(',');
                          splits.forEach(ansProcessor.procData, ansProcessor);

                        } else if (questionFactory.showTextInput(question.type)) {
                          resData.data.push(answer.answer);
                        }
                      }
                    });
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
   * Processor for a aurvey answer's data
   */
  function AnswerProcessor () {
    this.answer = undefined;
    this.question = undefined;
    this.seriesIdx = -1;

    this.setAnswer = function (answer) {
      this.answer = answer;
    };
    this.setQuestion = function (question) {
      this.question = question;
    };
    this.setSeriesIdx = function (seriesIdx) {
      this.seriesIdx = seriesIdx;
    };
    this.clrSeriesIdx = function () {
      this.seriesIdx = -1;
    };

    this.testQuestionId = function (ques) {
      var result = false;
      if (this.answer.question) {
        result = (this.answer.question._id === ques._id);
      }
      return result;
    };
    
    this.procData = function (ans) {
      var idx,
        value;

      if (questionFactory.showRankingNumber(this.question.type)) {
        /* if its a ranking question the answer is the value between min & 
            max rank, not the displayed options */
        idx = parseInt(ans) - this.question.rangeMin;
      } else {
        idx = this.question.resData[makeOptionIndexPropertyName(ans)];
      }
      if (idx >= 0) {
        if (this.seriesIdx >= 0) {
          value = ++this.question.resData.data[this.seriesIdx][idx];
        } else {
          value = ++this.question.resData.data[idx];
        }
        if (value > this.question.resData.maxValue) {
          this.question.resData.maxValue = value;
        }
      }
    };
  }

  /**
   * Make an option index property name
   * @param   {string} option Option name
   * @returns {string} property name
   */
  function makeOptionIndexPropertyName (option) {
    return 'optIdx_' + option;
  }
  
  function getSortFunction (options, sortBy) {
    var sortFxn = resourceFactory.getSortFunction(options, sortBy);
    if (typeof sortFxn === 'object') {
      var sortItem = SCHEMA_CONST.DECODE_SORT_ITEM_ID(sortFxn.id);
      if (sortItem.idTag === CANVASSSCHEMA.ID_TAG) {
        switch (sortItem.index) {
          //case CANVASSSCHEMA.CANVASS_NAME_IDX:
          //  sortFxn = compareAddress;
          //  break;
          default:
            sortFxn = undefined;
            break;
        }
      }
    }
    return sortFxn;
  }

}

