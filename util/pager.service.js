/*jslint node: true */
'use strict';

/* This pager service was inspired by http://jasonwatmore.com/post/2016/01/31/AngularJS-Pagination-Example-with-Logic-like-Google.aspx */


angular.module('ct.clientCommon')

  .factory('pagerService', pagerService);


/* Manually Identify Dependencies
  https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y091
*/

pagerService.$inject = ['storeFactory'];

function pagerService (storeFactory) {

  // Bindable Members Up Top, https://github.com/johnpapa/angular-styleguide/blob/master/a1/README.md#style-y033
  var service = {
    newPager: newPager,
    delPager: delPager,
    getPager: getPager,
    updatePager: updatePager
  };
  
  return service;

  /* function implementation
    -------------------------- */

  function storeId (id) {
    return 'pager.' + id;
  }

  function newPager(id, items, currentPage, itemsPerPage, maxDispPages) {
    return updatePager(id, items, currentPage, itemsPerPage, maxDispPages);
  }

  function delPager (id, flags) {
    return storeFactory.delObj(storeId(id), flags);
  }
  
  function getPager(id, flags) {
    return storeFactory.getObj(storeId(id), flags);
  }

  function updatePager(id, items, currentPage, itemsPerPage, maxDispPages) {
    var pager = configPager(id, items, currentPage, itemsPerPage, maxDispPages);
    return pager.setPage(pager.currentPage);
  }

  
  function configPager(id, items, currentPage, itemsPerPage, maxDispPages) {
    var pager = getPager(id);

    // default values
    items = valToUse(items, pager, 'items', []);
    currentPage = valToUse(currentPage, pager, 'currentPage', 1);
    itemsPerPage = valToUse(itemsPerPage, pager, 'itemsPerPage', 10);
    maxDispPages = valToUse(maxDispPages, pager, 'maxDispPages', 10);

    var totalItems = items.length,
      totalPages = Math.ceil(totalItems/itemsPerPage);
    if ((totalPages > 0) && (currentPage < 1)) {
      currentPage = 1;
    } else if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    
    if (!pager) {
      pager = storeFactory.newObj(storeId(id), Pager);
    }
    pager.id = id;                    // id of object
    pager.items = items;              // base array of items
    pager.totalItems = totalItems;    // total number of items
    pager.currentPage = currentPage;  // current page
    pager.itemsPerPage = itemsPerPage;// items per page
    pager.maxDispPages = maxDispPages;// max number of pages in page window
    pager.totalPages = totalPages;    // total num of pages
    pager.startPage = currentPage;    // 1st page in page window
    pager.endPage = totalPages;       // last page in page window
    pager.startIndex = 0;             // start display index
    pager.endIndex = totalItems - 1;  // end display index
    pager.pages = [];                 // page nums to display
    pager.pageItems = [];             // page itgems to display

    return pager;
  }

  
  function valToUse (supplied, object, member, dflt) {
    var val;
    if (!supplied) {
      if (object) {
        val = object[member];
      } else {
        val = dflt;
      }
    } else {
      val = supplied;
    }
    return val;
  }
}

function Pager(id, items, totalItems, currentPage, itemsPerPage, maxDispPages, totalPages, startPage, endPage, startIndex, endIndex, pages, pageItems) {
  this.id = id;                     // id of object
  this.items = items;               // base array of items
  this.totalItems = totalItems;     // total number of items
  this.currentPage = currentPage;   // current page
  this.itemsPerPage = itemsPerPage; // items per page
  this.maxDispPages = maxDispPages; // max number of pages in page window
  this.totalPages = totalPages;     // total num of pages
  this.startPage = startPage;       // 1st page in page window
  this.endPage = endPage;           // last page in page window
  this.startIndex = startIndex;     // start display index
  this.endIndex = endIndex;         // end display index
  this.pages = pages;               // page nums to display
  this.pageItems = pageItems;       // page itgems to display
}

Pager.prototype.toString = function pagerToString () {
  return 'Pager{ items: ' + this.items +
  ', totalItems: ' + this.totalItems +
  ', currentPage: ' + this.currentPage +
  ', itemsPerPage: ' + this.itemsPerPage +
  ', maxDispPages: ' + this.maxDispPages +
  ', totalPages: ' + this.totalPages +
  ', startPage: ' + this.startPage +
  ', endPage: ' + this.endPage +
  ', startIndex: ' + this.startIndex +
  ', endIndex: ' + this.endIndex +
  ', pages: ' + this.pages +
  ', pageItems: ' + this.pageItems + '}';
};

Pager.prototype.setPage = function (newPage) {
  if ((newPage >= 1) && (newPage <= this.totalPages)) {
    var startPage,
      endPage;

    if (this.totalPages <= this.maxDispPages) {
      // display all pages
      startPage = 1;
      endPage = this.totalPages;
    } else {
      var middlePage = Math.floor(this.maxDispPages/2);
      if (newPage <= (middlePage + 1)) {  // 1st half of 1st page
        startPage = 1;
        endPage = this.maxDispPages;
      } else if ((newPage + middlePage - 1) >= this.totalPages) {  // last half of last page
        endPage = this.totalPages;
        startPage = endPage - this.maxDispPages +1;
      } else  {
        startPage = newPage - middlePage;
        endPage = startPage + this.maxDispPages - 1;
      }
    }
    this.startPage = startPage;
    this.endPage = endPage;
    this.currentPage = newPage;
    this.pages = getPageNumbers(startPage, endPage);

    this.startIndex = (newPage - 1) * this.itemsPerPage;
    this.endIndex = Math.min((this.startIndex + this.itemsPerPage), this.totalItems) - 1;

    this.pageItems = this.items.slice(this.startIndex, this.endIndex + 1);
  }
  return this;
};

Pager.prototype.setPerPage = function (perPage) {
  if (perPage >= 1) {
    this.totalPages = Math.ceil(this.totalItems/perPage);
    this.itemsPerPage = perPage;
    this.setPage(1);
  }
  return this;
};

Pager.prototype.stepPage = function (step) {
  return this.setPage(this.currentPage + step);
};

Pager.prototype.incPage = function () {
  return this.stepPage(1);
};

Pager.prototype.decPage = function () {
  return this.stepPage(-1);
};

function getPageNumbers(startPage, endPage) {
  var pages = [];
  for (var i = startPage; i <= endPage; ++i) {
    pages.push(i);
  }
  return pages;
}

