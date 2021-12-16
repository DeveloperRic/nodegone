import { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import readline from 'readline'

const program = new Command()
program.version('0.0.1')
program.argument('<target>', 'Location under which to look')
program
  .option('-q, --quiet', 'Skip log messages')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('-D, --dry-run', 'Don\'t delete, just find directories')

const cli = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})
let opts: {
  quiet: boolean
  yes: boolean
  dryRun: boolean
}

export default async function main(argv?: string[]): Promise<void> {
  program.parse(argv)
  opts = program.opts()
  const [target] = program.args
  validateTarget(target)
  const moduleDirs = collectModuleDirs(target)
  if (moduleDirs.length == 0) {
    debug('Found 0 node_modules. Exiting.')
    return
  }
  if (opts.dryRun) {
    return
  }
  debug(`About to remove ${moduleDirs.length} directories.`)
  const proceed = await prompt('Continue (yes/no)?', 'yes')
  if (!proceed) {
    debug('Aborted.')
    return
  }
  for (const path of moduleDirs) {
    debug(`\tRemoving ${path}`)
    fs.rmSync(path, { recursive: true })
  }
}

function debug(msg: string): void {
  if (opts.quiet) return
  console.log(msg)
}

function prompt(query: string, expectedAnswer: string): Promise<boolean> {
  return new Promise(resolve => {
    if (opts.yes) return resolve(true)
    query = opts.quiet ? '' : `${query.trimEnd()} `
    cli.question(query, ans => {
      resolve(ans.toLowerCase() == expectedAnswer.toLowerCase())
    })
  })
}

function validateTarget(target: string) {
  if (!fs.existsSync(target)) {
    throw new Error(`${target} does not exist`)
  }
  if (!fs.statSync(target).isDirectory()) {
    throw new Error(`${target} is not a directory`)
  }
}

function collectModuleDirs(top_dir: string): string[] {
  debug(`Collecting node_modules paths under ${top_dir}...`)
  const node_modules: string[] = []
  const stack = [top_dir]
  let curParent
  while (curParent = stack.pop()) {
    for (const child of fs.readdirSync(curParent)) {
      const childPath = path.join(curParent, child)
      if (child == 'node_modules') {
        debug(`\tDiscovered: ${childPath}`)
        node_modules.push(childPath)
        continue
      }
      const stat = fs.statSync(childPath)
      if (stat.isDirectory()) {
        stack.push(childPath)
      }
    }
  }
  return node_modules
}
