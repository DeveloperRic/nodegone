import { streamWrite, streamEnd } from '@rauschma/stringio'
import { exec, ChildProcess } from 'child_process'
import { Writable } from 'stream'

export class WritableTextStream extends Writable {
  public text: string = ''

  constructor(
    private consoleLog = false,
    private consoleError = false
  ) {
    super()
  }

  _write(chunk: Buffer, _encoding: BufferEncoding, done: (error?: Error | null) => void): void {
    const text = chunk.toString()
    this.text += text
    if (this.consoleLog) console.log(text)
    if (this.consoleError) console.error(text)
    done()
  }
}

export class RunResult {
  public returnCode: number = NaN
  public signal: string | null = null
  public completed: boolean = false
  readonly _stdout: WritableTextStream
  readonly _stderr: WritableTextStream

  constructor(logStreams: boolean) {
    this._stdout = new WritableTextStream(logStreams, false)
    this._stderr = new WritableTextStream(false, logStreams)
  }

  stdout() {
    return this._stdout.text.trim()
  }

  stderr() {
    return this._stderr.text.trim()
  }
}

export interface RunOptions {
  command: string
  cwd?: string
  inputs?: string[]
  logStreams?: boolean
}

export async function run(opts: RunOptions): Promise<RunResult> {
  const res = new RunResult(!!opts.logStreams)
  const process = exec(opts.command, { cwd: opts.cwd })
  process.stdout?.pipe(res._stdout)
  process.stderr?.pipe(res._stderr)
  if (opts.inputs) writeInputs(process, opts.inputs)
  const [returnCode, signal] = await awaitComplete(process)
  res.returnCode = returnCode == null ? NaN : returnCode
  res.signal = signal
  res.completed = true
  if (returnCode != 0) {
    throw res
  }
  return res
}

async function writeInputs(process: ChildProcess, inputs: string[]) {
  if (!process.stdin) {
    throw new Error(`Failed to write inputs to process; process failed to spawn`)
  }
  for (const input of inputs) {
    await streamWrite(process.stdin, input)
  }
  await streamEnd(process.stdin)
}

function awaitComplete(process: ChildProcess): Promise<[code: number | null, signal: string | null]> {
  return new Promise((resolve, reject) => {
    process.once('exit', (code, signal) => resolve([code, signal]))
    process.once('error', err => reject(err))
  })
}
