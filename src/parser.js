const parseXML = require('xml2js').parseString
const fs = require('fs')
const { correctPath } = require('./helper')
const {Root, Page, Group, Option, Folder, File, Pattern, Dependencies, Dependency} = require('./types')

function parseArray(list, type, ctx) {
    const l = []
    if (list !== undefined)
        list.forEach(o => l.push(ctx.parse(type, o)))
    return l
}

function copyAttributes(source, dest, attrs, mapFunction = a => a) {
    if (source.$ !== undefined)
        attrs.forEach(a => dest[a] = mapFunction(source.$[a]))
}

nodeParsers = {
    config: function (module, ctx) {
        const root = new Root()
        root.name = ctx.parse('text', module.moduleName)
        root.image = ctx.parse('image', module.moduleImage)
        root.pages = ctx.parse('steps', module.installSteps)
        root.requiredFiles = ctx.parse('files', module.requiredInstallFiles)
        root.dependencies = ctx.parse('dependencies', module.moduleDependencies)
        if (module.conditionalFileInstalls !== undefined)
            root.patterns = ctx.parse('patterns', module.conditionalFileInstalls[0].patterns)
        return root
    },
    image: (image, ctx) => correctPath(image.$.path, ctx.rootPath),
    text: (text, ctx) => text,
    steps: (stepsRaw, ctx) => parseArray(stepsRaw.installStep, 'step', ctx),
    step: function (step, ctx) {
        const page = new Page()
        copyAttributes(step, page, ['name'])
        page.groups = ctx.parse('groups', step.optionalFileGroups)
        page.dependencies = ctx.parse('dependencies', step.visible)
        return page
    },
    groups: (ofg, ctx) => parseArray(ofg.group, 'group', ctx),
    group: function (data, ctx) {
        const group = new Group()
        copyAttributes(data, group, ['name', 'type'])
        group.options = ctx.parse('options', data.plugins)
        return group
    },
    options: (data, ctx) => parseArray(data.plugin, 'option', ctx),
    option: function (data, ctx) {
        const option = new Option()
        copyAttributes(data, option, ['name'])
        option.description = ctx.parse('text', data.description)
        option.image = ctx.parse('image', data.image)
        option.type = ctx.parse('typeDescriptor', data.typeDescriptor)
        option.files = ctx.parse('files', data.files)
        option.flags = ctx.parse('flags', data.conditionFlags)
        return option
    },
    typeDescriptor: function (data, ctx) {
        if (data.type !== undefined && data.type[0].$ !== undefined)
            return data.type[0].$.name
    },
    files: (data, ctx) => parseArray(data.folder, 'folder', ctx).concat(
        parseArray(data.file, 'file', ctx)),
    file: function (data, ctx) {
        file = new File()
        copyAttributes(data, file, ['source'], a => correctPath(a, ctx.rootPath))
        copyAttributes(data, file, ['destination'], a => correctPath(a))
        copyAttributes(data, file, ['priority'])
        return file
    },
    folder: function (data, ctx) {
        folder = new Folder()
        copyAttributes(data, folder, ['source'], a => correctPath(a, ctx.rootPath))
        copyAttributes(data, folder, ['destination'], a => correctPath(a))
        copyAttributes(data, folder, ['priority'], a => parseInt(a) || undefined)
        return folder
    },
    flags: function (data, ctx) {
        const flags = {}
        if (data.flag !== undefined)
            data.flag.forEach(o => flags[o.$.name] = o._)
        return flags
    },
    patterns: (data, ctx) => parseArray(data.pattern, 'pattern', ctx),
    pattern: function (data, ctx) {
        const pattern = new Pattern()
        pattern.files = ctx.parse('files', data.files[0])
        pattern.dependencies = ctx.parse('dependencies', data.dependencies)
        return pattern
    },
    dependencies: function (data, ctx) {
        const dependencies = new Dependencies()
        copyAttributes(data, dependencies, ['operator'])
        dependencies.dependencies =
            parseArray(data.fileDependency, 'fileDependency', ctx)
            .concat(parseArray(data.flagDependency, 'flagDependency', ctx))
            .concat(parseArray(data.gameDependency, 'gameDependency', ctx))
            .concat(parseArray(data.dependencies, 'dependencies', ctx))
        return dependencies
    },
    gameDependency: function (data, ctx) {
        const dependency = new Dependency()
        dependency.type = 'game'
        copyAttributes(data, dependency, ['version'])
        return dependency
    },
    flagDependency: function (data, ctx) {
        const dependency = new Dependency()
        dependency.type = 'flag'
        copyAttributes(data, dependency, ['flag', 'value'])
        return dependency
    },
    fileDependency: function (data, ctx) {
        const dependency = new Dependency()
        dependency.type = 'file'
        copyAttributes(data, dependency, ['state'])
        copyAttributes(data, dependency, ['file'], a => correctPath(a))
        return dependency
    }
}

/**
 * Parser used to parse fomod directories into fomod root objects.
 */
class Parser {
    /**
     * Parses the fomod into a root object.
     * @param {string} path The path of the package root diretory containing the 
     * fomod folder.
     * @returns {Root} The fomod root object.
     */
    parse(path) {
        const parse = function (t, o) {
            if (o !== undefined) {
                if (o.constructor === Array && o.length === 1)
                    o = o[0]
                if (nodeParsers[t] === undefined)
                    throw new Error(`No node parser for ${t}.`)
                return nodeParsers[t](o, {
                    rootPath: path,
                    parse: parse
                })
            }
        }
        let root = undefined
        const fomod = fs.readFileSync(
            `${path}/${correctPath('/fomod/ModuleConfig.xml', path)}`)
        parseXML(fomod, (err, result) => {
            root = parse('config', result.config)
        })
        return root
    }
}

module.exports = Parser