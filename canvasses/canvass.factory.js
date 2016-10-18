/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .factory('canvassFactory', canvassFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

canvassFactory.$inject = ['$resource', 'baseURL', 'storeFactory', 'resourceFactory', 'miscUtilFactory', 'surveyFactory', 'addressFactory', 'userFactory'];

function canvassFactory ($resource, baseURL, storeFactory, resourceFactory, miscUtilFactory, surveyFactory, addressFactory, userFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    getCanvasses: getCanvasses,
    getCanvassAllocation: getCanvassAllocation,
    readCanvassRsp: readCanvassRsp,
    readCanvassAllocationRsp: readCanvassAllocationRsp,
    newCanvass: newCanvass,
    duplicateCanvass: duplicateCanvass,
    delCanvass: delCanvass,
    setCanvass: setCanvass,
    getCanvass: getCanvass,
    initCanvass: initCanvass,
    linkCanvasserToAddr: linkCanvasserToAddr,
    unlinkAddrFromCanvasser: unlinkAddrFromCanvasser,
    unlinkAddrListFromCanvasser: unlinkAddrListFromCanvasser

  };
  
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
   * Read a canvass response from the server
   * @param {object}   response    Server response
   * @param {string}   objId      id/array of ids of canvass & survey objects to save response data to
   * @param {string}   addrId     id/array of ids of list object(s) to save address data to
   * @param {string}   userId     id/array of ids of list object to save canvasser data to
   * @param {function} next        Optional next function to call
   * @return {object}   Canvass object
   */
  function readCanvassRsp (response, objId, addrId, userId, flags, next) {

    flags = flags || storeFactory.NOFLAG;
    if (typeof flags === 'function') {
      next = flags;
      flags = storeFactory.NOFLAG;
    }
    var canvass = {
        // from canvass model
        _id: response._id,
        name: response.name,
        description: response.description,
        startDate: new Date(response.startDate),
        endDate: new Date(response.endDate),
        election: response.election._id
      };
    if (response.survey) {
      var survey = surveyFactory.readSurveyRsp(response.survey, objId, flags);
      canvass.survey = survey._id;
    }
    // addresses/canvassers/results are all populated
    var array = readArray(response, canvass, 'addresses');
    processPopulatedSubDoc(array, addrId, addressFactory, flags);
    
    array = readArray(response, canvass, 'canvassers');
    processPopulatedSubDoc(array, userId, userFactory, flags);
    
    array = readArray(response, canvass, 'results');
//    processPopulatedSubDoc(array, userId, userFactory, flags);
    

    array = miscUtilFactory.toArray(objId);
    // if multiple objId's secondary ids are set to copies
    canvass = setCanvass(array[0], canvass, flags);
    for (var i = 1; i < array.length; ++i) {
      duplicateCanvass(array[i], array[0], storeFactory.DUPLICATE_OR_EXIST);
    }
    
    if (next) {
      next();
    }
    return canvass;
  }

  function readArray (from, to, name) {
    if (from[name]) {
      to[name] = from[name];
    } else {
      to[name] = [];
    }
    return to[name];
  }
  
  function processPopulatedSubDoc (array, ids, factory, flags) {
    if (ids) {
      // jic no native implementation is available
      miscUtilFactory.arrayPolyfill();

      // set list to a copy of the response list
      var idArray = miscUtilFactory.toArray(ids),
        arrayCopy = angular.copy(array);

      idArray.forEach(function (id) {
        var list = factory.getList(id);
        if (!list && storeFactory.doCreate(flags)) {
          list = factory.newList(id);
        }
        if (list) {
          // set list to copy & apply preset filter
          list.setList(arrayCopy, storeFactory.APPLY_FILTER);
        }
      });

      // change objects in response to what host expects i.e. ObjectIds
      for (var i = 0; i < array.length; ++i) {
        array[i] = array[i]._id;
      }
    }
  }

  
  /**
   * Read a survey response from the server
   * @param {object}   response    Server response
   * @param {string}   addrId     id of list object to save address data to
   * @param {string}   userId     id of list object to save canvasser data to
   * @param {function} next        Optional next function to call
   * @return {object}   Canvass object
   */
  function readCanvassAllocationRsp (response, addrId, userId, flags, next) {

    flags = flags || storeFactory.NOFLAG;
    if (typeof flags === 'function') {
      next = flags;
      flags = storeFactory.NOFLAG;
    }
    
    var usrList,
      addrList,
      labels = ['label-primary',
        'label-success',
        'label-info',
        'label-warning',
        'label-danger'
      ];
    
    if (userId) {
      usrList = userFactory.getList(userId);
    }
    if (addrId) {
      addrList = addressFactory.getList(addrId);
    }
    
    if (usrList && addrList) {
      // jic no native implementation is available
      miscUtilFactory.arrayPolyfill();

      var array = miscUtilFactory.toArray(response),
        labelIdx = -1;
      array.forEach(function (allocation) {
        // find canvasser
        var canvasser = usrList.list.find(elementIdTest, allocation.canvasser._id);
        if (canvasser) {
          
          canvasser.allocId = allocation._id;
          
          ++labelIdx;
          if (labelIdx == labels.length) {
            labelIdx = 0;
          }
          canvasser.labelClass = labels[labelIdx];
          
          if (!canvasser.addresses) {
            canvasser.addresses = []; // array of ids
          }
           
          if (allocation.addresses) {
            // link canvasser to each address in allocation
            allocation.addresses.forEach(function (addr) {
              // find address in address list & set link
              var addrObj = addrList.list.find(elementIdTest, addr._id);
              if (addrObj) {
                // copy info from response
                miscUtilFactory.copyProperties(addr, addrObj);
              } else if (storeFactory.doCreate(flags)) {
                addrObj = angular.copy(addrObj);
                addrList.list.push(addrObj);
              }
              if (addrObj) {
                linkCanvasserToAddr(canvasser, addrObj);
              }
            });
            
          }
          
        }
            
            
            
      });
      
      
      
    }
    
    if (next) {
      next();
    }
  }


  function linkCanvasserToAddr(canvasser, addr) {
    if (!canvasser.addresses) {
      canvasser.addresses = [];
    }
    if (canvasser.addresses.findIndex(elementTest, addr) < 0) {
      canvasser.addresses.push(addr._id);
    }

    addr.canvasser = canvasser._id;
    var badge = '',
      splits;
    if (canvasser.person.firstname) {
      badge += getFirstLetters(canvasser.person.firstname);
    }
    if (canvasser.person.lastname) {
      badge += getFirstLetters(canvasser.person.lastname);
    }
    addr.badge = badge;
    
    addr.labelClass = canvasser.labelClass;
  }
  
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

  function unlinkAddrFromCanvasser(canvasser, addr) {
    if (canvasser.addresses) {
      var idx = canvasser.addresses.findIndex(elementTest, addr);
      if (idx >= 0) {
        canvasser.addresses.splice(idx, 1);
      }
    }
    delete addr.canvasser;
    delete addr.badge;
  }
  
  function unlinkAddrListFromCanvasser(canvasser, addrList) {
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
  
  function storeId (id) {
    return 'canvass.' + id;
  }
  
  function newCanvass (id, flags) {
    return storeFactory.newObj(storeId(id), Canvass, flags);
  }
  
  function duplicateCanvass (id, srcId, flags) {
    return storeFactory.duplicateObj(storeId(id), storeId(srcId), flags);
  }
  
  function delCanvass (id, flags) {
    return storeFactory.delObj(storeId(id), flags);
  }

  function setCanvass (id, data, flags) {
    return storeFactory.setObj(storeId(id), data, flags, Canvass);
  }
  
  function getCanvass (id, flags) {
    return storeFactory.getObj(storeId(id), flags);
  }
  
  function initCanvass(id) {
    // include only required fields
    setCanvass(id, {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      election: ''
    });
  }
  
}

function Canvass(name, description, startDate, endDate, election) {
  this.name = name;
  this.description = description;
  this.startDate = startDate;
  this.endDate = endDate;
  this.election = election;
}

Canvass.prototype.toString = function pagerToString () {
  return 'Canvass{ name: ' + this.name +
  ', description: ' + this.description +
  ', startDate: ' + this.startDate +
  ', endDate: ' + this.endDate +
  ', election: ' + this.election + '}';

};

