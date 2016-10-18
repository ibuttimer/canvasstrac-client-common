/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .constant('ROLES', (function() {
    return {
      // level definitions for Roles from server
      ROLE_ADMIN: 100,      // admin level access
      ROLE_MANAGER: 90,     // manager level access
      ROLE_GROUP_LEAD: 80,  // group leader level access
      ROLE_STAFF: 70,       // staff level access
      ROLE_CANVASSER: 60,   // canvasser level access
      ROLE_NONE: 0          // public level access
    };
  })())

  .factory('roleFactory', roleFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

roleFactory.$inject = ['$resource', 'baseURL'];

function roleFactory ($resource, baseURL) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    getRoles: getRoles
  };
  
  return factory;

  /* function implementation
    -------------------------- */

  function getRoles () {
    // only getting roles, so no need for a custom action as the default resource "class" object has get/query
    return $resource(baseURL + 'roles', null, null);
  }
}


