/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .service('consoleService', consoleService);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

consoleService.$inject = ['$injector', 'DBG'];

function consoleService($injector, DBG) {

  /*jshint validthis:true */
  this.getLogger = function (tag) {
    return $injector.instantiate(ConsoleLogger, {tag: tag});
  };
  
  /*jshint validthis:true */
  this.isEnabled = function (tag) {
    return DBG.isEnabled(getConsoleLoggerTag(tag));
  };
}

function getConsoleLoggerTag (tag) {
  if (tag.indexOf('dbg') === 0) {
    return tag;
  } else {
    return 'dbg' + tag;
  }
}

function ConsoleLogger(DBG, tag) {
  this.dbg = DBG;
  this.tag = getConsoleLoggerTag(tag);
}

ConsoleLogger.$inject = ['DBG', 'tag'];

ConsoleLogger.prototype.config = function (tag) {
  this.tag = getConsoleLoggerTag(tag);
};

ConsoleLogger.prototype.isEnabled = function () {
  return this.dbg.isEnabled(this.tag);
};

/**
 * General logger function 
 * NOTE: not to be called from outside ConsoleLogger object
 * @param {string} level Log level
 */
ConsoleLogger.prototype.loggerFunc = function (level) {
  if (this.isEnabled()) {
    // argument after level will be an array as called from log/debug etc.
    var args = [].concat(arguments[1]);
    args.unshift(this.tag);
    this.dbg[level].apply(this.dbg, args);
  }
};

ConsoleLogger.prototype.log = function () {
  this.loggerFunc('log', Array.prototype.slice.call(arguments));
};

ConsoleLogger.prototype.debug = function () {
  this.loggerFunc('debug', Array.prototype.slice.call(arguments));
};

ConsoleLogger.prototype.info = function () {
  this.loggerFunc('info', Array.prototype.slice.call(arguments));
};

ConsoleLogger.prototype.warn = function () {
  this.loggerFunc('warn', Array.prototype.slice.call(arguments));
};

ConsoleLogger.prototype.error = function () {
  this.loggerFunc('error', Array.prototype.slice.call(arguments));
};

ConsoleLogger.prototype.objToString = function (obj) {
  var str = '';
  for (var prop in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, prop)) {
      if (str) {
        str += ', ';
      }
      str += prop + ': ' + obj[prop];
    }
  }
  return '{' + str + '}';
};
