import LoggerFactory from '../src/LoggerFactory'
import GulpOperate from "../src/GulpOperate"
import * as GulpCommands from '../src/cmds/GulpCommands'
import prompt from 'prompt'

const logger = LoggerFactory("test-server")

beforeEach(() => {
    GulpOperate()
})

test('run-dev', async () => {
    logger.info('run-dev')
    await GulpCommands.run("dev")
    expect(1 + 1).toBe(2)
})

test('password', async () => {
    prompt.get(['password'], (err, result) => {
        console.log(result)
    })
})
