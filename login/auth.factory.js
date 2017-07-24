/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .value('USER', {
    authenticated: false,
    token: undefined,
    expires: undefined,     // time & date string
    sessionLength: 0,       // session length in millisec
    expired: false,
    fromStore: false,

    // access properties
    // NOTE: need to match ACCESS.VOTINGSYS etc. from cliemt.module.js
    votingsysPriv: 0,
    rolesPriv: 0,
    usersPriv: 0,
    electionsPriv: 0,
    candidatesPriv: 0,
    canvassesPriv: 0,
    noticePriv: 0,

    // mirroring user model properties
    id: '',
    username: '',
    role: undefined,
    person: undefined
  })
  .constant('AUTH_KEYS', (function () {
    return {
      TOKEN_KEY: 'canvasstraccredentials',  // object key for user credentials
      USERINFO_KEY: 'canvasstracuserinfo'   // object key for user info
    };
  }()))
  .factory('authFactory', AuthFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

AuthFactory.$inject = ['$resource', '$http', '$cookies', '$timeout', 'localStore', 'baseURL', 'miscUtilFactory', 'timerFactory', 'AUTH_KEYS', 'USER', 'APPCODE', 'ACCESS'];

function AuthFactory($resource, $http, $cookies, $timeout, localStore, baseURL, miscUtilFactory, timerFactory, AUTH_KEYS, USER, APPCODE, ACCESS) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    login: login,
    logout: logout,
    register: register,
    loginByFacebook: loginByFacebook,
    tokenRefresh: tokenRefresh,
    checkForAuthError: checkForAuthError,
    getUserinfo: getUserinfo,
    isAuthenticated: isAuthenticated,
    getUsername: getUsername,
    getUserId: getUserId,
    storeUserinfo: storeUserinfo,
    removeUserinfo: removeUserinfo,
    hasAccess: hasAccess,
    isAccess: isAccess,
    SRC: {
      WEB: 'web',
      MOBILE: 'mobile'
    }
  },
  menuAccessProperties = [
    ACCESS.VOTINGSYS,
    ACCESS.ROLES,
    ACCESS.USERS,
    ACCESS.ELECTIONS,
    ACCESS.CANDIDATES,
    ACCESS.CANVASSES,
    ACCESS.NOTICES
  ],
  responseProperties = menuAccessProperties.concat([
    'token',
    'expires',
    'id'
  ]),
  credentialProperties = responseProperties.concat('username'),
  stateProperties = credentialProperties.concat('sessionLength'),
  crud = [
    { chr: 'c', bit: ACCESS.ACCESS_CREATE },
    { chr: 'r', bit: ACCESS.ACCESS_READ },
    { chr: 'u', bit: ACCESS.ACCESS_UPDATE },
    { chr: 'd', bit: ACCESS.ACCESS_DELETE },
    { chr: 'b', bit: ACCESS.ACCESS_BATCH }
  ],
  a1o = [
    { chr: 'a', bit: ACCESS.ACCESS_ALL },
    { chr: '1', bit: ACCESS.ACCESS_ONE },
    { chr: 'o', bit: ACCESS.ACCESS_OWN }
  ];

  loadUserCredentials();

  return factory;

  /* function implementation
    -------------------------- */
  
  function useCredentials(credentials, fromStore) {
    var authenticated = false,
      expiry,
      state;

    fromStore = fromStore || false;

    if (!miscUtilFactory.isEmpty(credentials)) {
      // check for expired
      authenticated = !credentialsExpired(credentials.expires);
      if (!authenticated) {
        destroyUserCredentials('stored');
        fromStore = false;
      }
    } else {
      fromStore = false;
    }

    state = {
      username: '',
      token: undefined,
      expires: undefined,
      sessionLength: 0,
      id: ''
    };
    menuAccessProperties.forEach(function (prop) {
      state[prop] = 0;
    });
    if (authenticated) {
      expiry = new Date(credentials.expires);

      miscUtilFactory.copyProperties(credentials, state, credentialProperties);
      state.sessionLength = expiry.getTime() - Date.now();
    }
    // update value
    USER.authenticated = authenticated;
    USER.expired = !authenticated;
    USER.fromStore = fromStore;
    miscUtilFactory.copyProperties(state, USER, stateProperties);

    // Set the token as header for your requests!
    $http.defaults.headers.common['x-access-token'] = state.token;

  }

  function credentialsExpired (expires) {
    var expired = true;
    if (expires) {
      // check for expired
      var expiry = new Date(expires);
      expired = (Date.now() >= expiry.getTime());
    }
    return expired;
  }

  function destroyUserCredentials (level) {
    if (level !== 'stored') {
      useCredentials(undefined);
    }
    removeStored(AUTH_KEYS.TOKEN_KEY);    
  }

  function removeStored (key) {
    if (localStore.isAvailable()) {
      localStore.remove(key);
    }
    $cookies.remove(key);    
  }

  function removeUserinfo () {
    removeStored(AUTH_KEYS.USERINFO_KEY);
  }

  function loadUserCredentials () {
    var credentials = loadStored(AUTH_KEYS.TOKEN_KEY);
    useCredentials(credentials, true);
  }

  function loadStored (key) {
    var stored;
    if (localStore.isAvailable()) {
      stored = localStore.getObject(key, '{}');
    }
    if (miscUtilFactory.isEmpty(stored)) {
      stored = $cookies.getObject(key);
      if (stored === undefined) {
        stored = {};
      }
    }
    return stored;
  }

  function getUserinfo() {
    return loadStored(AUTH_KEYS.USERINFO_KEY);
  }

  function storeUserCredentials (credentials) {
    store(AUTH_KEYS.TOKEN_KEY, credentials, credentials.expires);
  }

  function store (key, obj, expires) {
    if (localStore.isAvailable()) {
      localStore.storeObject(key, obj);
    } else {
      var options;
      if (expires) {
        options = {
          expires: expires
        };
      }
      $cookies.putObject(key, obj, expires);
    }
  }

  function storeUserinfo (loginData) {
    // only save username
    store(AUTH_KEYS.USERINFO_KEY, { username: loginData.username });
  }


  function loginSuccess (loginData, response) {
    
    var credentials = miscUtilFactory.copyProperties(response, {
      username: loginData.username
    }, responseProperties);

    if (loginData.rememberMe) {
      storeUserinfo(loginData);
    } else {
      removeUserinfo();
    }
    storeUserCredentials(credentials);
    useCredentials(credentials);

    timerFactory.addTimeout(loginData.timeout);
  }

  function refreshSuccess (response) {
    var credentials = loadStored(AUTH_KEYS.TOKEN_KEY);
    
    credentials.token = response.token;
    credentials.expires = response.expires;
    
    storeUserCredentials(credentials);
    useCredentials(credentials);
  }

  function loginFailure (/*response*/) {
    destroyUserCredentials();
  }

  function userUrl (fxn) {
    return baseURL + 'users/' + fxn;
  }

  function login (loginData, success, failure) {
    $resource(userUrl('login'))
      .save(loginData,
        function (response) {
          // success response
          loginSuccess(loginData, response);
      
          if (success) {
            success(response);
          }
        },
        function (response) {
          // error response
          loginFailure(response);

          if (failure) {
            failure(response);
          }
        }
      );
  }

  function tokenRefresh (success, failure) {
    $resource(userUrl('token') + '/:id', {id:'@id'}, null)
      .get({ id: USER.id, src: factory.SRC.WEB },
        function (response) {
          // success response
          refreshSuccess(response);
      
          if (success) {
            success(response);
          }
        },
        function (response) {
          // error response
          checkForAuthError(response);

          if (failure) {
            failure(response);
          }
        }
      );
  }

  function checkForAuthError (response) {
    // error response
    var wasErr = false,
      appCode = miscUtilFactory.readSafe(response, ['data','error','appCode']);
    if (APPCODE.IS_TOKEN_APPERR(appCode)) {
      // any token error on a refresh shuts the shop
      destroyUserCredentials();
      wasErr = true;
    }
    return wasErr;
  }

  function logout (success, failure) {
    $resource(userUrl('logout'))
      .get(function (response) {
        if (success) {
          success(response);
        }
      },
      function (response) {
        if (failure) {
          failure(response);
        }
      });
    destroyUserCredentials();
  }

  function register (registerData, success, failure) {
    $resource(userUrl('register'))
      .save(registerData, function (response) {
          // success response
          var loginData = { username: registerData.username, password: registerData.password };
          factory.login(loginData);
          if (registerData.rememberMe) {
            factory.storeUserinfo(loginData);
          }

          if (success) {
            success(response);
          }
        },
        function (response) {
          // error response
          if (failure) {
            failure(response);
          }
      });
  }

  function loginByFacebook (loginData, success, failure) {
    $resource(userUrl('facebook'))
      .get({},
        function (response) {
          // success response
      
      console.log('success' , response);
      
        // TODO username from facebook login
      
          loginSuccess(loginData.username, response);
      
          if (success) {
            success(response);
          }
        },
        function (response) {
          // error response
          loginFailure(response);

          if (failure) {
            failure(response);
          }
        }
      );
  }
  
  
  /**
   * Get an access setting for a menu
   * @param   {string} menu  Menu name
   * @param   {number} group Access group
   * @returns {number} Access setting
   */
  function getAccess (menu, group) {
    /* menu access privileges take the form similar to linux permissions
      i.e. crudb bits for each group, 
      e.g. 00100 00010 00001 (0x1041) is all group create, one group read & own group update */
    var access = ACCESS.ACCESS_NONE,
      privileges = menuAccessProperties.find(function (name) {
        return (name === menu);
      });
    if (privileges) {
      privileges = USER[privileges] || ACCESS.ACCESS_NONE;
      for (var bit = (group & ACCESS.ACCESS_GROUPMASK); bit; bit >>>= 1) {
        if (bit & 0x01) {
          access = privileges & ACCESS.ACCESS_MASK;
          break;
        }
        privileges >>>= ACCESS.ACCESS_BIT_COUNT;  // next group
      }
    }
    return access;
  }

  /**
   * Access test
   * @param   {string}  menu  Name of menu to test access for
   * @param   {number}  group Access group
   * @param   {number}  mask  Mask to test for
   * @param   {boolean} exact Match criteria; true=exact, false=any
   * @returns {boolean} true if access matches 
   */
  function accessTest (menu, group, mask, exact) {
    var result = false,
      testMask = (mask & ACCESS.ACCESS_MASK),
      access;

    for (var bit = 0x01; (bit & ACCESS.ACCESS_GROUPMASK); bit <<= 1) {
      if (bit & group) {
        access = getAccess(menu, bit) & testMask;
        if (exact) {
          result = (access === testMask); // exact match test
          if (!result) {
            break;
          }
        } else {
          if (access !== 0) { // bit match test
            result = true;
          }
        }
      }
    }
    return result;
  }

  /**
   * Has access (i.e. at least one privilege) test
   * @param   {string}  menu  Name of menu to test access for
   * @param   {string}  group Access group; 'a'=all, '1'=one or 'o'=own
   * @param   {string}  ops   Operations; 'c'=create, 'r'=read, 'u'=update & 'd'=delete
   * @returns {boolean} true if has access
   */
  function hasAccess (menu, group, ops) {
    return accessTest(menu, valToMask(group, a1o), valToMask(ops, crud), false);
  }

  /**
   * Is access (i.e. all privilege) test
   * @param   {string}  menu  Name of menu to test access for
   * @param   {string}  group Access group; 'a'=all, '1'=one or 'o'=own
   * @param   {string}  ops   Operations; 'c'=create, 'r'=read, 'u'=update & 'd'=delete
   * @returns {boolean} true if has access
   */
  function isAccess (menu, group, ops) {
    return accessTest(menu, valToMask(group, a1o), valToMask(ops, crud), true);
  }

  /**
   * Convert a string value to a mask
   * @param   {string} val   Value to convert
   * @param   {Array}  cvals Convert values array
   * @returns {number} mask
   */
  function valToMask (val, cvals) {
    var lval = val.toLowerCase(),
      mask = 0;
    cvals.forEach(function (cval) {
      if (lval.indexOf(cval.chr) >= 0) {
        mask |= cval.bit;
      }
    });
    return mask;
  }

  /**
   * Convenience method to check if user is authenticated
   * @returns {boolean} true if authenticated
   */
  function isAuthenticated() {
    return USER.authenticated;
  }

  /**
   * Convenience method to get user's username
   * @returns {string} 
   */
  function getUsername() {
    return USER.username;
  }

  /**
   * Convenience method to get user's id
   * @returns {string} 
   */
  function getUserId() {
    return USER.id;
  }
  
  
}

