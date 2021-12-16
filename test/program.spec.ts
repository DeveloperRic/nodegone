import fs from 'fs'
import path from 'path'
import { run, RunResult } from './run-script'

const artifactsDir = path.join(__dirname, 'artifacts')

type DirectoryTree = (string | DirectoryTree)[]
const directoryTree: DirectoryTree = ['a', ['b', ['node_modules', 'c']], ['d', ['e', 'node_modules']]]

function flattenTree(parent: string, tree: DirectoryTree): string[] {
  const paths = []
  for (const e of tree) {
    if (Array.isArray(e)) {
      const p = path.join(parent, <string>e[0]) // 1st elem always a string
      paths.push(p)
      paths.push(...flattenTree(p, e.slice(1)))
    } else {
      paths.push(path.join(parent, e))
    }
  }
  return paths
}

const programInvocationVariants = [
  { args: ['artifacts'], inputs: ['no'], expectDeleted: false },
  { args: ['artifacts'], inputs: ['yes'], expectDeleted: true },
  { args: ['artifacts/'], inputs: ['no'], expectDeleted: false },
  { args: ['artifacts/'], inputs: ['yes'], expectDeleted: true },
  { args: ['artifacts --yes'], inputs: undefined, expectDeleted: true },
  { args: ['artifacts -q'], inputs: ['yes'], expectDeleted: true, expectQuiet: true },
]

beforeAll(() => process.chdir(__dirname))
beforeEach(async () => {
  if (fs.existsSync(artifactsDir)) {
    fs.rmSync(artifactsDir, { recursive: true })
  }
  for (const path of flattenTree(artifactsDir, directoryTree)) {
    fs.mkdirSync(path, { recursive: true })
  }
})
afterAll(() => {
  if (fs.existsSync(artifactsDir)) {
    fs.rmSync(artifactsDir, { recursive: true })
  }
})

describe.each(programInvocationVariants)('program', ({ args, inputs, expectDeleted, expectQuiet }) => {
  const argStr = args.join(' ')

  test(`run(${argStr}) // stdin = ${inputs}`, async () => {
    let res: RunResult
    try {
      res = await run({
        command: `ts-node -T ../src/index ${args.join(' ')}`.trim(),
        inputs: inputs && inputs.map(text => `${text}\n`),
      })
    } catch (res: any) {
      console.error(res.stderr)
      fail()
    }
    for (const path of flattenTree(artifactsDir, directoryTree)) {
      const shouldExist = !expectDeleted || !path.includes('node_modules')
      const exists = fs.existsSync(path)
      if (exists != shouldExist) {
        console.log(res.stdout())
      }
      expect({ path, exists }).toMatchObject({ path, exists: shouldExist })
    }
    if (expectQuiet) {
      expect(res.stdout()).toStrictEqual('')
    }
  })
})
