var dd = require('../src/index.js');
var assert = require('assert');

describe("Types", function() {
    describe(".isString()", function() {
        it("should return true for Strings", function() {
            assert( dd.isString( ''  ));
            assert( dd.isString( ' ' ));
        });
        it("should return false for non-Strings", function() {
            assert(!dd.isString(     ));
            assert(!dd.isString( null ));
            assert(!dd.isString( []  ));
            assert(!dd.isString( {}  ));
            assert(!dd.isString( 0   ));
            assert(!dd.isString( 1   ));
            assert(!dd.isString( function(){} ));
        });
    });
    describe(".isFunction()", function() {
        it("should return true for Functions", function() {
            assert( dd.isFunction( function(){} ));
            assert( dd.isFunction( assert ));
        });
        it("should return false for non-Functions", function() {
            assert(!dd.isFunction(     ));
            assert(!dd.isFunction( null ));
            assert(!dd.isFunction( '' ));
            assert(!dd.isFunction( ' ' ));
            assert(!dd.isFunction( []  ));
            assert(!dd.isFunction( {}  ));
            assert(!dd.isFunction( 0   ));
            assert(!dd.isFunction( 1   ));
        });
    });
    describe(".isArray()", function() {
        it("should return true for Arrays", function() {
            assert( dd.isArray( [] ));
            assert( dd.isArray( [0] ));
            assert( dd.isArray( [0,1] ));
            assert( dd.isArray( [[]] ));
            assert( dd.isArray( [[],[]] ));
        });
        it("should return false for non-Arrays", function() {
            assert(!dd.isArray(     ));
            assert(!dd.isArray( null ));
            assert(!dd.isArray( '' ));
            assert(!dd.isArray( ' ' ));
            assert(!dd.isArray( {}  ));
            assert(!dd.isArray( 0   ));
            assert(!dd.isArray( 1   ));
            assert(!dd.isArray( function(){} ));
        });
    });
    describe(".isDictionary()", function() {
        it("should return true for plain objects", function() {
            assert( dd.isDictionary( {} ));
            assert( dd.isDictionary( {foo:'bar'} ));
            assert( dd.isDictionary( new Object() ));
        });
        it("should return false for non-Objects and constructor objects", function() {
            assert(!dd.isDictionary(     ));
            assert(!dd.isDictionary( null ));
            assert(!dd.isDictionary( '' ));
            assert(!dd.isDictionary( ' ' ));
            assert(!dd.isDictionary( []  ));
            assert(!dd.isDictionary( 0   ));
            assert(!dd.isDictionary( 1   ));
            assert(!dd.isDictionary( function(){} ));
            
            assert(!dd.isDictionary( new (function(){})() ));
        });
    });
    describe(".isUndefined()", function() {
        it("should return true for undefined", function() {
            assert( dd.isUndefined(  ));
            assert( dd.isUndefined( undefined ));
        });
        it("should return false for non-Objects and constructor objects", function() {
            assert(!dd.isUndefined( null ));
            assert(!dd.isUndefined( '' ));
            assert(!dd.isUndefined( ' ' ));
            assert(!dd.isUndefined( []  ));
            assert(!dd.isUndefined( {}  ));
            assert(!dd.isUndefined( 0   ));
            assert(!dd.isUndefined( 1   ));
            assert(!dd.isUndefined( function(){} ));
        });
    });
});