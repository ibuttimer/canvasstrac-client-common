/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .config(['$provide', 'schemaProvider', 'SCHEMA_CONST', function ($provide, schemaProvider, SCHEMA_CONST) {

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
  }])

  .filter('filterCanvass', ['miscUtilFactory', 'SCHEMA_CONST', function (miscUtilFactory, SCHEMA_CONST) {

    function filterCanvassFilter(input, schema, filterBy) {

      // canvass specific filter function
      var out = [];

      if (!miscUtilFactory.isEmpty(filterBy)) {
        var testCnt = 0;  // num of fields to test as speced by filter

        schema.forEachField(function(idx, fieldProp) {
          if (filterBy[fieldProp[SCHEMA_CONST.DIALOG_PROP]]) {  // filter uses dialog properties
            ++testCnt;
          }
        });
        
      // TODO canvass specific filter function
        out = input;

      } else {
        out = input;
      }
      return out;
    }

    return filterCanvassFilter;
  }])

  .factory('canvassFactory', canvassFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

canvassFactory.$inject = ['$resource', '$injector', 'baseURL', 'storeFactory', 'resourceFactory', 'filterFactory', 'miscUtilFactory', 'surveyFactory', 'questionFactory',
  'addressFactory', 'electionFactory', 'userFactory', 'canvassResultFactory', 'SCHEMA_CONST', 'CANVASSSCHEMA', 'SURVEYSCHEMA', 'RESOURCE_CONST', 'CHARTS', 'consoleService'];
function canvassFactory($resource, $injector, baseURL, storeFactory, resourceFactory, filterFactory, miscUtilFactory, surveyFactory, questionFactory,
  addressFactory, electionFactory, userFactory, canvassResultFactory, SCHEMA_CONST, CANVASSSCHEMA, SURVEYSCHEMA, RESOURCE_CONST, CHARTS, consoleService) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
      NAME: 'canvassFactory',
      getCanvasses: getCanvasses,
      readRspObject: readRspObject,
      readResponse: readResponse,

      setFilter: setFilter,
      newFilter: newFilter,
      getFilteredList: getFilteredList,
      forEachSchemaField: forEachCanvassSchemaField,
      getSortOptions: getSortOptions,
      getSortFunction: getSortFunction,
      getFilteredResource: getFilteredResource,

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
    labeller;

  resourceFactory.registerStandardFactory(factory.NAME, {
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
    processQuestionResultsLink(response, stdArgs);

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
    * @param {object} response          object to read data from
    */
  function linkAddressAndResults (addrArgs, resultArgs, response) {
    if (addrArgs && resultArgs) {
      var addresses,
        results;

      miscUtilFactory.toArray(response).forEach(function (rsp) {
        addresses = [];
        results = [];

        miscUtilFactory.toArray(addrArgs).forEach(function (addrArg) {
          addresses.push(resourceFactory.getObjectInfo(rsp, addrArg).object);
        });
        miscUtilFactory.toArray(resultArgs).forEach(function (resArg) {
          results.push(resourceFactory.getObjectInfo(rsp, resArg).object);
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

  function getFilteredResource (resList, filter, success, failure, forEachSchemaField) {
    
    filter = filter || newFilter();

    if (typeof filter === 'function') {
      forEachSchemaField = failure;
      failure = success;
      filter = newFilter();
    }
    if (!forEachSchemaField) {
      forEachSchemaField = forEachCanvassSchemaField;
    }

    var query = resourceFactory.buildQuery(forEachSchemaField, filter.filterBy);

    resList.setList([]);
    getCanvasses().query(query).$promise.then(
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
    return CANVASSSCHEMA.SORT_OPTIONS;
  }

  function forEachCanvassSchemaField (callback) {
    CANVASSSCHEMA.SCHEMA.forEachField(callback);
  }
  
  function newFilter (base, customFilter) {
    if (!customFilter) {
      customFilter = filterFunction;
    }
    var filter = filterFactory.newResourceFilter(CANVASSSCHEMA.SCHEMA, base);
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
    // canvass specific filter function
    return filterFactory.getFilteredList('filterCanvass', reslist, filter, xtraFilter);
  }
  
  function filterFunction (addrList, filter) {
    // canvass specific filter function
    addrList.filterList = getFilteredList(addrList, filter);
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

