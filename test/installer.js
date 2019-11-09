const assert = require('assert')
const { Installer, Parser } = require('../src/jsfomod') 
const parser = new Parser()
describe('Installer', function() {
    describe('#constructor()', function() {
        describe('with existing fomod config', function() { 
            it('should create an installer object', function() {
                let installer = new Installer(parser.parse(process.env.FOMOD), process.env.FOMOD)
                let page = installer.next()
                page = installer.next([page.groups[0].options[1]])
                page = installer.previous()
            })
        })
    })
})
