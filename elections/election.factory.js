/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .factory('electionFactory', electionFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

electionFactory.$inject = ['$resource', 'baseURL'];

function electionFactory ($resource, baseURL) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    getElections: getElections
  };
  
  return factory;

  /* function implementation
    -------------------------- */

  function getElections () {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };

      add custom update method
    */
    return $resource(baseURL + 'elections/:id', {id:'@id'}, {'update': {method: 'PUT'}});
  }
}


