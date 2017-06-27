/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .factory('undoFactory', undoFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

undoFactory.$inject = ['$injector', 'consoleService', 'miscUtilFactory'];

function undoFactory ($injector, consoleService, miscUtilFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'undoFactory',
    newUndoStack: newUndoStack,
    newUndoStep: newUndoStep
  };
  
  /* function implementation
    -------------------------- */

  /**
   * Create a new UndoStack object
   * @returns {object} new UndoStack object
   */
  function newUndoStack () {
    return $injector.instantiate(UndoStack);
  }
  
  /**
   * Create a new UndoStep object
   * @throws {Error} Missing arguments
   * @param   {function} func Function to execute to do the undo
   * @returns {object}   UndoStep object
   */
  function newUndoStep (func) {
    if (!func) {
      throw new Error('Missing argument: schema');
    }
    return $injector.instantiate(UndoStep, {
      func: func
    });
  }
  
  
  function initUndoStack (stack) {
    stack.array = [];
    stack.size = 0;
    stack.multiInProgress = false;  // multi step entry in progress
  }
  

  /**
   * Configurable object to compare schema fields
   */
  function UndoStack () {
    initUndoStack(this);
  }

  UndoStack.$inject = [];

  function undoStepTypeCheck (entry) {
    if (!entry.isUndoStep) {
      throw new TypeError('Unsupported object type');
    }
  }

  function multiStepInProgressCheck (stack, require) {
    if (stack.multiInProgress !== require) {
      var msg = 'Multi-step entry ';
      if (require) {
        msg += 'not ';
      }
      msg += 'in progress';
      throw new Error(msg);
    }
  }
  
  /**
   * Format an entry to add to the stack
   * @param {object|array} entry Entry/array of entries to add
   * @returns {array} Entry to add
   */
  function getEntryToAdd (entry) {
    var toAdd;

    if (Array.isArray(entry)) {
      if (entry.length) {
        entry.forEach(function (element) {
          undoStepTypeCheck(element);
        });
        toAdd = entry;
      }
    } else {
      undoStepTypeCheck(entry);
      toAdd = [entry];
    }

    return toAdd;
  }

  /**
   * Push an entry to the end of the stack
   * @param {object|array} entry Entry/array of entries to add
   * @returns {number} current length of stack
   */
  UndoStack.prototype.push = function (entry) {

    multiStepInProgressCheck(this, false);

    var toAdd,
      len;

    if (entry !== undefined) {
      toAdd = getEntryToAdd(entry);
      if (toAdd) {
        len = this.array.push(toAdd);
        this.size = len;
      }
    }
    return len;
  };

  /**
   * Start a multi-step entry on the stack
   * @returns {number} current position in stack
   */
  UndoStack.prototype.startMultiStep = function () {
    multiStepInProgressCheck(this, false);

    this.multiInProgress = true;
    return this.array.push([]);
  };

  /**
   * Add a step to a multi-step entry on the stack
   * @param {object} step Step to add
   * @returns {number} number of steps in entry
   */
  UndoStack.prototype.addStep = function (step) {
    multiStepInProgressCheck(this, true);

    var toAdd,
      len;

    if (step !== undefined) {
      toAdd = getEntryToAdd(step);
      if (toAdd) {
        len = this.array[this.array.length - 1].push(toAdd);
        this.size = this.array.length;
      }
    }
    return len;
  };

  /**
   * End a multi-step entry on the stack
   */
  UndoStack.prototype.endMultiStep = function () {
    this.multiInProgress = false;
    if (this.array[this.array.length - 1].length === 0) {
      // no steps
      this.array.pop();
    }
  };

  
  /**
   * Clear the stack
   */
  UndoStack.prototype.clear = function () {
    initUndoStack(this);
  };

  /**
   * Undo the specified number of entries from the stack
   * @param {number} steps  Number of steps to undo, or all if not passed
   * @returns {number} New length of atack
   */
  UndoStack.prototype.undo = function (steps) {

    multiStepInProgressCheck(this, false);

    processUndo(this.array, steps);
    return (this.size = this.array.length);
  };

  function processUndo (array, steps) {

    var cnt = miscUtilFactory.toInteger(steps) || array.length,
      popped;
    if (cnt > array.length) {
      cnt = array.length;
    }

    while (cnt > 0) {
      popped = array.pop();
      if (popped) {
        if (Array.isArray(popped)) {
          processUndo(popped);  // undo all
        } else {
          popped.execute();
        }
      }
      --cnt;
    }
    return array.length;
  }


  /**
   * Canvasser/address undo link object
   * @param {object}   canvasser Canvasser to unlink
   * @param {object}   address   Address to unlink
   * @param {function} func      Undo function
   */
  function UndoStep (func) {
    this.func = func;
  }

  UndoStep.$inject = ['func'];

  UndoStep.prototype.isUndoStep = true;
  
  /**
   * Execute the canvasser/address undo
   */
  UndoStep.prototype.execute = function () {
    if (this.func) {
      this.func();
    }
  };
  
  
  
  // need the return here so that object prototype functions are added
  return factory;
}


