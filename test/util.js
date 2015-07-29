var dd = require('../src/index.js');
var assert = require('assert');

describe("Utilities", function() {
    
    describe("merge", function() {
        it("should return new object", function() {
            var obj = {};
            var merged = dd.merge(obj);
            assert.equal( Object.keys(merged).length, 0 );
            assert( merged !== obj);
        });
        it("should merge properties left to right", function() {
            var merged = dd.merge({a:'1',b:'1'},{b:'2',c:'2'});
            assert.equal( Object.keys(merged).length, 3 );
            assert.equal( merged.a, '1' );
            assert.equal( merged.b, '2' );
            assert.equal( merged.c, '2' );
        });
    });
});