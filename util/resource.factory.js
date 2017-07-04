/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .constant('RESOURCE_CONST', (function () {
    var model = ['path', 'type', 'storage', 'factory'],   // related to ModelProp
      schemaModel = ['schema', 'schemaId'].concat(model), // related to Schema & ModelProp
      basicStore = ['objId', 'flags', 'storage', 'next'],
      stdArgs = schemaModel.concat(basicStore, ['subObj', 'customArgs']),
      processRead = 0x01,   // process argument during read
      processStore = 0x02,  // process argument during store
      toProcess = function (processArg, toCheck) {
        var process = true;
        if (processArg && toCheck) {
          process = ((processArg & toCheck) !== 0);
        }
        return process;
      };
    return {
      STORE_LIST: 'list',
      STORE_OBJ: 'obj',

      PROCESS_READ: processRead,
      PROCESS_STORE: processStore,
      PROCESS_READ_STORE: (processRead | processStore),
      PROCESS_FOR_READ: function (toCheck) {
        return toProcess(processRead, toCheck);
      },
      PROCESS_FOR_STORE: function (toCheck) {
        return toProcess(processStore, toCheck);
      },

      MODEL_ARGS: model,
      SCHEMA_MODEL_ARGS: schemaModel,
      BASIC_STORE_ARGS: basicStore,
      STD_ARGS: stdArgs,
      
      QUERY_OR: '$or', // performs a logical OR operation on an array of two or more <expressions> and selects the documents that satisfy at least one of the <expressions>
      QUERY_AND: '$and', // performs a logical AND operation on an array of two or more expressions (e.g. <expression1>, <expression2>, etc.) and selects the documents that satisfy all the expressions
      QUERY_NOT: '$not', // performs a logical NOT operation on the specified <operator-expression> and selects the documents that do not match the <operator-expression>
      QUERY_NOR: '$nor', // performs a logical NOR operation on an array of one or more query expression and selects the documents that fail all the query expressions

      QUERY_OR_JOIN: '|',   // multi field OR
      QUERY_AND_JOIN: '+',  // multi field AND
      QUERY_COMMA_JOIN: ',',  // multi field comma join

      QUERY_NE: '!',  // inverse i.e. not equal
      QUERY_EQ: '=',  // equal
      QUERY_GT: '>',  // greater than
      QUERY_LT: '<',  // less than
      QUERY_GTE: '>=',  // greater than or equal
      QUERY_LTE: '<=',  // less than or equal
      QUERY_BLANK: '~', // blank
      QUERY_NBLANK: '!~' // not blank
    };
  }()))

  .factory('resourceFactory', resourceFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

resourceFactory.$inject = ['$resource', '$filter', '$injector', 'baseURL', 'storeFactory', 'miscUtilFactory', 'pagerFactory', 'compareFactory', 'standardFactoryFactory', 'resourceListFactory', 'queryFactory', 'consoleService', 'SCHEMA_CONST', 'RESOURCE_CONST'];

function resourceFactory ($resource, $filter, $injector, baseURL, storeFactory, miscUtilFactory, pagerFactory, compareFactory, standardFactoryFactory, resourceListFactory, queryFactory, consoleService, SCHEMA_CONST, RESOURCE_CONST) {

  // jic no native implementation is available
  miscUtilFactory.arrayPolyfill();

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'resourceFactory',
    createResources: createResources,
    getStoreResource: getStoreResource,
    storeServerRsp: storeServerRsp,
    storeSubDoc: storeSubDoc,
    standardiseArgs: standardiseArgs,
    getStandardArgsObject: getStandardArgsObject,
    checkStandardArgsObjectArgs: checkStandardArgsObjectArgs,
    checkArgs: checkArgs,
    arrayiseArguments: arrayiseArguments,
    findInStandardArgs: findInStandardArgs,
    findAllInStandardArgs: findAllInStandardArgs,
    addResourcesToArgs: addResourcesToArgs,
    standardiseModelArgs: standardiseModelArgs,
    getObjectInfo: getObjectInfo,
    removeSchemaPathTypeArgs: removeSchemaPathTypeArgs,
    copyBasicStorageArgs: copyBasicStorageArgs,
    removeBasicStorageArgs: removeBasicStorageArgs,
    getServerRsp: getServerRsp,
    
    extendFactory: extendFactory
  },
  modelArgsMap = {},
  StandardArgsInfo = [
    // arg info for checkStandardArgsObjectArgs()
    { name: 'factory', test: angular.isString, dflt: undefined },
    { name: 'subObj', test: angular.isArray, dflt: undefined },
    { name: 'schema', test: angular.isObject, dflt: {} },
    { name: 'flags', test: angular.isNumber, dflt: storeFactory.NOFLAG },
    { name: 'next', test: angular.isFunction, dflt: undefined },
    { name: 'custom', test: angular.isObject, dflt: {} }
  ],
  con;  // console logger

  if (consoleService.isEnabled(factory.NAME)) {
    con = consoleService.getLogger(factory.NAME);
  }

  // add additional methods to factory
  extendFactory(factory, standardFactoryFactory);
  extendFactory(factory, resourceListFactory);
  extendFactory(factory, queryFactory);
  
  RESOURCE_CONST.MODEL_ARGS.forEach(function (prop) {
    switch (prop) {
      case 'path':
        modelArgsMap[prop] = 'getModelName'; // Schema object function to get value
        break;
      case 'type':
        modelArgsMap[prop] = 'getType'; // Schema object function to get value
        break;
      case 'storage':
        modelArgsMap[prop] = 'getStorageType'; // Schema object function to get value
        break;
      case 'factory':
        modelArgsMap[prop] = 'getModelFactory'; // Schema object function to get value
        break;
    }
  });

  // need the return here so that object prototype functions are added
  return factory;

  // need to return factory as end so that object prototype functions are added

  /* function implementation
    -------------------------- */

  /**
   * Extend a factory with poprerties from another factory
   * @param   {object} dst     Factory to extend
   * @param   {object} src     Factory to get poprerties from
   * @param   {Array}  addlist List of properties to add to dst
   * @param   {Array}  exlist  List of properties to not add to dst
   * @returns {object} Destination factory
   */
  function extendFactory (dst, src, addlist, exlist) {
    
    if (addlist) {
      addlist = addlist.slice();
    } else {
      addlist = Object.getOwnPropertyNames(src);
    }
    if (exlist) {
      exlist = exlist.slice();
    } else {
      exlist = [];
    }
    exlist.push('NAME');  // never copy name
    
    // remove excluded entries from add list
    exlist.forEach(function (prop) {
      var idx = addlist.findIndex(function (element) {
        return (element === prop);
      });
      if (idx >= 0) {
        addlist.splice(idx, 1);
      }
    });
    // copy add list entries
    addlist.forEach(function (prop) {
      if (src.hasOwnProperty(prop)) {
        dst[prop] = src[prop];
      }
    });
    return dst;
  }
  
  /**
   * Create resources
   * @param   {object} options   Options specifying ids & types
   * @param   {object} resources Object to add the new resources to
   * @returns {object} Object updateed with the new resources
   */
  function createResources (options, resources) {
    var srcId,
      result,
      args = standardiseArgs(options);
    if (!resources) {
      resources = {};
    }
    args.objId.forEach(function (id) {
      switch (args.storage) {
        case RESOURCE_CONST.STORE_OBJ:
          if (!srcId) {
            result = args.factory.newObj(id, storeFactory.CREATE_INIT);
          } else {
            result = args.factory.duplicateObj(id, srcId, storeFactory.OVERWRITE);
          }
          break;
        case RESOURCE_CONST.STORE_LIST:
          if (!srcId) {
            result = args.factory.newList(id, {
              title: id,
              flags: storeFactory.CREATE_INIT,
              resource: args.resource
            });
          } else {
            result = args.factory.duplicateList(id, srcId, storeFactory.OVERWRITE);
          }
          break;
        default:
          result = undefined;
      }
      if (result) {
        resources[id] = result;
      }
      if (!srcId) {
        srcId = id;
      }
    });

    if (args.subObj) {
      args.subObj.forEach(function (subObj) {
        createResources(subObj, resources);
      });
    }

    return resources;
  }

  /**
   * Get a store object
   * @param {object}       options   process arguments object with following properties:
   *  @param {string}       objId    id of object to get
   *  @param {number}       flags    storefactory flags
   * @return {object}       ResourceList or object
   */
  function getStoreResource (options) {
    var result,
      args = standardiseArgs(options);
    if (args.storage === RESOURCE_CONST.STORE_LIST) {
      result = args.factory.getList(args.objId, args.flags);
    } else if (args.storage === RESOURCE_CONST.STORE_OBJ) {
      result = args.factory.getObj(args.objId, args.flags);
    }
    return result;
  }

  /**
   * Store a response from the server
   * @param {object}       response Server response
   * @param {object}       args     process arguments object with following properties:
   *  @param {string|Array} objId    id/array of ids of object to save response data to
   *  @param {string}       storage  save as list or object flag; STORE_LIST, STORE_OBJ, default depends on response
   *  @param {string}       path     path within response object to object to store
   *  @param {string}       type     object type, @see SCHEMA_CONST.FIELD_TYPES
   *  @param {object}       schema   Schema to use to retrieve object path & type
   *  @param {number}       schemaId Schema id to use to retrieve object path & type
   *  @param {number}       flags    storefactory flags
   *  @param {object|string} factory  factory (or factory name) to handle saving of objects/lists
   *  @param {function}     next     function to call after processing
   *  @param {Object|array} subObj   additional set(s) of arguments for sub objects
   * @return {object}       ResourceList or object
   */
  function storeServerRsp (response, args) {

    if (!RESOURCE_CONST.PROCESS_FOR_STORE(args.processArg)) {
      // arg only processed during read, so ignore
      return undefined;
    } // else process for store

    var stdArgs = standardiseArgs(args, args.parent),
      factory = stdArgs.factory,
      idArray = stdArgs.objId,
      resp,
      asList, i,
      toSave = getObjectInfo(response, stdArgs).object;

    // store sub objects first
    if (args.subObj) {
      miscUtilFactory.toArray(args.subObj).forEach(function (subObj) {
        storeSubDoc(response, subObj, stdArgs);
      });
    }

    resp = toSave;  // default result is raw object

    if (idArray.length) {
      if (stdArgs.storage === RESOURCE_CONST.STORE_LIST) {
        asList = true;
      } else if (stdArgs.storage === RESOURCE_CONST.STORE_OBJ) {
        asList = false;
      } else {
        asList = Array.isArray(toSave);
      }

      if (asList) {
        // process a query response
        if (toSave) {
          resp = factory.setList(idArray[0], toSave, stdArgs.flags);
        } else {
          resp = factory.initList(idArray[0], stdArgs.flags);
        }
      } else {
        // process a get response
        if (toSave) {
          resp = factory.setObj(idArray[0], toSave, stdArgs.flags);
        } else {
          resp = factory.initObj(idArray[0], stdArgs.flags);
        }
      }
      if (con) {
        con.debug('storeServerRsp: ' + idArray[0]);
      }
      // if multiple objId's secondary ids are set to copies
      for (i = 1; i < idArray.length; ++i) {
        if (asList) {
          factory.duplicateList(idArray[i], idArray[0], storeFactory.EXISTING, {
            list: true  // just duplicate list
          });
        } else {
          factory.duplicateObj(idArray[i], idArray[0], storeFactory.OVERWRITE);
        }
      }
    }

    if (stdArgs.next) {
      stdArgs.next(resp);
    }
    return resp;
  }


  /**
   * Get the object to save based on the provided path
   * @param {object} response Response object
   * @param {string} path     Path to required object
   * @return {object} object to save
   */
  function getObjectInfo (response, args) {
    var paths = [],
      object = response,
      parent, property;

    if (args.path) {
      paths.push(args.path);
    }
    for (parent = args.parent; parent && parent.path; parent = parent.parent) {
      paths.unshift(parent.path);
    }
    
    // drill down to get item to save
    paths.forEach(function (path) {
      if (object) {
        parent = object;
        property = path;
        object = parent[property];
      }
    });
    return { object: object,    // object to save
              parent: parent,   // parent object
              property: property }; // parent object property
  }

  /**
   * Process a populated sub document, by copying the data to a new factory object and 
   * transforming the original to ObjectIds.
   * @param {object} response Server response
   * @param {object} args     process arguments object, @see storeServerRsp() for details
   * @param {object} parent   Object's parent
   */
  function storeSubDoc(response, args, parent) {

    if (!RESOURCE_CONST.PROCESS_FOR_STORE(args.processArg)) {
      // arg only processed during read, so ignore
      return undefined;
    } // else process for store

    var stdArgs = standardiseArgs(args, parent),
      resp, list,
      toSaveInfo = getObjectInfo(response, stdArgs),
      toSave = toSaveInfo.object;

    // store subdoc, resp is ResourceList or object
    resp = storeServerRsp(response, stdArgs);

    // update response with expected response type i.e. ObjectIds
    if (resp) {
      if (SCHEMA_CONST.FIELD_TYPES.IS_OBJECTID(stdArgs.type)) {
        // field is objectId, so was saved as object
        toSaveInfo.parent[toSaveInfo.property] = resp._id;

      } else if (SCHEMA_CONST.FIELD_TYPES.IS_OBJECTID_ARRAY(stdArgs.type)) {
        // field is an array of objectId
        if (Array.isArray(toSave)) {
          if (resp.isResourceList) {
            list = resp.list; // its a ResourceList
          } else {
            list = resp;  // should be an raw array
          }
          for (var i = 0; i < toSave.length; ++i) {
            toSave[i] = list[i]._id;
          }
        }
      }
    }
    return resp;
  }

  /**
   * Standardise a server response argument object
   * @param {object}   args     process arguments object, @see storeServerRsp() for details
   * @param {object}   parent   Object's parent
   * @return {object}  arguments object
   */
  function standardiseArgs (args, parent) {

    var stdArgs = angular.copy(args);

    if (stdArgs.objId) {
      stdArgs.objId = miscUtilFactory.toArray(stdArgs.objId);
    } else {
      stdArgs.objId = [];
    }
    stdArgs.flags = (args.flags ? args.flags : storeFactory.NOFLAG);
    stdArgs.parent = parent;

    copySchemaModelArgs(
      standardiseModelArgs(copySchemaModelArgs(args), false /*no copy*/), stdArgs);

    if (typeof args.factory === 'string') {
      // get factory instance from injector
      stdArgs.factory = $injector.get(args.factory);
    }

    if (stdArgs.subObj) {
      if (Array.isArray(stdArgs.subObj)) {
        for (var i = 0; i < stdArgs.subObj.length; ++i) {
          stdArgs.subObj[i] = standardiseArgs(stdArgs.subObj[i], stdArgs);
        }
      } else {
        stdArgs.subObj = [standardiseArgs(stdArgs.subObj, stdArgs)];
      }
    }

    return stdArgs;
  }

  /**
   * Return a standard args object
   * @param {string|array} objId  Id(s) to use for storage
   * @param {string} factory      Factory name
   * @param {array} subObj        Sub-objects
   * @param {object} schema       Schema object
   * @param {number} flags        storeFactory flags
   * @param {function} next       Function to call following completion
   * @param {object} custom       Custom properties
   * @returns {object} Standard args object
   */
  function getStandardArgsObject(objId, factory, subObj, schema, flags, next, custom) {

    var args = intCheckStandardArgsObjectArgs(arrayiseArguments(arguments, 1)); // exclude objId
    return {
      objId: objId,
      factory: args.factory,
      schema: args.schema.schema,
      schemaId: args.schema.schemaId,
      //type/path/storage/factory: can be retrieved using schema & schemaId
      subObj: args.subObj,
      flags: args.flags,
      next: args.next,
      customArgs: args.custom
    };
  }

  /**
   * Check arguemnts for getRspOptionsObject() making sure args are correctly positioned
   * @param {string} factory      Factory name
   * @param {array} subObj        Sub-objects
   * @param {object} schema       Schema object
   * @param {number} flags        storeFactory flags
   * @param {function} next       Function to call following completion
   * @param {object} custom       Custom properties
   * @returns {object} args object
   * 
   * NOTE 1: make sure to update StandardArgsInfo on any change to function prototype.
   *      2: this function is not for internal use, use intCheckStandardArgsObjectArgs() within this factory
   */
  function checkStandardArgsObjectArgs(factory, subObj, schema, flags, next, custom) {
    return intCheckStandardArgsObjectArgs(arguments);
  }

  /**
   * Check arguemnts for getRspOptionsObject() making sure args are correctly positioned
   * @param {object}  funcArguments Argument object for original function
   * @return {object} checked argument object
   * 
   * NOTE: Interval version of checkStandardArgsObjectArgs()
   */
  function intCheckStandardArgsObjectArgs(funcArguments) {
    return checkArgs(StandardArgsInfo, funcArguments);
  }

  /**
   * Check arguments for correct positioning in function call
   * @param {Array}         argsInfo      Array of argument info objects:
   *                                      { name: <arg name>, test: <predicate validity test>, 
   *                                        dflt: <default value> }
   * @param {object|Array}  funcArguments Argument object for original function or an array of arguments
   * @return {object} checked argument object
   */
  function checkArgs(argsInfo, funcArguments) {

    var args = (Array.isArray(funcArguments) ? funcArguments.slice() : arrayiseArguments(funcArguments)),
      arg,
      checked = {};

    for (var i = 0, ll = argsInfo.length; i < ll; ++i) {
      arg = argsInfo[i];
      if (!arg.test(args[i])) {
        if (args.length < ll) { // num of args < expected
          args.splice(i, 0, arg.dflt);  // insert argument default value
        } else {
          // right shift arguments
          for (var j = args.length - 1; j > i; --j) {
            args[j] = args[j - 1];
          }
          args[i] = arg.dflt;   // set argument to default value
        }
      }
      checked[arg.name] = args[i];
    }
    return checked;
  }

  /**
   * 
   * Convert a function arguments object to an array
   * @param {object}  funcArguments Argument object for original function
   * @param {number}  start         Argument indexto start from
   * @return {Array} argument array
   */
  function arrayiseArguments(funcArguments, start) {
    var array;
    if (start === undefined) {
      start = 0;
    }
    if (start >= funcArguments.length) {
      array = [];
    } else if (funcArguments.length === 1) {
      array = [funcArguments[0]];
    } else {
      array = Array.prototype.slice.call(funcArguments, start);
    }
    return array;
  }

  /**
   * Find an arg object within a StandardArgs object 
   * @param {object}       stdArgs  StandardArgs object to traverse
   * @param {function}     callback Function to test arg objects
   * @return {object}      arguments object
   */
  function findInStandardArgs (stdArgs, callback) {

    var arg;
    if (callback(stdArgs)) {
      arg = stdArgs;
    }
    if (!arg && stdArgs.subObj) {
      for (var i = 0; !arg && (i < stdArgs.subObj.length); ++i) {
        arg = findInStandardArgs(stdArgs.subObj[i], callback);
      }
    }
    return arg;
  }

  /**
   * Find all arg objects within a StandardArgs object 
   * @param {object}       stdArgs  StandardArgs object to traverse
   * @param {function}     callback Function to test arg objects
   * @param {Array}        args     Array to add matching arg objects to
   * @return {Array}       Array of matching arg objects
   */
  function findAllInStandardArgs (stdArgs, callback, args) {

    if (!args) {
      args = [];
    }
    if (callback(stdArgs)) {
      args.push(stdArgs);
    }
    if (stdArgs.subObj) {
      stdArgs.subObj.forEach(function (sub) {
        findAllInStandardArgs(sub, callback, args);
      });
    }
    return args;
  }

  /**
   * Add resources required by Schema object
   * @param {object}       args   Args object to add to
   * @return {object}      arguments object
   */
  function addResourcesToArgs (args) {
    if (!args.injector) {
      /* need to pass run stage injector to Schema object as since it is created during the config
        stage it only has access to the config stage injector (only providers and constants accessible) */
      args.injector = $injector;
    }
    if (!args.findInStandardArgs) {
      args.findInStandardArgs = findInStandardArgs;
    }
    return args;
  }

  /**
   * Standardise a server response argument object
   * @param {object}       args     process arguments object with following properties:
   * @see storeServerRsp()
   * @return {object}       arguments object
   */
  function standardiseModelArgs (args, makeCopy) {
    
    makeCopy = ((makeCopy === undefined) ? true : makeCopy);

    var stdArgs = args;
    if (makeCopy) {
      stdArgs = copySchemaModelArgs(args);
    }

    if (stdArgs.schema && 
        (typeof stdArgs.schemaId === 'number') && (stdArgs.schemaId >= 0)) {
      // if not explicitly set retrieve using schema & schemaId
      RESOURCE_CONST.MODEL_ARGS.forEach(function (prop) {
        if (!stdArgs[prop]) {
          stdArgs[prop] = stdArgs.schema[modelArgsMap[prop]](stdArgs.schemaId);
        }
      });




//-      if (!stdArgs.path) {
//-        // path not explicitly provided, retrieve from schema & schemaId
//-        stdArgs.path = stdArgs.schema.getModelName(stdArgs.schemaId);
//-      }
//-      if (!stdArgs.type) {
//-        // path not explicitly provided, retrieve from schema & schemaId
//-        stdArgs.type = stdArgs.schema.getType(stdArgs.schemaId);


    }

    return stdArgs;
  }

  /**
   * Copy the standard Schema/ModelProp arguments
   * @param {Array}  list list of properties to copy
   * @param {object} args process arguments object to copy from
   * @param {object} to   process arguments object to copy to
   * @return {object} arguments object
   */
  function copyArgs (list, args, to) {
    if (!to) {
      to = {};
    }
    return miscUtilFactory.copyProperties(args, to, list);
  }

  /**
   * Copy the standard Schema/ModelProp arguments
   * @param {object}       args     process arguments object to copy from
   * @param {object}       to       process arguments object to copy to
   * @return {object}       arguments object
   */
  function copySchemaModelArgs (args, to) {
    return copyArgs(RESOURCE_CONST.SCHEMA_MODEL_ARGS, args, to);
  }

  /**
   * Remove the standard Schema/ModelProp arguments
   * @param {object}       args     process arguments object to remove from
   * @return {object}       arguments object
   */
  function removeSchemaPathTypeArgs (args) {
    return miscUtilFactory.removeProperties(args, RESOURCE_CONST.SCHEMA_MODEL_ARGS);
  }

  /**
   * Copy the basic storage arguments
   * @param {object}       args     process arguments object to copy from
   * @param {object}       to       process arguments object to copy to
   * @return {object}       arguments object
   */
  function copyBasicStorageArgs (args, to) {
    return copyArgs(RESOURCE_CONST.BASIC_STORE_ARGS, args, to);
  }

  /**
   * Remove the standard Schema/ModelProp arguments
   * @param {object}       args     process arguments object to remove from
   * @return {object}       arguments object
   */
  function removeBasicStorageArgs (args) {
    return miscUtilFactory.removeProperties(args, RESOURCE_CONST.BASIC_STORE_ARGS);
  }

  
  
  /**
   * Get a stored response from the server
   * @param {object}       args     process arguments object with following properties:
   * @see storeServerRsp()
   * @return {object}       ResourceList or object
   */
  function getServerRsp (args) {

    var stdArgs = standardiseArgs(args),
      factory = stdArgs.factory,
      idArray = stdArgs.objId,
      resp = [],
      asList = true,
      asObj = true,
      read;

    if (stdArgs.storage === RESOURCE_CONST.STORE_LIST) {
      asObj = false;
    } else if (stdArgs.storage === RESOURCE_CONST.STORE_OBJ) {
      asList = false;
    } 
    // else no type specified so try both

    if (asList) {
      idArray.forEach(function (id) {
        read = factory.getList(id, stdArgs.flags);
        if (read) {
          resp.push(read);
        }
      });
    } 
    if (asObj) {
      idArray.forEach(function (id) {
        read = factory.getObj(id, stdArgs.flags);
        if (read) {
          resp.push(read);
        }
      });
    }

    if (stdArgs.next) {
      stdArgs.next(resp);
    }
    return resp;
  }

}
