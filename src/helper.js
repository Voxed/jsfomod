const fs = require('fs')

/**
 * Get rid of faults and annoying Windows path standards by:
 * * Replacing backslashes with forward slashes.
 * * If root is defiend searching for a path case sensitively if it doesn't exist.
 * * Removing double slashes.
 * * Remove forwardslashes at the beginning of path.
 * @param {string} path The path of which to correct.
 * @param {string} root The root of which path is relative to.
 * @returns {string} The corrected path.
 */
function correctPath(path, root) {
    // Replace backslashes with forwardslashes.
    path = path.replace(/\\/g, '/')

    // Replace multiple slashes with a single slash.
    path = path.replace(/\/\/*/g, '/')

    // If root is not undefined remove beginning slashes.
    path = path.replace(/^\/\/*/g, '')

    // Ensure root ends with a /, just eye-candy. Won't really have any
    // different outcome.
    if (root !== undefined && !root.endsWith('/'))
        root = root + '/'

    // If the path does not exist, start rebuilding it case insensitively
    if (root !== undefined && !fs.existsSync(`${root}/${path}`)) {

        // Split the path into a stack of directory/filenames.
        stack = path.split('/').reverse().filter(a => a !== '')

        // Iterate over the stack.
        current = ''
        while (stack.length > 0) {
            const top = stack.pop()

            // If file/directory exists, add it to the current path.
            if (fs.existsSync(`${root}${current}/${top}`)) {
                current = `${current}/${top}`
            } else {

                // If file/directory does not exist, iterate over files in the
                // current directory and try to find one case-insensitively.
                candidate = undefined
                if(fs.existsSync(`${root}${current}`))
                    fs.readdirSync(`${root}${current}`).forEach(f => {
                        if (f.toLowerCase() === top.toLowerCase())
                            candidate = f
                    })
                if (candidate === undefined)
                    return undefined
                else
                    current = `${current}/${candidate}`
            }
        }
        path = current
    }
    return path
}

/**
 * Walk from a directory, recursivly collecting all the file paths.
 * @param {string} directory The folder to walk from relative to root.
 * @param {string} root The root folder.
 * @returns {string[]} A list of files discovered in the walk.
 */
function walk(directory, root) {
    dir = fs.readdirSync(root + '/' + directory)
    files = []
    dir.forEach(f => {
        if(fs.lstatSync(root + '/' + directory + '/' + f).isDirectory()){
            files = files.concat(walk(directory + '/' + f, root))
        }else{
            files.push(directory + '/' + f)
        }
    })
    return files
}

module.exports = { correctPath, walk }