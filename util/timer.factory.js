/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .factory('timerFactory', TimerFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

TimerFactory.$inject = ['$timeout', 'USER'];

function TimerFactory($timeout, USER) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    addTimeout: addTimeout,
    getTimerDuration: getTimerDuration,
    decodeTimerConfigSetting: decodeTimerConfigSetting,

    DURATION: {
      LENGTH: 'len',
      TOKEN_PERCENT: 'token%',  // duration is percentage of token life (e.g. 0.5=50%)
      TOKEN_MINUS: 'token-',    // duration is token life minus amount
      TOKEN_PLUS: 'token+',     // duration is token life plus amount
      TOKEN_DIVIDE: 'token/',   // duration is token life divided by amount
      TOKEN_MULTIPLY: 'token*'  // duration is token life multiplied by amount
    }
  },
  UNITS = [ 
    { designator: 'ms', factor: 1 },      // msec
    { designator: 's', factor: 1000 },    // sec
    { designator: 'm', factor: 60000 },   // min
    { designator: 'h', factor: 3600000 }  // hour
  ];

  return factory;

  /* function implementation
    -------------------------- */
  
  /**
   * Add a timout
   * @param {object}        data  Timeout properties object:
   * @param {number|string} value Countdown duration in the form:
   *                              number - msec value
   *                              string - text representation, e.g. '1ms', '1s', '1m', '1h', '0.5'
   * @param {string}        type  Duration type; @see factory.DURATION
   * @param {function}      fn    Function to delay execution of
   * @returns {object}        timeout promise
   */
  function addTimeout (data) {
    var promise;
    if (data) {
      var duration = getTimerDuration(data);
      if (duration > 0) {
        promise = $timeout(data.fn, duration);
      } else {
        // call immediately
        data.fn();
      }
    }
    return promise;
  }

  /**
   * Get the value for a timer in msec
   * @param {object|string} data  Timeout properties object or config string
   * @returns {object} duration in msec
   */
  function getTimerDuration (data) {
    var duration,
      param;
    if (data) {
      if (typeof data === 'string') {
        param = decodeTimerConfigSetting (data);
      } else {
        param = data;
      }
      if (param) {
        var value,
          unit;
        if (typeof data.value === 'number') {
          value = data.value;
        } else if (typeof data.value === 'string') {
          unit = UNITS.find(function (chk) {
                  var position = this.length - chk.designator.length,
                    lastIndex = this.lastIndexOf(chk.designator, position);
                  return lastIndex !== -1 && lastIndex === position;
                }, data.value);
          value = parseFloat(data.value);
          if (unit) {
            value *= unit.factor;  // convert to msec
          }
        }

        switch (data.type) {
          case factory.DURATION.LENGTH:
            duration = value;
            break;
          case factory.DURATION.TOKEN_PERCENT:
            duration = USER.sessionLength * value;
            break;
          case factory.DURATION.TOKEN_MINUS:
            duration = USER.sessionLength - value;
            break;
          case factory.DURATION.TOKEN_PLUS:
            duration = USER.sessionLength + value;
            break;
          case factory.DURATION.TOKEN_DIVIDE:
            duration = USER.sessionLength / value;
            break;
          case factory.DURATION.TOKEN_MULTIPLY:
            duration = USER.sessionLength / value;
            break;
        }
        if (duration) {
          duration = Math.floor(duration);
        }
      }
    }
    return duration;
  }

  /**
   * Decode a timer config setting in the form '<<type>><<value>>', e.g. 'len10s' for 10sec
   * @param   {string} config Config string to decode
   * @returns {object} decoded value as 
   * @param {string} type of timer
   * @param {string} valur for timer
   */
  function decodeTimerConfigSetting (config) {
    var param,
      duration = Object.getOwnPropertyNames(factory.DURATION).find(
        function (prop) {
          return (config.indexOf(factory.DURATION[prop]) === 0);
        });
    if (duration) {
      duration = factory.DURATION[duration];
      param = {
        type: duration,
        value: config.substr(duration.length)
      };
    }
    return param;
  }
  

}

