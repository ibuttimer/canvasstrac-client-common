/*jslint node: true */
/*global angular */
'use strict';

angular.module('ct.clientCommon')

  .factory('resourceListFactory', resourceListFactory);

/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

resourceListFactory.$inject = ['$filter', '$injector', 'storeFactory', 'miscUtilFactory', 'pagerFactory', 'compareFactory', 'SCHEMA_CONST'];

function resourceListFactory ($filter, $injector, storeFactory, miscUtilFactory, pagerFactory, compareFactory, SCHEMA_CONST) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var factory = {
    NAME: 'resourceListFactory',
    newResourceList: newResourceList,
    duplicateList: duplicateList,
    delResourceList: delResourceList,
    setResourceList: setResourceList,
    getResourceList: getResourceList,
    initResourceList: initResourceList,

    setFilter: setFilter,
    setPager: setPager,
    applyFilter: applyFilter,

    getSortFunction: getSortFunction,
    sortResourceList: sortResourceList,
    isDescendingSortOrder: isDescendingSortOrder,
  };
  

  // need to return factory as end so that object prototype functions are added

  /* function implementation
    -------------------------- */

  /**
   * Create a new ResourceList object
   * @param {string} storeId Id string to use in storeFactory
   * @param {object} args    Argument object with the following properties:
   *   {string} id                          Id of list
   *   {string} title                       Title of list
   *   {Array}  list                        base list to use
   *   {number} [flags=storeFactory.NOFLAG] storeFactory flags
   *   {string} factory                     name of factory
   *   {string} resource                    name of factory resource
   * @returns {object} ResourceList object
   */
  function newResourceList (storeId, args) {

    var listArgs,
      resourceList,
      newList;

    if (args) {
      listArgs = angular.copy(args);
    } else {
      listArgs = {};
    }
    if (!listArgs.id) {
      listArgs.id = '';
    }
    if (!listArgs.title) {
      listArgs.title = '';
    }
    if (!listArgs.list) {
      listArgs.list = [];
    }
    if (!listArgs.flags) {
      listArgs.flags = storeFactory.NOFLAG;
    }

    resourceList = $injector.instantiate(ResourceList, listArgs);
    newList = storeFactory.newObj(storeId, resourceList, listArgs.flags);

    if (typeof listArgs.factory === 'string') {
      newList.factory = $injector.get(listArgs.factory);
    }
    if (typeof listArgs.resource === 'string') {
      newList.resource = listArgs.resource;
    }

    newList.sortOptions = newList.factory.getSortOptions();
    newList.sortBy = newList.sortOptions[0];

    return newList;
  }
  
  /**
   * Create a new ResourceList object by duplicating an existing object
   * @param {string} id         Id string fir new ResourceList
   * @param {string} storeId    Id string to use in storeFactory
   * @param {string} srcStoreId storeFactory Id string of object to duplicate
   * @param {number} flags      storefactory flags
   * @param {object} args       Optional arguemnts specifying fields to duplicate when used with EXISTING
   *                            title: true - duplicate title
   *                            list: true - duplicate list and apply filter
   *                            filter: true - duplicate filter
   *                            pager: true - duplicate pager
   *                            sort: true - duplicate sortby
   *                            onchange: true - duplicate onchange
   */
  function duplicateList (id, storeId, srcStoreId, flags, args) {
    if (typeof flags === 'object') {
      args = flags;
      flags = storeFactory.NOFLAG;
    }
    var presetCb,
      list;
    if (args) {
      presetCb = function (destination, source) {
        return duplicateListFields (args, destination, source);
      };
    }
    list = storeFactory.duplicateObj(storeId, srcStoreId, flags, presetCb);
    list.id = id;
    return list;
  }

  /**
   * Duplicate specific ResourceList fields
   * @param {object} args        Object specifying fields to duplicate
   * @param {object} destination ResourceList to update
   * @param {object} source      ResourceList to duplicate from
   */
  function duplicateListFields (args, destination, source) {
    if (source && destination) { // need something to duplicate
      ['title', 'filter', 'pager', 'onchange'].forEach(function (prop) {
        if (args[prop]) {
          destination[prop] = angular.copy(source[prop]);
        }
      });
      if (args.sort) {
        destination.sortOptions = angular.copy(source.sortOptions);
        destination.sortBy = angular.copy(source.sortBy);
      }
      if (args.list) {
        destination.setList(source.list, 
                      (storeFactory.COPY_SET | storeFactory.APPLY_FILTER));
        destination.selCount = source.selCount;
      }
    }
  }

  /**
   * Delete a ResourceList object
   * @param {string}   storeId Id string to use in storeFactory
   * @param {number}   flags storeFactory flags; the following are used
   *                         - COPY_GET: to return copy of list
   *                         - other flags ignored
   * @returns {object|boolean} Copy of deleted ResourceList object, or true if successful
   */
  function delResourceList (storeId, flags) {
    return storeFactory.delObj(storeId, flags);
  }
  
  /**
   * Set the base list for a ResourceList object
   * @param {string}   storeId Id string to use in storeFactory
   * @param {Array}    list    base list to use
   * @param {number}   flags   storefactoryFlags
   * @param {function} newList Optional list creator function
   * @returns {object} ResourceList object
   */
  function setResourceList (storeId, list, flags, newList) {
    var resourceList = getResourceList(storeId, flags, newList);
    if (resourceList) {
      resourceList.setList(list, flags);
    }
    return getResourceList(storeId, flags);
  }

  /**
   * Get an existing ResourceList object
   * @param {string}   storeId Id string to use in storeFactory
   * @param {number}   flags   storefactoryFlags
   * @param {function} newList Optional list creator function
   * @returns {object} ResourceList object
   */
  function getResourceList (storeId, flags, newList) {
    var resourceList = storeFactory.getObj(storeId, flags);
    if (!resourceList && storeFactory.doCreateAny(flags)) {
      resourceList = newList(flags);
    }
    return resourceList;
  }

  /**
   * Initialise a ResourceList object to an emply base list
   * @param {string}   storeId Id string to use in storeFactory
   * @param   {number}   flags   storefactoryFlags
   * @returns {object} ResourceList object
   */
  function initResourceList (storeId, flags) {
    return setResourceList(storeId, [], flags);
  }

  /**
   * Set the filter for a ResourceList object
   * @param {string} storeId    Id string to use in storeFactory
   * @param   {object} [filter={}] Filter object to use, ResourceFilter object or no filter
   * @param   {number} flags      storefactoryFlags
   * @returns {object} ResourceList object
   */
  function setFilter (storeId, filter, flags) {
    if (typeof filter === 'number') {
      flags = filter;
      filter = {};
    }
    filter = filter || {};

    var resourceList = getResourceList(storeId);
    if (resourceList) {
      resourceList.filter = filter;
      if (storeFactory.doApplyFilter(flags)) {
        resourceList.applyFilter(filter);
      }
    }
    return getResourceList(storeId, flags);
  }

  /**
   * Set the pager for the ResourceList object
   * @param {string} storeId Id string to use in storeFactory
   * @param   {object} pager   pagerFactory object
   * @param   {number} flags   storefactoryFlags
   * @returns {object} ResourceList object
   */
  function setPager (storeId, pager, flags) {
    if (typeof pager === 'number') {
      flags = pager;
      pager = undefined;
    }

    var resourceList = getResourceList(storeId);
    if (resourceList) {
      resourceList.pager = pager;
    }
    return getResourceList(storeId, flags);
  }

  /**
   * Apply a filter to a ResourceList object, and update the associated pager if applicable
   * @see ResourceList.applyFilter()
   * @param {string} storeId Id string to use in storeFactory
   * @param   {object} filter filter to use or preset filter is used if undefined
   * @param   {number} flags   storefactoryFlags
   * @returns {object} this object to facilitate chaining
   */
  function applyFilter (storeId, filter, flags) {
    var resourceList = getResourceList(storeId);
    if (resourceList) {
      resourceList.applyFilter(filter);
    }
    return getResourceList(storeId, flags);
  }

  /**
   * Get the sort function
   * @param   {object} sortOptions  List of possible sort option
   * @param   {object} sortBy       Key to sort by
   * @returns {function|object} sort function or sort option
   */
  function getSortFunction (sortOptions, sortBy) {
    var sortFxn;
    for (var i = 0; (i < sortOptions.length) && !sortFxn; ++i) {
      var option = sortOptions[i].value;
      if (option === sortBy) {
        for (var j = 0; j < SCHEMA_CONST.BASIC_SORT_OPTIONS.length; ++j) {
          if (option === SCHEMA_CONST.BASIC_SORT_OPTIONS[j].value) {
            sortFxn = compareFactory.compareIndices;
            break;
          }
        }
        if (!sortFxn) {
          sortFxn = sortOptions[i];  // return sort option
        }
      }
    }
    return sortFxn;
  }

  /**
   * Sort a ResourceList
   * @param   {object}   resList         List to sort
   * @param   {function} getSortFunction Function to return  sort function
   * @param   {object}   sortOptions     List of possible sort option
   * @param   {object}   sortByValue     Key to sort by
   * @returns {Array}    sorted list
   */
  function sortResourceList (resList, getSortFunction, sortOptions, sortByValue) {
    var sortList,
      sortFxn;
    
    if (resList && resList.factory) {
      if (!getSortFunction) {
        getSortFunction = resList.factory.getSortFunction;
      }
      if (!sortOptions) {
        sortOptions = resList.sortOptions;
      }
      if (!sortByValue) {
        if (resList.sortBy) {
          sortByValue = resList.sortBy.value;
        }
      }

      if (getSortFunction && sortOptions && sortByValue) {
        sortList = resList.list;

        sortFxn = getSortFunction(sortOptions, sortByValue);
        if (sortFxn) {
          sortList.sort(sortFxn);
          if (isDescendingSortOrder(sortByValue)) {
            sortList.reverse();
          }
          
          if (resList.filter.lastFilter) {
            // reapply last filter
            resList.applyFilter(resList.filter.lastFilter);
          } else if (resList.pager) {
            // update pager
            pagerFactory.updatePager(resList.pager.id, sortList);
          }
        }
      }
    }
    return sortList;
  }

  
  /**
   * Check if sort key is descending order
   * @param   {object} sortBy   Key to sort by
   * @returns {boolean} true if is descending order, false otherwise
   */
  function isDescendingSortOrder (sortBy) {
    return (sortBy.charAt(0) === SCHEMA_CONST.SORT_DESC);
  }

  /**
   * Set the base list
   * @param {Array}  list  base list to use
   * @param {number} flags storeFactory flags; the following are used
   *                       - COPY_SET: to set list to a copy of the argument
   *                       - APPLY_FILTER: to immediately filter list
   *                       - other flags ignored
   * @returns {object} ResourceList object
   */
  function setListForResourceList (resList, list, flags) {
    var toSet = list;
    if (toSet) {
      toSet = miscUtilFactory.toArray(list);
      if (storeFactory.doCopySet(flags)) {
        toSet = angular.copy(toSet);
      }
    }
    resList.list = toSet;       // unfiltered list
    resList.filterList = toSet; // filtered list
    if (toSet) {
      resList.count = toSet.length;       // total number of possibilities
      resList.filterCount = toSet.length; // total after filter
    } else {
      resList.count = 0;
      resList.filterCount = 0;
    }
    if (storeFactory.doApplyFilter(flags)) {
      resList.applyFilter();
    }
    resList.exeChanged();

    return resList;
  }

  /**
   *  Compare the base lists of two ResourceLists
   * @param   {object}   listA   First ResourceList
   * @param   {object}   listB   Senond ResourceList
   * @param   {function} compare Function to compare entries
   * @param   {number}   start   Optional Zero-based start index
   * @param   {number}   end     Optional Zero-based index to stop comparison before
   * @returns {boolean}  true if lists match over specified range
   */
  function compareResourceLists (listA, listB, compare, start, end) {

    if (typeof compare === 'number') {
      end = start;
      start = compare;
      compare = angular.equals;
    }

    var n = miscUtilFactory.toInteger(start),
      lenA = listA.list.length >>> 0,
      lenB = listB.list.length >>> 0,
      length = miscUtilFactory.toInteger(end),
      count = 0,
      testFunc = function (entry) {
        return compare(this, entry);
      };

    if (!end || !length) {
      // set length to smallest list length
      length = lenA;
      if (length !== lenB) {
        return false; // lists not the same length
      }
    } else {  // end provided
      if ((lenA === lenB) && (length > lenA)) {
        length = lenA;  // requested length too long, use available
      } else if ((length > lenA) || (length > lenB)) {
        return false; // lists not the same over requested length
      }
    }
    
    // check entries
    for (var i = n; i < length; ++i) {
      if (listB.findIndexInList(testFunc.bind(listA.list[i])) !== undefined) {
        ++count;
      }
    }

    return (count === length);
  }

  /**
   * A resource list object containing base and filtered lists
   * @param {function} $filter         Angular filter service
   * @param {function} storeFactory    storeFactory service
   * @param {object}   miscUtilFactory miscUtilFactory service
   * @param {object}   pagerFactory    pagerFactory
   * @param {string}   id              id string
   * @param {string}   title           title string
   * @param {Array}    list            base list to use
   * @param {number}   flags           storeFactory flags
   */
  function ResourceList ($filter, storeFactory, resourceFactory, miscUtilFactory, pagerFactory, id, title, list, flags) {
    if (!list) {
      list = [];
    }

    // configure object
    this.id = id;
    this.title = title;
    setListForResourceList(this, list, flags);
    this.filter = {};         // filter
    this.pager = undefined;   // pager
    this.selCount = 0;        // selected count
    this.sortOptions = undefined;  // list of sort valid options
    this.sortBy = undefined;  // sort by option
    this.onChange = [];       // functions to be executed when contents are changed
  }

  ResourceList.$inject = ['$filter', 'storeFactory', 'resourceFactory', 'miscUtilFactory', 'pagerFactory', 'id', 'title', 'list', 'flags'];

  /**
   * Identify this object as a ResourceList
   */
  ResourceList.prototype.isResourceList = true;

  /**
   * Set the base list
   * @param {Array}  list  base list to use
   * @param {number} flags storeFactory flags; the following are used
   *                       - COPY_SET: to set list to a copy of the argument
   *                       - APPLY_FILTER: to immediately filter list
   *                       - other flags ignored
   * @returns {object} ResourceList object
   */
  ResourceList.prototype.setList = function (list, flags) {
    return setListForResourceList(this, list, flags);
  };

  /**
   * Add an entry to the base list
   * @param {object|array} entry     Entry/entries to add to list
   * @param {number}       flags     storeFactory flags; the following are used
   *                                 - COPY_SET: to add a copy of the entry argument to the list
   *                                 - APPLY_FILTER: to immediately filter list
   *                                 - other flags ignored
   * @param {boolean}      duplicate Duplicate check flag;
   *                                 true => no duplicates allowed
   *                                 false (default) => duplicated allowed
   * @param {function}     compare   Function to use for duplicate comparision, angular.equals() is used if none provided   
   */
  ResourceList.prototype.addToList = function (entry, flags, duplicate, compare) {

    var count = this.count, //initial count
      idx;

    if (typeof flags === 'boolean') {
      compare = duplicate;
      duplicate = flags;
      flags = storeFactory.NOFLAG;
    }
    if (duplicate) {
      if (!compare) {
        compare = angular.equals;
      }
    }

    if (!this.list) {
      if (Array.isArray(entry)) {
        this.setList(entry, flags);
      } else {
        this.setList([entry], flags);
      }
    } else {
      miscUtilFactory.toArray(entry).forEach(function (element) {
        // process single item
        if (duplicate) {
          // do duplicate test
          idx = this.findIndexInList(function (listEntry) {
            return compare(listEntry, element);
          });
        } else {
          idx = undefined;
        }

        if (idx === undefined) {
          // add to list
          if (storeFactory.doCopySet(flags)) {
            element = angular.copy(element);
          }

          this.list.push(element);
          this.count = this.list.length;
        }
      }, this);
    }
    if (count !== this.count) {
      if (storeFactory.doApplyFilter(flags)) {
        this.applyFilter();
      }
      this.exeChanged();
    }
  };

  /**
   * Remove an entry to the base list
   * @param {object|array} entry     Entry/entries to remove from list
   * @param {number}       flags     storeFactory flags; the following are used
   *                                 - APPLY_FILTER: to immediately filter list
   *                                 - other flags ignored
   * @param {function}     compare   Function to use for duplicate comparision, angular.equals() is used if none provided   
   */
  ResourceList.prototype.removeFromList = function (entry, flags, compare) {

    var count = this.count, //initial count
      idx;

    if (typeof flags === 'function') {
      compare = flags;
      flags = storeFactory.NOFLAG;
    }
    if (!compare) {
      compare = angular.equals;
    }

    miscUtilFactory.toArray(entry).forEach(function (element) {
      // search for item
      idx = this.findIndexInList(function (listEntry) {
        return compare(listEntry, element);
      });

      if (idx >= 0) {
        // remove from list
        this.list.splice(idx, 1);
        this.count = this.list.length;
      }
    }, this);

    if (count !== this.count) {
      if (storeFactory.doApplyFilter(flags)) {
        this.applyFilter();
      }
      this.exeChanged();
    }
  };

  /**
   * Returns a shallow copy of a portion of this list as a new array object selected
   * from begin to end (end not included). The original list will not be modified.
   * @param {number}  begin   Optional. Zero-based index at which to begin extraction.
   * @param {number}  end     Optional. Zero-based index before which to end extraction. slice extracts up to but not including end.
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
   */
  ResourceList.prototype.slice = function (begin, end) {
    return this.list.slice(begin, end);
  };

  /**
   * Notify all listeners of a change
   */
  ResourceList.prototype.exeChanged = function () {
    if (this.onChange) {
      for (var i = 0; i < this.onChange.length; ++i) {
        this.onChange[i](this);
      }
    }
  };

  /**
   * Add an onChange listener
   * @param {function} listener   listener function to callback
   */
  ResourceList.prototype.addOnChange = function (listener) {
    this.onChange.push(listener);
  };

  /**
   * Call the callback function for each of the entries in this objects list
   * @param {function} callback   function to callback
   */
  ResourceList.prototype.forEachInList = function (callback) {
    this.list.forEach(function (entry) {
      callback(entry);
    });
  };

  /**
   * Find an entry in this objects list using the callback function to test each of the entries 
   * @param {function} predicate function to test entries in list
   * @param {number}   start     offset to start from
   * @return {object}   Found entry or undefined
   */
  ResourceList.prototype.findInList = function (predicate, start) {
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    // If argument start was passed let n be ToInteger(start); else let n be 0.
    var n = miscUtilFactory.toInteger(start),
      length = this.list.length >>> 0,
      value;

    for (var i = n; i < length; i++) {
      value = this.list[i];
      if (predicate(value, i, this.list)) {
        return value;
      }
    }
    return undefined;
  };

  /**
   * Find the index of an entry in this objects list using the callback function to test each of the entries 
   * @param {function} predicate function to test entries in list
   * @param {number}   start     offset to start from
   * @return {number}   Index of found entry or undefined
   */
  ResourceList.prototype.findIndexInList = function (predicate, start) {
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    // If argument start was passed let n be ToInteger(start); else let n be 0.
    var n = miscUtilFactory.toInteger(start),
      length = this.list.length >>> 0,
      value;

    for (var i = n; i < length; i++) {
      value = this.list[i];
      if (predicate(value, i, this.list)) {
        return i;
      }
    }
    return undefined;
  };

  /**
   * Return an entry in this objects list
   * @param {number}   index     index of entry to return
   */
  ResourceList.prototype.getFromList = function (index) {
    var length = this.list.length >>> 0;

    if ((index < 0) || (index >= length)) {
      throw new RangeError('index out of range');
    }
    return this.list[index];
  };

  /**
   * Set an entry in this objects list
   * @param {number}   index     index of entry to return
   * @param {object}   value     value of entry to set
   */
  ResourceList.prototype.setInList = function (index, value) {
    var length = this.list.length >>> 0;

    if ((index < 0) || (index >= length)) {
      throw new RangeError('index out of range');
    }
    return (this.list[index] = value);
  };

  /**
   * Update an entry in this objects list with the properties of value
   * @param {number}   index     index of entry to return
   * @param {object}   value     value of entry to set
   */
  ResourceList.prototype.updateInList = function (index, value) {
    var length = this.list.length >>> 0;

    if ((index < 0) || (index >= length)) {
      throw new RangeError('index out of range');
    }
    miscUtilFactory.copyProperties(value, this.list[index]);
    return this.list[index];
  };

  /**
   * Apply a filter to the list, and update the associated pager if applicable
   * @param   {object} filter Filter object (not ResourceFilter) to use or preset filter used if undefined
   * @returns {object} this object to facilitate chaining
   */
  ResourceList.prototype.applyFilter = function (filter) {
    if (typeof filter === 'undefined') {
      // use preset filter object
      if (this.filter) {
        filter = this.filter.filterBy;
      }
    }

    filter = filter || {};
    
    this.filter.lastFilter = filter;

    if (!miscUtilFactory.isEmpty(filter) || !this.filter.allowBlank) {
      if (this.filter.customFunction) {
        // use the specific filter function to set the filtered list
        this.filter.customFunction(this, filter);
      } else {
        // use the filter object
        this.filterList = $filter('filter')(this.list, filter);
      }
    } else {
      this.filterList = this.list;
    }
    this.filterCount = this.filterList.length;

    if (this.pager) {
      pagerFactory.updatePager(this.pager.id, this.filterList);
    }

    return this;
  };

  /**
   * Sort this ResourceList
   * @param   {function} getSortFunction Function to return  sort function
   * @param   {object}   sortOptions     List of possible sort option
   * @param   {object}   sortByValue     Key to sort by
   * @returns {Array}    sorted list
   */
  ResourceList.prototype.sort = function (getSortFunction, sortOptions, sortByValue) {
    return sortResourceList(this, getSortFunction, sortOptions, sortByValue);
  };

  /**
   * Compare this ResourceList's base list to another ResourceList's
   * @param   {object}   list    ResourceList to compare to
   * @param   {function} compare Function to compare entries
   * @param   {number}   start   Optional Zero-based start index
   * @param   {number}   end     Optional Zero-based index to stop comparison before
   * @returns {boolean}  true if lists match over specified range
   */
  ResourceList.prototype.compare = function (list, compare, start, end) {
    return compareResourceLists(this, list, compare, start, end);
  };

  /**
   * toString method for a ResourceList object
   * @returns {string} string representation
   */
  ResourceList.prototype.toString = function () {
    return 'ResourceList{ id: ' + this.id +
    ', title: ' + this.title +
    ', list: ' + this.propertyToString(this.list) +
    ', count: ' + this.count +
    ', filterList: ' + this.propertyToString(this.filterList) +
    ', filterCount: ' + this.filterCount +
    ', filter: ' + this.propertyToString(this.filter) +
    ', pager: ' + this.pager +
    ', selCount: ' + this.selCount +
    ', sortOptions: ' + this.propertyToString(this.sortOptions) +
    ', sortBy: ' + this.sortBy + '}';
  };

  /**
   * Wrapper for toString to prevent toString calls on undefined
   * @param {object} property object to call to String on
   * @returns {string} string representation
   */
  ResourceList.prototype.propertyToString = function (property) {
    var str;
    if (property) {
      str = property.toString();
    } else {
      str = property;
    }
    return str;
  };

  // need the return here so that object prototype functions are added
  return factory;
}



