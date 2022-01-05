import gulpSort from 'gulp-sort'
import stable from 'stable'
import path from 'path'
import Configuration from '../Configuration'

export default function (): NodeJS.ReadWriteStream {
    return gulpSort({
        customSortFn(files) {
            return stable(files, (a, b) => {
                const arr1 = path.relative(Configuration("cwd"), a.path).split('').map(e => e.charCodeAt(0))
                const arr2 = path.relative(Configuration("cwd"), b.path).split('').map(e => e.charCodeAt(0))
                // tslint:disable-next-line:forin
                for (const item in arr1) {
                    if (arr1[item] === 92 && arr2[item] !== 92) {
                        return -1
                    }
                    if (arr1[item] !== 92 && arr2[item] === 92) {
                        return 1
                    }
                    if (arr1[item] === arr2[item]) {
                        continue
                    }
                    return arr1[item] > arr2[item] ? 1 : -1
                }
                return 1
            })
        }
    })
}