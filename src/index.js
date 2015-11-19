/*! datadata.js © 2014-2015 Florian Ledermann 

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

// test whether in a browser environment
if (typeof window === 'undefined') {
    // node
    var d3dsv = require('d3-dsv');
    var fs = require('fs');
    
    var fileparser = function(func) {
        return function(path, row, callback) {
            if (dd.isUndefined(callback)) {
                callback = row;
                row = null;
            }
            fs.readFile(path, 'utf8', function(error, data) {
                if (error) return callback(error);
                data = func(data, row);
                callback(null,data);
            });
        };
    };
    
    var d3 = {
        csv: fileparser(d3dsv.csv.parse),
        tsv: fileparser(d3dsv.tsv.parse),
        json: fileparser(JSON.parse)
    };

} else {
    // browser
    // we expect global d3 to be available
    var d3 = window.d3;
}


function rowFileHandler(loader) {
    // TODO: file handler API should not need to be passed map, reduce functions but be wrapped externally
    return function(path, map, reduce, options) {
    
        options = dd.merge({
            // default accessor function tries to convert number-like strings to numbers
            accessor: function(d) {
                var keys = Object.keys(d);
                for (var i=0; i<keys.length; i++) {
                    var key = keys[i],
                        val = d[key];
                    // CSV doesn't support specification of null values
                    // interpret empty field values as missing
                    if (val === "") {
                        d[key] = null;
                    }
                    else if (dd.isNumeric(val)) {
                        // unary + converts both ints and floats correctly
                        d[key] = +val;
                    }
                }
                return d;
            }
        }, options);
        
        return new Promise(function(resolve, reject) {
            loader(path, options.accessor,
                function(error, data) {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(dd.mapreduce(data, map, reduce));                    
                }
            );
        }); 
    };
}

function jsonFileHandler(path, map, reduce) {
    return new Promise(function(resolve, reject) {
        d3.json(path, function(error, data) {
            if (error) {
                reject(error);
                return;
            }
                                
            if (dd.isArray(data)) {
                resolve(dd.mapreduce(data, map, reduce));
            }
            else {
                // object - treat entries as keys by default
                var keys = Object.keys(data);
                var map_func;
                if (!map) {
                    // use keys as data to emit key/data pairs in map step!
                    map_func = dd.map.dict(data);
                }
                else {
                    map_func = function(k, emit) {
                        // put original key into object
                        var v = data[k];
                        v.__key__ = k;
                        // call user-provided map funtion with object
                        map(v, emit);
                    };
                }
                resolve(dd.mapreduce(keys, map_func, reduce));
            }                    
        });
    });
}

var fileHandlers = {
    'csv':  rowFileHandler(d3.csv),
    'tsv':  rowFileHandler(d3.tsv),
    'json': jsonFileHandler
};

var getFileHandler = function(pathOrExt) {
    // guess type
    var ext = pathOrExt.split('.').pop().toLowerCase();
    return fileHandlers[ext] || null;
};

var registerFileHandler = function(ext, handler) {
    fileHandlers[ext] = handler;
};

// TODO: register .topojson, .geojson in mapmap.js

/**
Datadata - a module for loading and processing data.
You can call the module as a function to create a promise for data from a URL, Function or Array. 
Returns a promise for data for everything.
@param {(string|function|Array)} spec - A String (URL), Function or Array of data.
@param {(function|string)} [map={@link datadata.map.dict}]  - The map function for map/reduce.
@param {(string)} [reduce=datadata.emit.last] - The reduce function for map/reduce.
@exports module:datadata
*/
var dd = function(spec, map, reduce, options) {

    // options
    // type: override file extension, e.g. for API urls (e.g. 'csv')
    // fileHandler: manually specify file handler to be used to load & parse file
    options = options || {};

    if (spec == null) throw new Error("datadata.js: No data specification.");
        
    if (map && !dd.isFunction(map)) {
        // map is string -> map to attribute value
        map = dd.map.key(map);
    }
    
    if (dd.isString(spec)) {
        // consider spec to be a URL/file to load
        var handler = options.fileHandler || getFileHandler(options.type || spec);
        if (handler) {
            return handler(spec, map, reduce, options);
        }
        else {
            throw new Error("datadata.js: Unknown file type for: " + spec);
        }
    }
    if (dd.isArray(spec)) {
        return new Promise(function(resolve, reject) {
            resolve(dd.mapreduce(spec, map, reduce));
        });
    }
    throw new Error("datadata.js: Unknown data specification.");
};

// expose registration method & rowFileHandler helper
dd.registerFileHandler = registerFileHandler;
dd.rowFileHandler = rowFileHandler;

// simple load function, returns a promise for data without map/reduce-ing
// DO NOT USE - present only for mapmap.js legacy reasons
dd.load = function(spec, key) {
    if (spec.then && typeof spec.then === 'function') {
        // already a thenable / promise
        return spec;
    }
    else if (dd.isString(spec)) {
        // consider spec to be a URL to load
        // guess type
        var ext = spec.split('.').pop();
        if (ext == 'json' || ext == 'topojson' || ext == 'geojson') {
            return new Promise(function(resolve, reject) {
                d3.json(spec, function(error, data) {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(data);
                });
            });
        }
        else {
            console.warn("Unknown extension: " + ext);
        }
    }
};


