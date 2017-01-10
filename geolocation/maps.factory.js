/*jslint node: true */
/*global angular */
/*global google */
/*global cordova */
'use strict';

angular.module('ct.clientCommon')

  .constant('MAPS', (function () {
    return {
      DFLT_ZOOM: 15,  // default zoom level

    };
  })())

  .factory('mapsFactory', mapsFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

mapsFactory.$inject = ['$ionicPlatform', '$resource', 'miscUtilFactory', '$cordovaGeolocation', 'addressFactory',
  'MAPS', 'PLATFORM'];

function mapsFactory($ionicPlatform, $resource, miscUtilFactory, $cordovaGeolocation, addressFactory,
  MAPS, PLATFORM) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    getMap: getMap,
    addListenerOnce: addListenerOnce,
    addListener: addListener,
    addMarker: addMarker,
    getCurrentPosition: getCurrentPosition,
    getNavigationUri: getNavigationUri,
    getNavigationUrl: getNavigationUrl,

    onMapError: onMapError

  };

  return factory;

  /* function implementation
    -------------------------- */

  /**
   * Get current position coordinates
   * @param {object}    options   Optional parameters to customize the retrieval of the geolocation
   *  @see https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-geolocation/index.html#options
   * @param {function}  onSuccess Function to be called on success
   * @param {function}  onFailure Function to be called on failure (optional)
   */
  function getCurrentPosition (options, onSuccess, onFailure) {

    $cordovaGeolocation.getCurrentPosition(options).then(function (position) {

      var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      if (onSuccess) {
        onSuccess(latLng, position);
      }
    }, function (error) {
      if (onFailure) {
        onFailure(error);
      } else {
        onMapError(error);
      }
    });
  }

  /**
   * Default map error function
   * @param {object}  error   Error details
   */
  function onMapError(error) {
    console.log('code: ' + error.code + '\n' +
        'message: ' + error.message + '\n');
  }



  // Get map by using coordinates

  function getMap(document, id, mapOptions, listenerOnce, listenerMany) {

    if (!mapOptions) {
      mapOptions = {
        zoom: MAPS.DFLT_ZOOM,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
    }

    var map = new google.maps.Map(document.getElementById(id), mapOptions);

    addListenerOnce(map, listenerOnce);
    addListener(map, listenerMany);

    return map;
  }

  function addListenerOnce(map, listeners) {

    if (map && listeners) {
      // add any one time listeners
      miscUtilFactory.toArray(listeners).forEach(function (listener) {
        google.maps.event.addListenerOnce(map, listener.eventName, listener.handler);
      });
    }
  }

  function addListener(map, listeners) {

    if (map && listeners) {
      // add any listeners
      miscUtilFactory.toArray(listeners).forEach(function (listener) {
        google.maps.event.addListener(map, listener.eventName, listener.handler);
      });
    }
  }

  /**
   * Add a marker to a map
   * @param {object}    map       Map to add marker to
   * @param {object}    latLng    Latitude/Longitude to add marker
   * @param {object}    markerOpt Additional marker options (optional)
   *  @see https://developers.google.com/maps/documentation/javascript/reference#MarkerOptions
   * @param {object}    info      Info window content
   * @param {object}    infoOpt   Additional info window options (optional)
   *  @see https://developers.google.com/maps/documentation/javascript/reference#InfoWindowOptions
   */
  function addMarker(map, latLng, markerOpt, info, infoOpt) {

    if (typeof markerOpt === 'string') {
      // no additional marker options supplied
      infoOpt = info;
      info = markerOpt;
      markerOpt = undefined;
    }

    var mOpt = {
      map: map,
      position: latLng
    };
    miscUtilFactory.copyProperties(markerOpt, mOpt);

    var marker = new google.maps.Marker(mOpt);

    if (info) {
      var iOpt = {
          content: info
        };
      miscUtilFactory.copyProperties(infoOpt, iOpt);

      var infoWindow = new google.maps.InfoWindow(iOpt);
      google.maps.event.addListener(marker, 'click', function () {
        infoWindow.open(map, marker);
      });
    }
  }

  /**
   * Generate a google maps navigation uri
   * @param {object}    address   Address to generate uri for
   * @param {string}    mode      Optional, method of transportation
   * @param {string}    avoid     Optional, features the route should try to avoid
   *  @see https://developers.google.com/maps/documentation/android-api/intents#launch_turn-by-turn_navigation
   */
  function getNavigationUri(address, mode, avoid) {
    var addr = addressFactory.stringifyAddress(address, ','),
      uri = PLATFORM[cordova.platformId].NAVIGATION_URI + addr;
    if (mode) {
      // should be one of the following
      var ok = 0;
      [PLATFORM.MODE_DRIVE, PLATFORM.MODE_WALK, PLATFORM.MODE_BIKE].forEach(function (md) {
        if (mode === md) {
          ++ok;
        }
      });
      if (ok !== 1) {
        throw new Error('Illegal mode: ' + mode);
      } else {
        uri += '&mode=' + mode;
      }
    }
    if (avoid) {
      // should be one of the following
      var avoids = [
          PLATFORM.AVOID_TOLLS, PLATFORM.AVOID_HIWAY, PLATFORM.AVOID_FERRY
        ],
        cnt = [avoids.length],
        index, i;
      for (i = 0; i < avoids.length; ++i) {
        cnt[i] = 0;
        index = 0;
        do {
          index = avoid.indexOf(avoids[i], index);
          if (index !== -1) {
            // found match
            ++cnt[i];
            ++index;
          }
        } while ((index < avoid.length) && (index >= avoid.length));
      }
      index = 0;
      for (i = 0; i < cnt.length; ++i) {
        index += cnt[i];
      }
      if ((index > 0) && (index < avoids.length)) {
        throw new Error('Illegal avoid: ' + avoid);
      } else {
        uri += '&avoid=' + avoid;
      }
    }
    return uri;
  }

  /**
   * Generate a google maps navigation url
   * @param {object}    address   Address to generate uri for
   */
  function getNavigationUrl(address) {
    var addr = addressFactory.stringifyAddress(address, ','),
      uri = PLATFORM[cordova.platformId].MAPS_URL + addr;
    return uri;
  }

  

}

