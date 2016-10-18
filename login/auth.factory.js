/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .value('USER', {
    authenticated: false,
    username: '',
    authToken: undefined,
    id: ''
  })
  .constant('AUTH_KEYS', (function () {
    return {
      TOKEN_KEY: 'token',       // object key for user token
      USERINFO_KEY: 'userinfo' // object key for user info
    };
  })())
  .factory('authFactory', AuthFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

AuthFactory.$inject = ['$resource', '$http', 'storeFactory', 'localStorage', 'baseURL', 'AUTH_KEYS', 'USER'];

function AuthFactory ($resource, $http, storeFactory, localStorage, baseURL, AUTH_KEYS, USER) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    login: login,
    logout: logout,
    register: register,
    loginByFacebook: loginByFacebook,
    isAuthenticated: isAuthenticated,
    getUsername: getUsername,
    getUserId: getUserId,
    getUserinfo: getUserinfo,
    storeUserinfo: storeUserinfo,
    removeUserinfo: removeUserinfo
  };

  loadUserCredentials();

  return factory;

  /* function implementation
    -------------------------- */
  
  // TODO sort out use of localStorage or storeFactory !!!!

  function useCredentials (credentials) {
    var state = {
      authenticated: (credentials !== undefined), // TODO method to verify authenticated against server
      username: '',
      authToken: undefined,
      id: ''
    };
    if (state.authenticated) {
      state.username = credentials.username;
      state.authToken = credentials.token;
      state.id = credentials.id;
    }

    // update value
    USER.authenticated = state.authenticated;
    USER.username = state.username;
    USER.authToken = state.authToken;
    USER.id = state.id;
    
    // Set the token as header for your requests!
    $http.defaults.headers.common['x-access-token'] = state.authToken;
  }

  function destroyUserCredentials() {
    useCredentials(undefined);
    localStorage.remove(AUTH_KEYS.TOKEN_KEY);
  }

  function loadUserCredentials () {
    var credentials = localStorage.getObject(AUTH_KEYS.TOKEN_KEY, '{}');
    useCredentials(credentials);
  }

  function storeUserCredentials (credentials) {
    localStorage.storeObject(AUTH_KEYS.TOKEN_KEY, credentials);
    useCredentials(credentials);
  }
  
  function loginSuccess (loginData, response) {
    var credentials = {
      username: loginData.username,
      token: response.token,
      id: response.id
    };
    if (loginData.rememberMe) {
      storeUserCredentials(credentials);
    } else {
      useCredentials(credentials);
    }
  }

  function loginFailure (response) {
    destroyUserCredentials();
  }

  function login (loginData, success, failure) {
    $resource(baseURL + 'users/login')
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

  function logout (next) {
    $resource(baseURL + 'users/logout').get(function (response) {
      if (next) {
        next(response);
      }
    });
    destroyUserCredentials();
  }

  function register (registerData, success, failure) {
    $resource(baseURL + 'users/register')
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

  function loginByFacebook(success, failure) {
    $resource(baseURL + 'users/facebook')
      .get({},
        function (response) {
          // success response
      
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

  function isAuthenticated() {
    return USER.authenticated;
  }

  function getUsername() {
    return USER.username;
  }

  function getUserId() {
    return USER.id;
  }


  function getUserinfo() {
    return localStorage.getObject(AUTH_KEYS.USERINFO_KEY, '{}');
  }

  function storeUserinfo(loginData) {
    localStorage.storeObject(AUTH_KEYS.USERINFO_KEY, { username: loginData.username });  // only save username
  }

  function removeUserinfo() {
    localStorage.remove(AUTH_KEYS.USERINFO_KEY);
  }
}