// Type checking
/**
Return true if argument is a string.
@param {any} val - The value to check.
*/
dd.isString = function (val) {
  return Object.prototype.toString.call(val) == '[object String]';
};
/**
Return true if argument is a function.
@param {any} val - The value to check.
*/
dd.isFunction = function(obj) {
    return (typeof obj === 'function');
};
/**
Return true if argument is an Array.
@param {any} val - The value to check.
*/
dd.isArray = function(obj) {
    return (obj instanceof Array);
};
/**
Return true if argument is an Object, but not an Array, String or anything created with a custom constructor.
@param {any} val - The value to check.
*/
dd.isDictionary = function(obj) {
    return (obj && obj.constructor && obj.constructor === Object);
};
/**
Return true if argument is undefined.
@param {any} val - The value to check.
*/
dd.isUndefined = function(obj) {
    return (typeof obj == 'undefined');
};
/**
Return true if argument is a number or a string that strictly looks like a number.
This method is stricter than +val or parseInt(val) as it doesn't validate the empty
string or strings contining any non-numeric characters. 
@param {any} val - The value to check.
*/
dd.isNumeric = function(val) {
    // check if string looks like a number
    // +"" => 0
    // parseInt("") => NaN
    // parseInt("123OK") => 123
    // +"123OK" => NaN
    // so we need to pass both to be strict
    return !isNaN(+val) && !isNaN(parseFloat(val));
}

// Type conversion / utilities
/**
If the argument is already an Array, return a copy of the Array.
Else, return a single-element Array containing the argument.
*/
dd.toArray = function(val) {
    if (!val) return [];
    // return a copy if aready array, else single-element array
    return dd.isArray(val) ? val.slice() : [val];
};

/**
Shallow object merging, mainly for options. Returns a new object.
*/
dd.merge = function() {
    var obj = {};

    for (var i = 0; i < arguments.length; i++) {
        var src = arguments[i];
        
        for (var key in src) {
            if (src.hasOwnProperty(key)) {
                obj[key] = src[key];
            }
        }
    }

    return obj;
};

/**
Return an {@link module:datadata.OrderedHash|OrderedHash} object.
@exports module:datadata.OrderedHash
*/
dd.OrderedHash = function() {
    // ordered hash implementation
    var keys = [];
    var vals = {};
    
    return {
        /**
        Add a key/value pair to the end of the OrderedHash.
        @param {String} k - Key
        @param v - Value
        */
        push: function(k,v) {
            if (!vals[k]) keys.push(k);
            vals[k] = v;
        },
        /**
        Insert a key/value pair at the specified position.
        @param {Number} i - Index to insert value at
        @param {String} k - Key
        @param v - Value
        */
        insert: function(i,k,v) {
            if (!vals[k]) {
                keys.splice(i,0,k);
                vals[k] = v;
            }
        },
        /**
        Return the value for specified key.
        @param {String} k - Key
        */
        get: function(k) {
            // string -> key
            return vals[k];
        },
        /**
        Return the value at specified index position.
        @param {String} i - Index
        */
        at: function(i) {
            // number -> nth object
            return vals[keys[i]];
        },
        length: function(){return keys.length;},
        keys: function(){return keys;},
        key: function(i) {return keys[i];},
        values: function() {
            return keys.map(function(key){return vals[key];});
        },
        map: function(func) {
            return keys.map(function(k){return func(k, vals[k]);});
        },
        unsorted_dict: function() {
            return vals;
        }
    };
};

// Utility functions for map/reduce
dd.map = {
    key: function(attr, remap) {
        return function(d, emit) {
            var key = d[attr];
            if (remap && remap[key] !== undefined) {
                key = remap[key];
            }
            emit(key, d);
        };
    },
    dict: function(dict) {
        return function(d, emit) {
            emit(d, dict[d]);
        };
    }
};
dd.emit = {
    ident: function() {
        return function(key, values, emit) {
            emit(key, values);
        };
    },
    first: function() {
        return function(key, values, emit) {
            emit(key, values[0]);
        };
    },
    last: function() {
        return function(key, values, emit) {
            emit(key, values[values.length - 1]);
        };
    },
    merge: function() {
        return function(key, values, emit) {
            var obj = values.reduce(function(prev, curr) {
                var keys = Object.keys(curr);
                for (var i=0; i<keys.length; i++) {
                    var k = keys[i];
                    prev[k] = curr[k];
                }
                return prev;
            });
            
            emit(key, obj);
        };
    },
    toAttr: function(attr, func) {
        func = func || dd.emit.last();
        return function(key, values, emit) {
            func(key, values, function(k, v) {
                var obj = {};
                obj[attr] = v;
                emit(k, obj);
            });
        };
    },
    sum: function(include, exclude) {
        include = wildcards(include || '*');
        exclude = wildcards(exclude);       

        return function(key, values, emit) {
            var obj = values.reduce(function(prev, curr) {
                var keys = Object.keys(curr);
                for (var i=0; i<keys.length; i++) {
                    var key = keys[i],
                        doAdd = false,
                        j;
                    
                    for (j=0; j<include.length; j++) {
                        if (key.search(include[i]) > -1) {
                            doAdd = true;
                            break;
                        }
                    }
                    for (j=0; j<exclude.length; j++) {
                        if (key.search(include[j]) > -1) {
                            doAdd = false;
                            break;
                        }
                    }
                    if (doAdd && prev[key] && curr[key] && !isNaN(prev[key]) && !isNaN(curr[key])) {
                        prev[key] = prev[key] + curr[key];
                    }
                    else {
                        prev[key] = curr[key];
                        if (doAdd) {
                            console.warn("datadata.emit.sum(): Cannot add keys " + key + "!");
                        }
                    }
                }
                return prev;
            });
            
            emit(key, obj);
        };
    }
};

