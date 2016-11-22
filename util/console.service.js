/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .service('consoleService', consoleService);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

consoleService.$inject = ['$injector', 'DBG'];

function consoleService($injector, DBG) {

  this.getLogger = function (tag) {
    return $injector.instantiate(ConsoleLogger, {tag: tag});
  }
}

function ConsoleLogger(DBG, tag) {

  this.tag = tag;

  this.config = function (tag) {
    this.tag = tag;
  }

  this.log = function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this.tag);
    DBG.log.apply(DBG, args);
  }

  this.debug = function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this.tag);
    DBG.debug.apply(DBG, args);
  }

  this.info = function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this.tag);
    DBG.info.apply(DBG, args);
  }

  this.warn = function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this.tag);
    DBG.debug.warn(DBG, args);
  }

  this.error = function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this.tag);
    DBG.debug.error(DBG, args);
  }

  this.objToString = function (obj) {
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
  }
}
