const { Dependencies, Dependency, Folder, File } = require('./types')
const fs = require('fs')
const { walk, correctPath } = require('./helper')

function evaluateDependencies(deps, installer) {
    const flags = installer.flags
    const gameVersion = installer.gameVersion
    const fileDependencyCallback = installer.fileDependencyCallback
    if (deps === undefined)
        return true
    if (deps.constructor === Dependencies) {
        const passes = deps.dependencies.filter(d => evaluateDependencies(d, installer))
        if (deps.operator === 'Or')
            return passes.length > 0
        else
            return passes.length === deps.dependencies.length
    } else if (deps.constructor == Dependency)
        if (deps.type === 'flag')
            return flags[deps.flag] === deps.value
        else if (deps.type === 'game')
            return deps.version === gameVersion
        else if (deps.type === 'file')
            return fileDependencyCallback(deps)
}

class CopyOnWriteInstaller {
    constructor(root, path, flags, gameVersion, fileDependencyCallback, pageIndex = -1, previousInstaller, fileMap = {}, filePriorities = {}) {
        this.root = root
        this.flags = Object.assign({}, flags)
        this.gameVersion = gameVersion
        this.path = path
        this.pageIndex = pageIndex
        this.fileDependencyCallback = fileDependencyCallback
        this.fileMap = Object.assign({}, fileMap)
        this.filePriorities = Object.assign({}, filePriorities)
        this.previousInstaller = previousInstaller
    }

    installRequired() {
        this.installFiles(this.root.requiredFiles)
    }

    next(selectedOptions = []) {
        const installer = new CopyOnWriteInstaller(
            this.root, this.path, this.flags, this.gameVersion,
            this.fileDependencyCallback, this.pageIndex + 1, this, this.fileMap,
            this.filePriorities)
        selectedOptions.forEach(o => {
            if (o.flags !== undefined)
                for (const f in o.flags)
                    installer.flags[f] = o.flags[f]
            if (o.files !== undefined)
                installer.installFiles(o.files)
        })
        const page = this.root.pages[this.pageIndex + 1]
        if (page !== undefined) {
            if (!evaluateDependencies(page.dependencies, installer))
                return installer.next([])
        } else if (this.root.patterns !== undefined)
            this.root.patterns.forEach(pattern => {
                if (evaluateDependencies(pattern.dependencies, installer))
                    installer.installFiles(pattern.files)
            })
        return installer
    }

    installFiles(files) {
        if (files != undefined)
            files.forEach(f => {
                if (f.constructor === Folder) {
                    files = walk('', this.path + "/" + f.source).map(p => {
                        const nf = new File()
                        nf.source = correctPath(f.source + '/' + p)
                        nf.destination = correctPath(f.destination + '/' + p)
                        nf.priority = f.priority
                        return nf
                    })
                    this.installFiles(files)
                } else if (f.constructor === File)
                    this.installFile(f)
            })
    }

    installFile(f) {
        let match = this.filePriorities[f.destination] !== undefined ? f.destination : undefined
        if (match === undefined)
            for (const d in this.filePriorities)
                if (d.toLowerCase() === f.destination.toLowerCase()) {
                    match = d
                    break
                }
        if (match === undefined)
            match = f.destination
        if (this.filePriorities[match] !== undefined)
            if (f.priority === undefined || f.priority < this.filePriorities[match])
                return
        this.filePriorities[match] = f.priority
        this.fileMap[match] = f.source
    }
}

/**
 * The installer class, wraps a parsed fomod package in order to provide a
 * neat installer backend.
 */
class Installer {
    /**
     * Create a fomod installer.
     * @param {Root} root The fomod root object to install.
     * @param {string} path The fomod root folder.
     * @param {string} gameVersion The game version.
     * @param {(dependency: Dependency) => boolean} fileDependencyCallback The
     * file dependency callback, should return true if the dependency is met.
     */
    constructor(root, path, flags = {}, gameVersion = undefined, fileDependencyCallback = dep => true) {
        this.installer = new CopyOnWriteInstaller(root, path, flags, gameVersion, fileDependencyCallback)
        this.installer.installFiles(this.installer.root.requiredFiles)
    }

    /**
     * Returns the name of the module.
     * @returns {string} The name of the module
     */
    getName() {
        return this.installer.root.name
    }

    /**
     * Returns the fomod root path (with the fomod directory inside).
     * @returns {string} The path of the fomod.
     */
    getPath() {
        return this.installer.path
    }

    /**
     * Returns the image of the module.
     * @returns {string} The path of the image. (undefined if there is no image)
     */
    getImage() {
        return this.getPath() + '/' + this.installer.root.image
    }

    hasNext() {
        return this.installer.root.pages.length > this.installer.pageIndex + 1
    }

    hasPrevious() {
        return this.installer.pageIndex > 0
    }

    /**
     * @returns {boolean} True if the fomod module passed the dependency test.
     */
    isValid() {
        return evaluateDependencies(this.installer.root.dependencies,
            this.installer)
    }

    /**
     * Revert to previous step or keep current state if no previous step exists
     * called.
     * @returns {Page} The current page of the installer.
     */
    previous() {
        if (this.installer.previousInstaller !== undefined)
            this.installer = this.installer.previousInstaller
        return this.installer.root.pages[this.installer.pageIndex]
    }

    /**
     * Return a map of file destinations and sources.
     * @returns {{}} A map of file destinations and sources.
     */
    files() {
        return this.installer.fileMap
    }

    /**
     * Advances the installer to the next step, applies flags and files.
     * @param {Option[]} selectedOptions An array of selected options from
     * previous step.
     * @returns {Page} The current page of the installer.
     */
    next(selectedOptions = []) {
        this.installer = this.installer.next(selectedOptions)
        return this.installer.root.pages[this.installer.pageIndex]
    }
}

module.exports = Installer