dd.map.geo = {
    point: function(latProp, lonProp, keyProp) {
        var id = 0;
        return function(d, emit) {
            var key = keyProp ? d[keyProp] : id++;
            emit(key, dd.geo.Point(d[lonProp], d[latProp], d));
        };
    }
};

dd.emit.geo = {
    segments: function() {
        return function(key, data, emit) {
            var prev = null, cur = null;
            for (var i=0; i<data.length; i++) {
                cur = data[i];
                if (prev) {
                    emit(key + '-' + i, dd.geo.LineString([[prev.lon,prev.lat],[cur.lon,cur.lat]], prev));
                }
                prev = cur;
            }
        };
    }
};

// constructors for GeoJSON objects
dd.geo = {
    Point: function(lon, lat, properties) {
        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [lon, lat]
            },
            properties: properties
        };
    },
    LineString: function(coordinates, properties) {
        return {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: coordinates
            },
            properties: properties
        };
    }
};

function wildcards(spec) {
    spec = dd.toArray(spec);
    for (var i=0; i<spec.length; i++) {
        if (!(spec[i] instanceof RegExp)) {
            spec[i] = new RegExp('^' + spec[i].replace('*','.*').replace('?','.'));
        }
    }
    return spec;
}

// https://code.google.com/p/mapreduce-js/
// Mozilla Public License
dd.mapreduce = function (data, map, reduce) {
	var mapResult = [],
        reduceResult = dd.OrderedHash(),
        reduceKey;
	
    reduce = reduce || dd.emit.last(); // default
    
	var mapEmit = function(key, value) {
        if (key == null) return; // do not emit if key is null or undefined
		if(!mapResult[key]) {
			mapResult[key] = [];
		}
		mapResult[key].push(value);
	};
	
	var reduceEmit = function(key, value) {
		reduceResult.push(key, value);
	};
	
	for(var i = 0; i < data.length; i++) {
		map(data[i], mapEmit);
	}
	
	for(reduceKey in mapResult) {
		reduce(reduceKey, mapResult[reduceKey], reduceEmit);
	}
	
	return reduceResult;
};

dd.mapreducer = function(map, reduce) {
    return function(data) {
        dd.mapreduce(data, map, reduce);
    };
};
// Helper functions for map etc.

// put 'd' in another object using the attribute 'key'
// optional 'pull' is the name of a key to leave on the top level 
dd.envelope = function(key, pull, func) {
    return function(d) {
        if (pull && typeof pull == 'function') {
            // envelope(key, func) case
            func = pull;
            pull = null;
        }
        if (func) d = func(d);
        var val = {};
        val[key] = d;
        if (pull) {
            val[pull] = d[pull];
            delete d[pull];
        }
        return val;
    };
};
dd.prefix = function(prefix, func) {
    return function(d) {
    
        if (func) d = func(d);
    
        var val = {},
            keys = Object.keys(d);
            
        for (var i=0; i<keys.length; i++) {
            val[prefix + keys[i]] = d[keys[i]];
        }
            
        return val;
    };
};
dd.prefix_attr = function(attr, func) {
    return function(d) {
    
        if (func) d = func(d);
    
        var val = {},
            keys = Object.keys(d),
            prefix = d[attr] ? d[attr] + '_' : '';
            
        for (var i=0; i<keys.length; i++) {
            val[prefix + keys[i]] = d[keys[i]];
        }
            
        return val;
    };
};
dd.map_attr = function(map, func) {
    return function(d) {
    
        if (func) d = func(d);
    
        if (typeof map == 'function') {
            d = map(d);
        }
        else {
            var keys = Object.keys(map);
            for (var i=0; i<keys.length; i++) {
                var key = keys[i];
                var val = map[key];
                if (typeof val == 'function') {
                    d[key] = val(d);
                }
                else if (d[val]) {
                    d[key] = d[val];
                    delete d[val];
                }
            }
        }
            
        return d;
    };
};
dd.reverse = function(data) {
    if (data.slice && typeof data.slice == 'function') {
        // slice() = copy
        return data.slice().reverse(); 
    }
    return data;
};

module.exports = dd;
