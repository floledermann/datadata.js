var assert = require('assert');
var mockery = require('mockery');

// mock filesystem *before* loading dd library which requires it
mockery.registerMock('fs', {
    readFile: function(path, encoding, callback) {
        switch (path) {
            case 'data.csv': callback(null, 'first,second,third\n1,1,1\n2,2,2'); break;
            case 'data.tsv': callback(null, 'first\tsecond\tthird\n1\t1\t1\n2\t2\t2'); break;
            case 'data.xsv': callback(null, 'first;second;third\n1;1;1\n2;2;2'); break;
            default:
                callback(new Error('File not found: ' + path));
        }
    }
});

mockery.enable({
    warnOnUnregistered: false
});
var dd = require('../src/index.js');
mockery.disable();



describe("Loading", function() {    
    describe("Unknown/invalid formats", function() {
        it("should raise Exception on undefined or invalid spec", function() {
            // we cannot call function directly, so use bind as a shortcut for defining anonymous inline function
            // http://stackoverflow.com/a/31263976/171579
            assert.throws(dd.bind(null), /No data specification/);
            assert.throws(dd.bind(null, null), /No data specification/);
            assert.throws(dd.bind(null, function(){}), /Unknown data specification/);
        });
        it("should raise Exception on unknown format", function() {
            assert.throws(dd.bind(null, 'data.xyz'), /Unknown file type/);
        });
    });
    describe("Default formats", function() {
        it("should recognize CSV Files", function() {
            assert(dd('data.csv') instanceof Promise);
            assert(dd('data.CSV') instanceof Promise);
            assert(dd('data.CsV') instanceof Promise);
        });
        it("should allow overriding format", function() {
            assert(dd('data',null,null,{type:'csv'}) instanceof Promise);
        });
        it("should handle CSV Data", function(done) {
            dd('data.csv','first').then(function dataLoaded(data){
                assert(data);
                assert.equal(data.length(), 2);
                assert.equal(data.at(0).first, '1');
                done();
            }, done)
            .catch(done);
        });
        it("should handle TSV Data", function(done) {
            // this doesn't make sense, however we want to test overriding file type
            dd('data.tsv','first').then(function dataLoaded(data){
                assert(data);
                assert.equal(data.length(), 2);
                assert.equal(data.at(0).first, '1');
                done();
            }, done)
            .catch(done);
        });
        it("should convert strings to numbers with default accessor", function(done) {
            dd('data.csv','first').then(function dataLoaded(data){
                assert.strictEqual(data.at(0).first, 1);
                assert.notStrictEqual(data.at(0).first, '1');
                done();
            }, done)
            .catch(done);
        });
        it("should not convert strings to numbers with custom accessor", function(done) {
            dd('data.csv','first',null,{accessor:null}).then(function dataLoaded(data){
                assert.strictEqual(data.at(0).first, '1');
                assert.notStrictEqual(data.at(0).first, 1);
                done();
            }, done)
            .catch(done);
        });
        it("should correctly apply accessor", function(done) {
            dd('data.csv','one',null,{
                accessor:function(d) {
                    return {
                        one: +d.first,
                        two: d.second,
                        three: d.third
                    }
                }
            }).then(function dataLoaded(data){
                assert.strictEqual(data.at(0).one, 1);
                assert.strictEqual(data.at(0).two, '1');
                assert.strictEqual(data.at(0).three, '1');
                assert.strictEqual(data.at(0).first, undefined);
                done();
            }, done)
            .catch(done);
        });
        it("should use custom file handler", function(done) {
            var d3dsv = require('d3-dsv');
            mockery.enable();
            var fs = require('fs');
            mockery.disable();
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
            dd('data.xsv','first',null,{
                fileHandler: dd.rowFileHandler(fileparser(d3dsv.dsv(';').parse))
            }).then(function dataLoaded(data){
                assert.strictEqual(data.at(0).first, 1);
                done();
            }, done)
            .catch(done);
        });
    });
});