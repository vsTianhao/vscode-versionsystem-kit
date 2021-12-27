import type { Config } from '@jest/types'
import { defaults } from 'jest-config'
import * as path from 'path'

const config: Config.InitialOptions = {
  verbose: true,
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
  moduleNameMapper: {
    vscode: path.join(__dirname, 'tests', 'env', 'vscode.ts')
  },
  moduleDirectories: ["node_modules", "test"]
}

export default config
