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
    COPY = 0x02,        // return a copy of object
    CREATE_INIT = 0x04, // create new object if doesn't exist, or init it if it does
    APPLY_FILTER = 0x08,// apply filter (after filter or list set)
    DUPLICATE_OR_EXIST = 0x10,// create a duplicate or return existing
    EMPTY_OBJ = 0x20,   // create an empty object ignoring any constructor
    CREATE_COPY = (CREATE | COPY),
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
    COPY: COPY,
    APPLY_FILTER: APPLY_FILTER,
    DUPLICATE_OR_EXIST: DUPLICATE_OR_EXIST,
    EMPTY_OBJ: EMPTY_OBJ,
    CREATE_INIT: CREATE_INIT,
    CREATE_COPY: CREATE_COPY,
    CREATE_ANY: CREATE_ANY,
    doCreate: doCreate,
    doCreateInit: doCreateInit,
    doCreateAny: doCreateAny,
    doCopy: doCopy,
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
    con.debug('storeFactory: "' + id + '" ' + flags);
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
  
  function duplicateObj (id, srcId, flags) {
    var copy = getCopy(srcId, COPY);
    if (copy) {
      if (!store[id] || doDuplicateOrExist(flags)) {
        store[id] = copy;
      } else {
        throw new Error('Object with id "' + id + '" already exists in store.');
      }
    }
    return getObj(id, flags);
  }
  
  function delObj (id, flags) {
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
    if (doCopy(flags)) {
      if (store[id]) {
        copy = angular.copy(store[id]);
      }
    }
    return copy;
  }

  function setObj (id, data, flags, constructor) {
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
  
  function doCopy (flags) {
    return testFlag(flags, COPY);
  }
  
  function doApplyFilter (flags) {
    return testFlag(flags, APPLY_FILTER);
  }
  
  function doDuplicateOrExist (flags) {
    return testFlag(flags, DUPLICATE_OR_EXIST);
  }
  
  function doEmptyObj (flags) {
    return testFlag(flags, EMPTY_OBJ);
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


