const assert = require('assert')
const { Installer, Parser } = require('../src/jsfomod') 
const parser = new Parser()
describe('Installer', function() {
    describe('#constructor()', function() {
        describe('with existing fomod config', function() { 
            it('should create an installer object', function() {
                let installer = new Installer(parser.parse(process.env.FOMOD), process.env.FOMOD)
            })
        })
    })
})
