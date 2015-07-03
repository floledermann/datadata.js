var dd = require('../src/index.js');
var assert = require('assert');

describe("OrderedHash", function() {
    
    var hash;
    
    beforeEach(function() {
        hash = dd.OrderedHash();
    });
    
    describe("isUndefined", function() {
        it("should be empty after initialization", function() {
            assert( hash.length() == 0 );
            assert( hash.keys().length == 0 );
            assert( hash.values().length == 0 );
            assert( Object.keys(hash.unsorted_dict()).length == 0 );
        });
    });
});