const assert = require('assert')

describe('#correctPath', function() {
    const {correctPath} = require('../src/helper')
    describe('with a wrong case path', function() {
        it('should be able to deduce the correct path', function() {
            path = correctPath('\\\\a/very/inconsistent\\\\pathname/lawl.txt', `${__dirname}/fixtures`)
            assert.equal(path, '/A/VeRy/INCONsistent/pathNAme/LAWL.txt')
        })
    })
    describe('with a correct case path', function() {
        it('should not touch the path casing', function() {
            path = correctPath('//A/VeRy/INCONsistent\\\\pathNAme/LAWL.txt', `${__dirname}/fixtures`)
            assert.equal(path, 'A/VeRy/INCONsistent/pathNAme/LAWL.txt')
        })
    })
    describe('with a non-existent path', function() {
        it('should throw an error', function() {
            assert.throws(function() { correctPath('/A/NOPE', `${__dirname}/fixtures`) }, Error)
        })
    })
})