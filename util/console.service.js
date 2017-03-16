/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .service('consoleService', consoleService);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

consoleService.$inject = ['$injector'];

function consoleService($injector) {

  this.getLogger = function (tag) {
    return $injector.instantiate(ConsoleLogger, {tag: tag});
  };
}

function ConsoleLogger(DBG, tag) {
  this.dbg = DBG;
  this.tag = tag;
}

ConsoleLogger.$inject = ['DBG', 'tag'];

ConsoleLogger.prototype.config = function (tag) {
  this.tag = tag;
};

ConsoleLogger.prototype.isEnabled = function () {
  return this.dbg.isEnabled(this.tag);
};

ConsoleLogger.prototype.log = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.tag);
  this.dbg.log.apply(this.dbg, args);
};

ConsoleLogger.prototype.debug = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.tag);
  this.dbg.debug.apply(this.dbg, args);
};

ConsoleLogger.prototype.info = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.tag);
  this.dbg.info.apply(this.dbg, args);
};

ConsoleLogger.prototype.warn = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.tag);
  this.dbg.debug.warn(this.dbg, args);
};

ConsoleLogger.prototype.error = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.tag);
  this.dbg.debug.error(this.dbg, args);
};

ConsoleLogger.prototype.objToString = function (obj) {
  var str = '';
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      if (str) {
        str += ', ';
      }
      str += prop + ': ' + obj[prop];
    }
  }
  return '{' + str + '}';
};
