/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .value('USER', {
    authenticated: false,
    authToken: undefined,
    expires: undefined,     // time & date string
    sessionLength: 0,       // session length in millisec
    expired: false,

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

AuthFactory.$inject = ['$resource', '$http', '$cookies', '$timeout', 'localStore', 'baseURL', 'miscUtilFactory', 'timerFactory', 'AUTH_KEYS', 'USER', 'APPCODE'];

function AuthFactory($resource, $http, $cookies, $timeout, localStore, baseURL, miscUtilFactory, timerFactory, AUTH_KEYS, USER, APPCODE) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    login: login,
    logout: logout,
    register: register,
    loginByFacebook: loginByFacebook,
    tokenRefresh: tokenRefresh,
    getUserinfo: getUserinfo,
    storeUserinfo: storeUserinfo,
    removeUserinfo: removeUserinfo,
    SRC: {
      WEB: 'web',
      MOBILE: 'mobile'
    }
  };

  loadUserCredentials();

  return factory;

  /* function implementation
    -------------------------- */
  
  function useCredentials (credentials) {
    var authenticated = false,
      expiry,
      state;
    if (!miscUtilFactory.isEmpty(credentials)) {
      // check for expired
      authenticated = !credentialsExpired(credentials.expires);
      if (!authenticated) {
        destroyUserCredentials('stored');
      }
    }
    state = {
      username: '',
      authToken: undefined,
      expires: undefined,
      sessionLength: 0,
      id: ''
    };
    if (authenticated) {
      expiry = new Date(credentials.expires);

      state.username = credentials.username;
      state.authToken = credentials.token;
      state.expires = credentials.expires;
      state.sessionLength = expiry.getTime() - Date.now();
      state.id = credentials.id;
    }
    // update value
    USER.authenticated = authenticated;
    USER.expired = !authenticated;
    USER.username = state.username;
    USER.authToken = state.authToken;
    USER.expires = state.expires;
    USER.sessionLength = state.sessionLength;
    USER.id = state.id;

    // Set the token as header for your requests!
    $http.defaults.headers.common['x-access-token'] = state.authToken;

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
    useCredentials(credentials);
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
    var credentials = {
      username: loginData.username,
      token: response.token,
      expires: response.expires,
      id: response.id
    };
    
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
          var appCode = miscUtilFactory.readSafe(response, ['data','error','appCode']);
          if (APPCODE.IS_TOKEN_APPERR(appCode)) {
            // any token error on a refresh shuts the shop
            USER.expired = true;
            USER.authenticated = false;
          }

          if (failure) {
            failure(response);
          }
        }
      );
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

}

