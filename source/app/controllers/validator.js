/**
 * @author Sallar Kaboli <sallar.kaboli@gmail.com>
 * @date 8/27/15.
 */
(function(module) {
    "use strict";

    /* Dependencies */
    var path      = require('path'),
        _         = require('lodash'),
        cld       = require('cld'),
        APP_PATH  = path.resolve(__dirname, '../../'),
        config    = require('../config'),
        users     = require(APP_PATH + '/' + config.usersFile),
        strings   = require(APP_PATH + '/' + config.stringsFile);

    /* Private Methods */
    /**
     * Filter Statuses
     * @param statuses
     * @returns {Promise}
     */
    function filter(statuses) {
        // Return a new promise
        return new Promise(function(resolve) {
            filterRetweeted(statuses)   // Filter out low retweet counts
                .then(filterLanguages)  // Make sure the language is correct
                .then(filterUsers)      // Filter out banned users
                .then(filterStrings)    // Filter out banned strings
                .then(filterKeys)       // Remove extra keys
                .then(resolve);         // Resolve and send back to main program
        });
    }

    /**
     * If a tweet is already retweeted, skip.
     * @param statuses
     * @returns {Promise}
     */
    function filterRetweeted(statuses) {
        return new Promise(function(resolve) {
            resolve(statuses.filter(function(status) {
                return (status.retweeted === false && status.retweet_count >= config.minRetweetCount);
            }));
        });
    }

    /**
     * Filter statuses array based on language criteria
     * @param statuses
     * @returns {Promise}
     */
    function filterLanguages(statuses) {
        return new Promise(function(resolve) {
            // Map statuses to a detector Promise
            statuses = statuses.map(detector);

            // Wait for all promises to be completed
            Promise.all(statuses).then(function(data) {
                // Filter errors out
                resolve(data.filter(function(status) {
                    return status !== null;
                }));
            });
        });
    }

    /**
     * Filter statuses array based on banned users
     * @param statuses
     * @returns {Promise}
     */
    function filterUsers(statuses) {
        return new Promise(function(resolve) {
            resolve(statuses.filter(function(status) {
                var len  = users.banned.length,
                    name = status.user.screen_name.toLowerCase(),
                    reg, curr;

                // Check if id_str or name are banned
                for(var i = 0; i < len; i += 1) {
                    curr = users.banned[i].toLowerCase(); // Current name
                    reg  = new RegExp('@' + curr, 'i');   // Current name as RegExp

                    // If matched, then filter it out.
                    if(curr === name || reg.test(status.text)) {
                        return false;
                    }
                }

                // Add otherwise
                return true;
            }));
        });
    }

    /**
     * Filter statuses based on banned strings
     * @param statuses
     * @returns {Promise}
     */
    function filterStrings(statuses) {
        return new Promise(function(resolve) {
            resolve(statuses.filter(function(status) {
                var len  = strings.banned.length,
                    text = status.text.toLowerCase(),
                    reg;

                // Check if id_str or name are banned
                for(var i = 0; i < len; i += 1) {
                    reg  = new RegExp(strings.banned[i].toLowerCase(), 'i'); // Current string as RegExp

                    // If matched, then filter it out.
                    if(reg.test(text)) {
                        return false;
                    }
                }

                return true;
            }));
        });
    }

    /**
     * Remove extra keys from the objects
     * @param statuses
     * @returns {Promise}
     */
    function filterKeys(statuses) {
        return new Promise(function(resolve) {
            for(var i = 0; i < statuses.length; i += 1) {
                statuses[i] = _.pick(statuses[i], config.filterKeys);
                statuses[i].retweeted = false;
            }
            resolve(statuses);
        });
    }

    /**
     * Converts array to object
     * for easier searching
     * @param a {Array}
     * @returns {object}
     */
    function oc(a) {
        var o = {};
        for(var i=0; i<a.length; i+= 1)  {
            o[a[i]]='';
        }
        return o;
    }

    /**
     * Detect Languages with Cld
     * @param status
     * @returns {Promise}
     */
    function detector(status) {
        // Detection options
        var options = {
            isHTML       : false,
            httpHint     : config.search.lang
        };

        // Return a promise
        return new Promise(function(resolve) {
            // Only run the detection if it’s enabled.
            if(config.secondaryCheck === true) {
                cld.detect(status.text, options, function (err, result) {
                    if(!err && result.languages[0].code === config.search.lang) {
                        resolve(status);
                    } else {
                        resolve(null);
                    }
                });
            } else {
                resolve(status);
            }
        });
    }

    /* Public Methods */
    module.exports = filter;
})(module);