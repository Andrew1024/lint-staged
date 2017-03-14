import mockFn from 'execa'
import isPromise from 'is-promise'
import runScript from '../src/runScript'

expect.extend({
    toBeAPromise(received) {
        const pass = isPromise(received)
        return {
            message: () => (`expected ${ received } ${ pass ? 'not' : '' } to be a Promise`),
            pass
        }
    }
})
jest.mock('execa')

const packageJSON = {
    scripts: {
        test: 'noop',
        test2: 'noop'
    },
    'lint-staged': {}
}

describe('runScript', () => {

    beforeEach(() => {
        mockFn.mockReset()
    })

    it('should return an array', () => {
        expect(runScript('test', 'test.js', packageJSON)).toBeInstanceOf(Array)
    })

    it('should throw for non-existend script', () => {
        expect(() => {
            runScript('missing-module', 'test.js', packageJSON)[0].task()
        }).toThrow()
    })

    it('should work with a single command', () => {
        const res = runScript('test', 'test.js', packageJSON)
        expect(res.length).toBe(1)
        expect(res[0].title).toBe('test')
        expect(res[0].task).toBeInstanceOf(Function)
        expect(res[0].task()).toBeAPromise()
    })

    it('should work with multiple commands', () => {
        const res = runScript(['test', 'test2'], 'test.js', packageJSON)
        expect(res.length).toBe(2)
        expect(res[0].title).toBe('test')
        expect(res[1].title).toBe('test2')

        expect(res[0].task()).toBeAPromise()
        expect(mockFn.mock.calls.length).toEqual(1)
        expect(mockFn.mock.calls[0]).toEqual(
            ['npm', ['run', '--silent', 'test', '--', 'test.js'], {}]
        )
        expect(res[1].task()).toBeAPromise()
        expect(mockFn.mock.calls.length).toEqual(2)
        expect(mockFn.mock.calls[1]).toEqual(
            ['npm', ['run', '--silent', 'test2', '--', 'test.js'], {}]
        )
    })

    it('should support non npm scripts', () => {
        const res = runScript(['node --arg=true ./myscript.js', 'git add'], 'test.js', packageJSON)
        expect(res.length).toBe(2)
        expect(res[0].title).toBe('node --arg=true ./myscript.js')
        expect(res[1].title).toBe('git add')

        expect(res[0].task()).toBeAPromise()
        expect(mockFn.mock.calls.length).toEqual(1)
        expect(mockFn.mock.calls[0][0]).toContain('node')
        expect(mockFn.mock.calls[0][1]).toEqual(['--arg=true', './myscript.js', '--', 'test.js'])

        expect(res[1].task()).toBeAPromise()
        expect(mockFn.mock.calls.length).toEqual(2)
        expect(mockFn.mock.calls[1][0]).toContain('git')
        expect(mockFn.mock.calls[1][1]).toEqual(['add', '--', 'test.js'])
    })

    it('should pass cwd to execa if gitDir option is set for non-npm tasks', () => {
        const res = runScript(
            ['test', 'git add'],
            'test.js',
            packageJSON,
            { gitDir: '../' }
        )
        expect(res[0].task()).toBeAPromise()
        expect(mockFn.mock.calls.length).toEqual(1)
        expect(mockFn.mock.calls[0]).toEqual(
            ['npm', ['run', '--silent', 'test', '--', 'test.js'], {}]
        )

        expect(res[1].task()).toBeAPromise()
        expect(mockFn.mock.calls.length).toEqual(2)
        expect(mockFn.mock.calls[1][0]).toMatch(/git$/)
        expect(mockFn.mock.calls[1][1]).toEqual(['add', '--', 'test.js'])
        expect(mockFn.mock.calls[1][2]).toEqual({ cwd: '../' })
    })

    it('should use --silent in non-verbose mode', () => {
        const res = runScript(
            'test',
            'test.js',
            packageJSON,
            { verbose: false }
        )
        expect(res[0].task()).toBeAPromise()
        expect(mockFn.mock.calls.length).toEqual(1)
        expect(mockFn.mock.calls[0]).toEqual(
            ['npm', ['run', '--silent', 'test', '--', 'test.js'], {}]
        )
    })

    it('should not use --silent in verbose mode', () => {
        const res = runScript(
            'test',
            'test.js',
            packageJSON,
            { verbose: true }
        )
        expect(res[0].task()).toBeAPromise()
        expect(mockFn.mock.calls.length).toEqual(1)
        expect(mockFn.mock.calls[0]).toEqual(
            ['npm', ['run', 'test', '--', 'test.js'], {}]
        )
    })
})

