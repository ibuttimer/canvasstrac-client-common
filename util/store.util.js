/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  // object storage
  .factory('storeFactory', storeFactory)

  // browser local storage
  .factory('localStorage', localStorage);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

storeFactory.$inject = ['consoleService'];

function storeFactory(consoleService) {

  var store = {},   // object store
    con = consoleService.getLogger('storeFactory'),
    NOFLAG = 0,
    CREATE = 0x01,      // create new object if doesn't exist
    COPY_SET = 0x02,    // set using copy of object
    COPY_GET = 0x04,    // return a copy of object
    CREATE_INIT = 0x08, // create new object if doesn't exist, or init it if it does
    APPLY_FILTER = 0x10,// apply filter (after filter or list set)
    EXISTING = 0x20,    // return existing if it exists
    OVERWRITE = 0x40,   // overwrite existing if it exists
    EMPTY_OBJ = 0x80,   // create an empty object ignoring any constructor
    nameList = [
      'CREATE',
      'COPY_SET',
      'COPY_GET',
      'CREATE_INIT',
      'APPLY_FILTER',
      'EXISTING',
      'OVERWRITE',
      'EMPTY_OBJ'
    ],
    CREATE_COPY_SET = (CREATE | COPY_SET),
    CREATE_ANY = (CREATE | CREATE_INIT);

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    newObj: newObj,
    duplicateObj: duplicateObj,
    delObj: delObj,
    setObj: setObj,
    getObj: getObj,
    NOFLAG: NOFLAG,
    CREATE: CREATE,
    COPY_SET: COPY_SET,
    COPY_GET: COPY_GET,
    APPLY_FILTER: APPLY_FILTER,
    EXISTING: EXISTING,
    OVERWRITE: OVERWRITE,
    EMPTY_OBJ: EMPTY_OBJ,
    CREATE_INIT: CREATE_INIT,
    CREATE_COPY_SET: CREATE_COPY_SET,
    CREATE_ANY: CREATE_ANY,
    doCreate: doCreate,
    doCreateInit: doCreateInit,
    doCreateAny: doCreateAny,
    doCopySet: doCopySet,
    doCopyGet: doCopyGet,
    doApplyFilter: doApplyFilter,
    maskFlag: maskFlag
  };
  
  return factory;

  /* function implementation
    -------------------------- */

  function newObj (id, constructor, flags) {
    if (typeof constructor === 'number') {
      flags = constructor;
      constructor = undefined;
    }
    if (!flags) {
      flags = factory.CREATE;
    }
    con.debug('storeFactory[' + id + ']: new ' + flagsToString(flags));
    if (!store[id] || doCreateInit(flags)) {
      if (doEmptyObj(flags)) {
        store[id] = {};
      } else if (typeof constructor === 'function') {
        store[id] = new constructor();
      } else if (typeof constructor === 'object') {
        store[id] = constructor;
      } else {
        store[id] = {};
      }
      con.debug('storeFactory: created "' + id + '"');
    } else {
      if (doCreate(flags)) {
        throw new Error('Object with id "' + id + '" already exists in store.');
      }
    }
    return getObj(id, flags);
  }
  
  /**
   * Create a duplicate of an existing object
   * @throws {Error} If object exists and EXISTING flag not set, or source doesn't exist
   * @param   {string}   id       Id of new object to create
   * @param   {string}   srcId    Id of source object
   * @param   {number}   flags    Optional flags
   * @param   {function} presetCb Optional function to be called before object stored
   * @returns {object}   New or existing object
   */
  function duplicateObj (id, srcId, flags, presetCb) {
    if (typeof flags === 'function') {
      presetCb = flags;
      flags = NOFLAG;
    }
    con.debug('storeFactory[' + id + ']: duplicate ' + flagsToString(flags));
    var copy = getCopy(srcId, COPY_GET);
    if (copy) {
      if (!store[id] || doOverwrite(flags)) {
        if (presetCb) {
          presetCb(copy);    // apply callback to new object
        }
        store[id] = copy;
      } else {
        if (doExisting(flags)) {
          if (presetCb) {
            presetCb(store[id], store[srcId]);  // apply callback to existing object
          }
        } else {
          throw new Error('Object with id "' + id + '" already exists in store.');
        }
      }
    } else {
      throw new Error('Source object with id "' + srcId + '" does not exist in store.');
    }
    return getObj(id, flags);
  }
  
  /**
   * Delete an object from the store
   * @param   {string}         id    Id of object to delete
   * @param   {number}         flags Optional flags
   * @returns {object|boolean} Copy of deleted object (if COPY_GET flag) or true/false
   */
  function delObj (id, flags) {
    con.debug('storeFactory[' + id + ']: del ' + flagsToString(flags));
    var result = false;
    if (store[id]) {
      result = getCopy(id, flags);
      delete store[id];
      if (!result) {
        result = true;
      }
    }
    return result;
  }

  function getCopy (id, flags) {
    var copy;
    if (doCopyGet(flags)) {
      if (store[id]) {
        copy = angular.copy(store[id]);
      }
    }
    return copy;
  }

  function setObj (id, data, flags, constructor) {
    con.debug('storeFactory[' + id + ']: set ' + flagsToString(flags));
    var obj = store[id];
    if (!obj && doCreateAny(flags)) {
      obj = newObj(id, constructor, maskFlag(flags, CREATE_ANY));
    }
    if (obj) {
      Object.getOwnPropertyNames(data).forEach(function (prop) {
        obj[prop] = data[prop];
      });
    }
    return getObj(id, flags);
  }
  
  function getObj (id, flags) {
    con.debug('storeFactory[' + id + ']: get ' + flagsToString(flags));
    var obj = getCopy(id, flags);
    if (!obj) {
      obj = store[id];
    }
    return obj;
  }

  function testFlag (flags, test) {
    flags = flags || NOFLAG;
    return ((flags & test) !== 0);
  }

  function maskFlag (flags, mask) {
    flags = flags || NOFLAG;
    return (flags & mask);
  }

  function doCreate (flags) {
    return testFlag(flags, CREATE);
  }

  function doCreateInit (flags) {
    return testFlag(flags, CREATE_INIT);
  }

  function doCreateAny (flags) {
    return testFlag(flags, CREATE_ANY);
  }

  function doCopySet (flags) {
    return testFlag(flags, COPY_SET);
  }

  function doCopyGet (flags) {
    return testFlag(flags, COPY_GET);
  }

  function doApplyFilter (flags) {
    return testFlag(flags, APPLY_FILTER);
  }

  function doExisting (flags) {
    return testFlag(flags, EXISTING);
  }

  function doOverwrite (flags) {
    return testFlag(flags, OVERWRITE);
  }

  function doEmptyObj (flags) {
    return testFlag(flags, EMPTY_OBJ);
  }

  function flagsToString (flags) {
    var str = '',
      done,
      mask,
      idx;
    if (typeof flags === 'number') {
      for (done = idx = 0, mask = 0x01; 
            (flags !== done) && (idx < 32); 
              mask <<= 1, ++idx) {
        if ((flags & mask) == mask) {
          if (nameList[idx]) {
            str += nameList[idx] + ' ';
          } else {
            str += 'x' + mask.toString(16) + ' ';
          }
          done |= mask;
        }
      }
    } else {
      str = flags;
    }
    return str;
  }
}


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

localStorage.$inject = ['$window'];

function localStorage ($window) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    store: store,
    remove: remove,
    get: get,
    storeObject: storeObject,
    getObject: getObject
  };

  return factory;

  /* function implementation
    -------------------------- */

  function store(key, value) {
    try{
      if($window.Storage){
        $window.localStorage[key] = value;
        return true;
      } else {
        return false;
      }
    } catch( error ){
      console.error( error, error.message );
    }
  }

  function remove(key, value) {
    try{
      if($window.Storage){
        delete $window.localStorage[key];
        return true;
      } else {
        return false;
      }
    } catch( error ){
      console.error( error, error.message );
    }
  }

  function get(key, defaultValue) {
    try{
      if($window.Storage){
        return $window.localStorage[key] || defaultValue;
      } else {
        return defaultValue;
      }
    } catch( error ){
      console.error( error, error.message );
    }
  }

  function storeObject(key, value) {
    store(key, JSON.stringify(value));
  }

  function getObject(key, defaultValue) {
    return JSON.parse(get(key, defaultValue));
  }
}


