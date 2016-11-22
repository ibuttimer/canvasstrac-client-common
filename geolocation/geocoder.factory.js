/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .constant('GEOCODER', (function () {
    return {
      /* Google maps API status codes from 
        https://developers.google.com/maps/documentation/geocoding/intro#StatusCodes */
      OK: 'OK', // indicates that no errors occurred; the address was successfully parsed and at least one geocode was returned.
      ZERO_RESULTS: 'ZERO_RESULTS', // indicates that the geocode was successful but returned no results. This may occur if the geocoder was passed a non-existent address.
      OVER_LIMIT: 'OVER_QUERY_LIMIT', // indicates that you are over your quota.
      DENIED: 'REQUEST_DENIED', // indicates that your request was denied.
      INVALID: 'INVALID_REQUEST', // generally indicates that the query (address, components or latlng) is missing.
      UNKNOWN: 'UNKNOWN_ERROR',  // indicates that the request could not be processed due to a server error. The request may succeed if you try again.
    };
  })())

  .factory('geocoderFactory', geocoderFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

geocoderFactory.$inject = ['$resource', 'geocodeURL', 'apiKey', 'GEOCODER'];

function geocoderFactory($resource, geocodeURL, apiKey, GEOCODER) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    getGeocoding: getGeocoding,
    getLatLng: getLatLng

  };

  return factory;

  /* function implementation
    -------------------------- */

  function getGeocoding() {
    /* https://docs.angularjs.org/api/ngResource/service/$resource
      default action of resource class:
        { 'get':    {method:'GET'},
          'save':   {method:'POST'},
          'query':  {method:'GET', isArray:true},
          'remove': {method:'DELETE'},
          'delete': {method:'DELETE'} };
    */
    return $resource(geocodeURL, null, null);
  }


  /**
   * Get the latitude and longitude of an address.
   * @param {string}    addr      Address to get Lat/Lng for
   * @param {function}  onSuccess Function to be called on success
   * @param {function}  onFailure Function to be called on failure (optional)
   */
  function getLatLng(addr, onSuccess, onFailure) {
    if (addr) {
      getGeocoding().get({
          address: addr,
          key: apiKey
        },
        // success response
        function (response) {

          if (response.status === GEOCODER.OK) {
            // at least one match found
            if (onSuccess) {
              // return 1st result lat/lng, plus result array 
              var location = response.results[0].geometry.location,
                latLng = new google.maps.LatLng(location.lat, location.lng);

              onSuccess(latLng, response.results);
            }
          }


        },
        // error response
        function (response) {
          if (onFailure) {
            onFailure(response);
          }
        }
      );
    }
  }

}

