/*
 * grunt-backbonebuilder
 * https://github.com/asciidisco/grunt-backbonebuilder
 *
 * Copyright (c) 2012 asciidisco
 * Licensed under the MIT license.
 */

(function () {
  'use strict';

  var fs = require('fs');
  var _ = null;
  var combinations = {
    Collection: ['Header', 'Setup', 'Events', 'Model', 'Collection', 'Sync', 'Helpers', 'Footer'],
    Model: ['Header', 'Setup', 'Events', 'Model', 'Collection', 'Sync', 'Helpers', 'Footer'],
    View: ['Header', 'Setup', 'Events', 'View', 'Helpers', 'Footer'],
    Router: ['Header', 'Setup', 'Events', 'Router', 'History', 'Helpers', 'Footer'],
    Events: ['Header', 'Setup', 'Events', 'Helpers', 'Footer'],
    All: ['Header', 'Setup', 'Events', 'Model', 'Collection', 'Router', 'View', 'History', 'Sync', 'Helpers', 'Footer']
  };

  // extract a part by its character index
  var extract = function (source, start, end) {
    return source.substring(start, end);
  };

  // parts are seperated by annotations
  var getBackboneParts = function (bbsource) {
    var parts = {
      Header: '',
      Setup: '// Initial Setup',
      Events: '// Backbone.Events',
      Model: '// Backbone.Model',
      Collection: '// Backbone.Collection',
      Router: '// Backbone.Router',
      History: '// Backbone.History',
      View: '// Backbone.View',
      Sync: '// Backbone.sync',
      Helpers: '// Helpers',
      Footer: '// Set up inheritance'
    };


    // index & module helper
    var lastPos = 0;
    var temp = 0;
    var keys = Object.keys(parts);

    // extract every module
    keys.forEach(function (key, idx) {
      temp = typeof keys[idx + 1] !== 'undefined' ? bbsource.search(parts[keys[idx + 1]]) : bbsource.length;
      parts[key] = extract(bbsource, lastPos, temp);
      lastPos = temp;
    });

    return parts;
  };

  // glues the backbone parts together again
  var setUpNeededParts = function (combinations, parts, backboneSrc) {
    var src = '';
    var allCombinations = [];

    parts.forEach(function (part) {
      allCombinations.push(combinations[_.str.capitalize(part.toLowerCase())]);
    });

    var neededParts = _.union.apply(_, allCombinations);
    var backboneParts = getBackboneParts(backboneSrc);
    var finalCombination = _.intersection(combinations.All, neededParts);

    finalCombination.forEach(function (part) {
      src += backboneParts[_.str.capitalize(part.toLowerCase())];
    });

    var extender = '';
    finalCombination.forEach(function (extendo) {
      var lowerEx = extendo.toLowerCase();
      if (lowerEx === 'model') {
        extender += 'Model.extend = ';
      }

      if (lowerEx === 'collection') {
        extender += 'Collection.extend = ';
      }

      if (lowerEx === 'router') {
        extender += 'Router.extend = History.extend = ';
      }

      if (lowerEx === 'view') {
        extender += 'View.extend = ';
      }
    });

    src = src.replace('Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;', extender += 'extend;');
    return src;
  };

  exports.init = function(grunt) {
    var exports = {};

    var util = grunt.utils || grunt.util;
    _ = util._;
 
    var Transport = function (type, content) {
      this.type = type;
      this.content = content;
    };

    // cuts the backbone file & glues it together again
    exports.build = function (options, contentCb) {
      var backbonePath = require.resolve('backbone');
      var fileContents = '';
      var backboneSource = '';

      // check if we should use a different backbone version
      if (options.config.src) {
        try {
          backbonePath = options.config.src;
          backboneSource = String(fs.readFileSync(backbonePath));
        } catch (e) {
          contentCb(new Transport('error', 'Could not load given backbone version at "' + options.config.src + '"'), options);
          return null;
        }
      } else {
          backboneSource = String(fs.readFileSync(backbonePath));
      }

      // check if the version is minified (and throw some error when it is)
      if (backboneSource.length < 40000) {
          contentCb(new Transport('error', 'Backbone builder needs an unminified version of Backbone to build ("' + options.config.src + '")'), options);
          return null;
      }

      // get the custom backbone src
      fileContents = setUpNeededParts(combinations, options.config.include || combinations.All, backboneSource);

      // call callback with the transport object
      contentCb(new Transport('content', fileContents), options);

      return true;
    };

    return exports;
  };

}).call(this);
