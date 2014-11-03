'use strict';

/**
 * <h1>The General Process:</h1>
 * <ol>
 * <li>Initialize Template</li>
 * <li>Poll Data</li>
 * <li>Update Left Column</li>
 * <li>Update Page Info Cache</li>
 * <li>Load Details from Cache on Click</li>
 * </ol>
 *
 * @name Minibeat
 * @author Jason Schapiro
 */

// Using module syntax from idiomatic.js
(function(global) {

  /** 
   * This module handles data from the Chartbeat API
   * @module Beat
   * @requires cbApi
   */
  var Beat = (function(cbApi) {
    if (!cbApi) {
      throw new Error('Missing Chartbeat API module');
    }
    /** 
     * Cache of the latest Top Pages Data
     * @private
     */
    var pagesInfo = [],
    /**
     * @private
     * Interval for polling
     */
      pollInterval = 5000;

    /** 
     * Updates Top Pages Data Cache
     * @access private
     * @param {Number} idx - Cache Index
     * @param {Object} data - Raw data for a single page from API
     */
    var setPageInfo = function(idx, data) {
      var info = {
        title: data.title,
        toprefs: data.stats.toprefs,
        visits: data.stats.visits
      };
      pagesInfo[idx] = info;
    };

    /** 
     * Getter for Top Pages Data Cache with title, toprefs and visits
     * @access protected
     * @param {Number} idx - Cache Index
     * @returns {Object} - Processed data from a single page
     */
    var getPageInfo = function(idx) {
      return pagesInfo[idx];
    };

    /** 
     * Long polling function that calls the CB API at set interval
     * @access public
     * @param {Number} idx - Cache Index
     * @returns {Object} - Processed data from a single page
     */
    var startPolling = function(afterUpdatedCallback) {
      console.log('Polling initiated..');
      var i,
          cb;
      cb = function(result) {
        // Do a check to make sure correct data returned
        if (result && result.pages) {
          // Update latest pages info
          for (i = 0; i<result.pages.length; i++ ) {
            setPageInfo(i, result.pages[i]);
          }
          afterUpdatedCallback();
        }
        window.setTimeout(function() {
          cbApi.getData(cb);
        }, pollInterval);
      };
      cbApi.getData(cb);
    };

    // Protected API
    return {
      getPageInfo: getPageInfo,
      startPolling: startPolling
    };
  })(global.cbApi);

  /** 
   * Handles view logic
   * @module View
   * @requires Beat
   */
  var View = (function(BeatData) {
    if (!BeatData) {
      throw new Error('Missing Beat module');
    }
    // Defaults
    var pageLimit = 10,
    pageListId = 'top-pages',
    pageDetails = {
      titleId: 'page-details-title',
      lastUpdatedId: 'page-details-last-updated',
      referrerListId: 'top-referrers-list' 
    };

    /** 
     * Helper functions for DOM manipulation
     * @class Util
     * @access protected
     */
    var Util = (function() {
      return {
        byId: function(id) {
          return document.getElementById(id);
        },
        setHTMLbyId: function(id, html) {
          document.getElementById(id).innerHTML = html;
        },
        setHTMLbySelector: function(baseElement, selector, html) {
          baseElement = baseElement || document;
          baseElement.querySelector(selector).innerHTML = html;
        }
      }
    })();

    /**
     * Uses data from the Beat cache to form page details
     * @param {Number} idx - Cache Index
     * @access private
     */
    var loadPageDetails = function(idx) {
      var pageInfo, 
          lastUpdatedString,
          refUlEl, 
          refLiEl;
      // Load Page Info
      pageInfo = BeatData.getPageInfo(idx);
      // Set Details Title
      Util.setHTMLbyId(pageDetails.titleId, pageInfo.title);

      // I decided making this realtime is out of scope
      // So I'm letting the user know when this was last updated
      lastUpdatedString = 'Last Updated: ' + new Date().toLocaleString();
      Util.setHTMLbyId(pageDetails.lastUpdatedId, lastUpdatedString);

      Util.setHTMLbyId(pageDetails.titleId, pageInfo.title);
      // Access the current referrers list
      refUlEl = Util.byId(pageDetails.referrerListId);
      // Reset Referrers list
      refUlEl.innerHTML = '';
      // Rebuild Referrers List
      pageInfo.toprefs.forEach(function(ref) {
        refLiEl = document.createElement('li');
        // I very much dislike concatinating like this,
        // but the number of referrers is dynamic so I can't
        // just prepopulate the list like on the left column
        refLiEl.innerHTML = '<div class="referrer-wrap">' +
          '<div class="top-referrer-name">' +
          ref.domain +
          '</div>' +
          '<div class="top-referrer-visitors">' +
          ref.visitors +
          '</div>' +
          '</div>';

        refUlEl.appendChild(refLiEl);
      });
    };

    /**
     * Scaffolds the initial top pages list template and onclicks (with no data)
     * @param {Function} callback - Called after templating completed
     * @access public
     */
    var setupPageTemplate = function(callback) {
      var i,
          liEl,
          ulEl = Util.byId(pageListId);
      for (i=0; i<pageLimit; i++) {
        liEl = document.createElement('li');
        // Look, a closure!
        liEl.onclick = (function(idx) {
          return function() {
            loadPageDetails.call(this, idx);
          };
        })(i);

        // Chosen for speed and readability - see (http://www.quirksmode.org/dom/innerhtml.html)
        liEl.innerHTML = '<div class="page-wrap"> \
                            <div class="page-title-container"> \
                             <div class="top-page-title"></div> \
                            </div> \
                            <div class="page-visits-container"> \
                              <div class="top-page-visits"></div> \
                            </div>';
        
        ulEl.appendChild(liEl);
      }
      callback();
    };

    /**
     * Updates the top pages list with latest cache data
     * @access public
     */
    var updateTopPagesList = function() {
      // Reset List
      var i,
          pageListEl = Util.byId(pageListId),
          pageLiEl,
          pageVisitsEl,
          pageInfo;
      for (i=0; i<pageListEl.children.length; i++) {
        pageInfo =  BeatData.getPageInfo(i);

        Util.setHTMLbySelector(pageListEl.children[i], '.top-page-title', pageInfo.title);
        Util.setHTMLbySelector(pageListEl.children[i], '.top-page-visits', pageInfo.visits);
      }
    };

    // Protected API
    return {
      updateTopPagesList: updateTopPagesList,
      setupPageTemplate: setupPageTemplate
    };
  })(Beat);

  // Setup Public APIs
  global.Beat = {
    startPolling: Beat.startPolling
  };
  global.View = View;
})(this); 

// Initializer
// I chose to expose these functions publicly in case
// in the future we want to add functionality to the callbacks
(function(global) {
  console.log('Let the beats begin!');
  View.setupPageTemplate(function() {
    Beat.startPolling(function() {
      View.updateTopPagesList();
    });
  });
})(this);
