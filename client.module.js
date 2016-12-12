/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon', ['ct.config', 'ngResource', 'ngCordova'])

  .constant('geocodeURL', 'https://maps.googleapis.com/maps/api/geocode/json')
  .constant('PLATFORM', (function () {
    return {
      /* NOTE: keys are values returned by cordova.platformId
        NOTE: cordova.platformId seems to be a lower case copy of device.platform from cordova-plugin-device
        see http://cordova.apache.org/docs/en/latest/reference/cordova-plugin-device/index.html#supported-platforms */
      android: {
        MAPS_PACKAGE: 'com.google.android.apps.maps', // package name of the Google Maps app
        NAVIGATION_URI: 'google.navigation:q=',    /* launch Google Maps navigation with turn-by-turn direction 
                                                      e.g. 'google.navigation:q=Taronga+Zoo,+Sydney+Australia'
                                                      see https://developers.google.com/maps/documentation/android-api/intents#launch_turn-by-turn_navigation */
        MODE_DRIVE: 'd',  // method of transportation driving
        MODE_WALK: 'w',   // method of transportation walking
        MODE_BIKE: 'b',   // method of transportation bicycling
        AVOID_TOLLS: 't', // try to avoid tolls
        AVOID_HIWAY: 'h', // try to avoid highways
        AVOID_FERRY: 'f', // try to avoid ferries
        MAP_URI: 'geo:', /* display a map
                          e.g. 'geo:latitude,longitude?z=zoom'
                          see https://developers.google.com/maps/documentation/android-api/intents#uri_encoded_query_strings */
        MAPS_URL: 'https://www.google.com/maps/dir/current+location/' // e.g. https://www.google.com/maps/dir/current+location/Sydney+Opera+House,+Sydney+Opera+House,+Bennelong+Point,+Sydney+NSW+2000,+Australia/
      },
      ios: {
        // TODO

        // https://developers.google.com/maps/documentation/ios-sdk/urlscheme
      },
      isAndroid: function (platform) {
        // utilise device.platform & cordova.platformId similarity
        return (platform.toLowerCase() === 'android');
      },
      isiOS: function (platform) {
        // utilise device.platform & cordova.platformId similarity
        return (platform.toLowerCase() === 'ios');
      }
    };
  })())
  .config(function () {
    // no config for the moment
  });
