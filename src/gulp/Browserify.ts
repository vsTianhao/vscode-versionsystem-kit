import bresolve from 'browser-resolve'
import path from 'path'
import events from 'events'
import through from 'through2'
import splicer from 'labeled-stream-splicer'
import mdeps from 'module-deps'
import depsSort from 'deps-sort'
import stream from 'stream'

class Browserify extends events.EventEmitter {

	/**
	 * opts 
	 * 	- entries
	 *	- basedir
	 */
	constructor(param) {
		super()

		const opts = param
		if (opts.basedir !== undefined && typeof opts.basedir !== 'string') {
			throw new Error('opts.basedir must be either undefined or a string.')
		}

		opts.dedupe = true

		this._ignore = []
		this._expose = {}
		this._pending = 0
		this._entryOrder = 0
		this._bresolve = bresolve

		this.pipeline = this._createPipeline(opts)

		const eArr: string = []
		eArr.concat(opts.entries).filter(Boolean).forEach((file) => {
			this.add(file, { basedir: opts.basedir })
		})

	}

	bundle(): void {
		this.pipeline.end()
		return this.pipeline
	}

	add(file, opts): void {
		if (!opts) opts = {}
		if (Array.isArray(file)) {
			file.forEach((x) => { this.add(x, opts) })
			return this
		}
		return this.require(file, Object.assign({ entry: true, expose: false }, opts))
	}

	require(file, opts): void {
		if (Array.isArray(file)) {
			file.forEach((x) => {
				if (typeof x === 'object') {
					this.require(x.file, Object.assign(opts, x))
				} else this.require(x, opts)
			})
			return this
		}

		if (!opts) opts = {}
		const basedir = opts.basedir
		const expose = opts.expose

		const row = Object.assign(opts, { file: path.resolve(basedir, file) })

		if (!row.id) {
			row.id = expose || row.file
		}
		if (expose || !row.entry) {
			// Make this available to mdeps so that it can assign the value when it
			// resolves the pathname.
			row.expose = row.id
		}

		if (opts.external) return this.external(file, opts)
		if (row.entry === undefined) row.entry = false

		if (!row.entry && this._options.exports === undefined) {
			this._bpack.hasExports = true
		}

		if (row.entry) row.order = this._entryOrder++

		this.pipeline.write(row)
		return this
	}

	_createPipeline(opts): void {
		if (!opts) opts = {}
		this._bpack = this.bpack()
		this._mdeps = this._createDeps(opts)
		this._mdeps.on('file', (file, id) => {
			this.pipeline.emit('file', file, id)
			this.emit('file', file, id)
		})
		this._mdeps.on('package', (pkg) => {
			this.pipeline.emit('package', pkg)
			this.emit('package', pkg)
		})
		this._mdeps.on('transform', (tr, file) => {
			this.pipeline.emit('transform', tr, file)
			this.emit('transform', tr, file)
		})

		const pipeline = splicer.obj([
			'deps', [this._mdeps],
			'sort', [depsSort({ index: true, dedupe: true, expose: {} })],
			'label', [this._label()],
			'pack', [this._bpack],
			'wrap', []
		])
		return pipeline
	}

	_createDeps(opts): void {
		const mopts = Object.assign({}, opts)
		const basedir = opts.basedir
		// Let mdeps populate these values since it will be resolving file paths
		// anyway.
		mopts.expose = this._expose
		mopts.extensions = ['.js', '.json'].concat(mopts.extensions || [])
		this._extensions = mopts.extensions

		mopts.transform = []
		mopts.transformKey = ['browserify', 'transform']
		mopts.postFilter = (id, file, pkg): boolean => {
			if (opts.postFilter && !opts.postFilter(id, file, pkg)) return false

			//filter transforms on module dependencies
			if (pkg && pkg.browserify && pkg.browserify.transform) {
				//In edge cases it may be a string
				pkg.browserify.transform = [].concat(pkg.browserify.transform)
					.filter(Boolean)
					.filter(this._filterTransform)
			}
			return true
		}
		mopts.filter = (id): boolean => {
			if (opts.filter && !opts.filter(id)) return false
			return true
		}
		mopts.resolve = (id, parent, cb): void => {
			this._bresolve(id, parent, (err, file, pkg) => {

				if (err) cb(err, file, pkg)
				else if (file) {
					if (opts.preserveSymlinks && parent.id !== this._mdeps.top.id) {
						return cb(err, path.resolve(file), pkg, file)
					}

					cb(err, file, pkg, file)
				} else cb(err, null, pkg)
			})
		}

		mopts.modules = {}

		mopts.globalTransform = []

		const no = [].concat(opts.noParse).filter(Boolean)
		const absno = no.filter(function (x) {
			return typeof x === 'string'
		}).map(function (x) {
			return path.resolve(basedir, x)
		})
		if (!this._bundled) {
			this.once('bundle', () => {
				this.pipeline.write({
					transform: function (file): stream.Transform {
						if (opts.detectGlobals === false) return through()
						if (opts.noParse === true) return through()
						if (no.indexOf(file) >= 0) return through()
						if (absno.indexOf(file) >= 0) return through()
					},
					global: true,
					options: {}
				})
			})
		}

		return mdeps(mopts)
	}

	_label(): stream.Transform {
		const self = this
		return through.obj(function (row, enc, next) {
			const prev = row.id

			if (row.index) row.id = row.index

			self.emit('label', prev, row.id)
			if (row.indexDeps) row.deps = row.indexDeps || {}

			if (row.entry || row.expose) {
				self._bpack.standaloneModule = row.id
			}
			this.push(row)
			next()
		})
	}

	bpack(): void {
		const parser = through.obj()
		const stream = through.obj(
			function (buf, enc, next) {
				parser.write(buf)
				next()
			},
			function () { parser.end() }
		)
		let first = true
		let entries = []
		const prelude = `(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()`


		const write = function (row, enc, next): void {
			if (first) stream.push(Buffer.from(prelude + '({', 'utf8'))

			const wrappedSource = [
				(first ? '' : ','),
				JSON.stringify(row.id),
				':[',
				'function(require,module,exports){\n',
				row.source,
				'\n},',
				'{' + Object.keys(row.deps || {}).sort().map(function (key) {
					return JSON.stringify(key) + ':'
						+ JSON.stringify(row.deps[key])
				}).join(',') + '}',
				']'
			].join('')

			stream.push(Buffer.from(wrappedSource, 'utf8'))

			first = false
			if (row.entry && row.order !== undefined) {
				entries[row.order] = row.id
			} else if (row.entry) entries.push(row.id)
			next()
		}

		const end = function (): void {
			if (first) stream.push(Buffer.from(prelude + '({', 'utf8'))
			entries = entries.filter(function (x) { return x !== undefined })
			stream.push(
				Buffer.from('},{},' + JSON.stringify(entries) + ')', 'utf8')
			)
			stream.push(Buffer.from(';\n', 'utf8'))
			stream.push(null)
		}

		parser.pipe(through.obj(write, end))

		return stream
	}

}

export default Browserify
