/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .factory('votingsystemFactory', votingsystemFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

votingsystemFactory.$inject = ['$resource', 'baseURL'];

function votingsystemFactory ($resource, baseURL) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    getVotingSystems: getVotingSystems
  };
  
  return factory;

  /* function implementation
    -------------------------- */

  function getVotingSystems () {
    // only getting roles, so no need for a custom action as the default resource "class" object has get/query
    return $resource(baseURL + 'votingsystems', null, null);
  }
}


