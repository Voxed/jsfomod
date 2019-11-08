const assert = require('assert')
const { Parser } = require('../src/jsfomod') 
const parser = new Parser()
describe('Parser', function() {
    describe('#parse()', function() {
        describe('with existing fomod config', function() { 
            it('should parse without errors assuming the FOMOD exists', function() {
                //console.log(Parser)
                //console.log(arguments[0])
                parser.parse(process.env.FOMOD)
            })
        })
    })
})
