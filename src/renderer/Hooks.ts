import { useEffect, useState, useRef, useCallback, createContext, useContext } from 'react'
import { Handle, RepoFrontend, HyperfileUrl, Doc, CryptoClient } from 'hypermerge'
import { Header } from 'hypermerge/dist/FileStore'
import { Readable } from 'stream'
import Ajv from 'ajv'
import { change } from 'automerge'
import * as Hyperfile from './hyperfile'
import { HypermergeUrl } from './ShareLink'

import ProjectV1 from '../schemas/ProjectV1.json'
import ProjectV2 from '../schemas/ProjectV2.json'

export type ChangeFn<T> = (cb: (doc: T) => void) => void

type Cleanup = void | (() => void)

export const RepoContext = createContext<RepoFrontend | null>(null)

export function useRepo(): RepoFrontend {
  const repo = useContext(RepoContext)

  if (!repo) {
    throw new Error('Repo not available on RepoContext.')
  }

  return repo
}

export function useCrypto(): CryptoClient {
  const repo = useRepo()
  return repo.crypto
}

/**
 * Provides direct use of a handle inside a callback.
 *
 * @remarks
 * Only acquires a new handle when the given url changes,
 * and ensures all handles are properly closed.
 */
export function useHandle<D>(
  url: HypermergeUrl | null,
  cb: (handle: Handle<D>) => Cleanup
): RepoFrontend {
  const repo = useRepo()

  useEffect(() => {
    if (!url) {
      return () => { }
    }

    const handle = repo.open<D>(url)

    const cleanup = cb(handle)

    return () => {
      handle.close()
      cleanup && cleanup()
    }
  }, [url])

  return repo
}

type ConversionError = string

export type MaybeDoc<D> = Doc<D> | ConversionError

// A hardcoded conversion from the soup doc to a desired schema
// (to be replaced with a real implementation)
function readAs(soupDoc, schema) {
  if (schema.$id === 'schemas://projectv1') {
    return soupDoc['schemas://projectv1']
  }
  if (schema.$id === 'schemas://projectv2') {
    return Object.assign(
      soupDoc['schemas://projectv1'] || {},
      soupDoc['schemas://projectv2'] || {
        description: '',
      }
    )
  }
  return {}
}

function writeAs(changeSoupDoc, schema) {
  return (cb) => {
    console.log('changedoc')
    changeSoupDoc((soupDoc) => {
      cb(soupDoc['schemas://projectv1'])
    })
  }
}

// expose a well-typed doc or a conversion error
export function useTypedDocument<D>(
  url: HypermergeUrl | null,

  // ajv's types don't let us statically typecheck the schema itself
  schema: any
): [Doc<D> | null, ChangeFn<D>, Doc<D> | null] {
  const [soupDoc, changeSoupDoc] = useDocument<D>(url)

  // We don't want to try to validate an unloaded doc against the schema.
  // For now, just return the null doc
  if (soupDoc === null) {
    return [soupDoc, changeSoupDoc, soupDoc]
  }

  // Convert the CRDT "soup doc" into a well typed doc
  const doc = readAs(soupDoc, schema)
  const changeDoc = writeAs(changeSoupDoc, schema)

  // Validate the converted doc against JSON Schema

  // need to load all schemas into Ajv so that it can follow ref URLs.
  // (the ref URLs aren't real, they're just identifiers)
  // (in the future these could just be real hypermerge URLs)
  const ajv = new Ajv({ allErrors: true, schemas: [ProjectV1, ProjectV2] })
  const validate = ajv.compile(schema)
  const valid = validate(doc)

  if (!valid) {
    console.error("doc doesn't match schema", validate.errors)
    throw new Error("doc doesn't match schema")
  }

  return [doc, changeDoc, soupDoc]
}

export function useDocument<D>(url: HypermergeUrl | null): [Doc<D> | null, ChangeFn<D>] {
  const [doc, setDoc] = useState<Doc<D> | null>(null)

  const repo = useHandle<D>(url, (handle) => {
    handle.subscribe((doc) => setDoc(doc))

    return () => {
      setDoc(null)
    }
  })

  const change = useCallback(
    (cb: (doc: D) => void) => {
      if (url) {
        repo.change(url, cb)
      }
    },
    [url]
  )

  return [doc, change]
}

export function useDocumentReducer<D, A>(
  url: HypermergeUrl | null,
  reducer: (doc: D, action: A) => void,
  deps?: any[]
): [Doc<D> | null, (action: A) => void] {
  const [doc, changeDoc] = useDocument<D>(url)

  const dispatch = useCallback(
    (action: A) => {
      changeDoc((doc) => {
        reducer(doc, action)
      })
    },
    [deps]
  )

  return [doc, dispatch]
}

export function useMessaging<M>(
  url: HypermergeUrl | null,
  onMsg: (msg: M) => void
): (msg: M) => void {
  const [sendObj, setSend] = useState<{ send: (msg: M) => void }>({ send() { } })

  // Without this ref, we'd close over the `onMsg` passed during the very first render.
  // Instead, we close over the ref object and can be sure we're always reading
  // the latest onMsg callback.
  const onMsgRef = useRef(onMsg)
  onMsgRef.current = onMsg

  useHandle(url, (handle) => {
    handle.subscribeMessage((msg: M) => onMsgRef.current(msg))
    setSend({ send: handle.message })

    return () => {
      onMsgRef.current = () => { }
      setSend({ send() { } })
    }
  })
  return sendObj.send
}

export function useHyperfile(url: HyperfileUrl | null): [Header, Readable] | [null, null] {
  const [header, setHeader] = useState<[Header, Readable] | [null, null]>([null, null])

  useEffect(() => {
    header && setHeader([null, null])
    url && Hyperfile.fetch(url).then(([header, readable]) => setHeader([header, readable]))
  }, [url])

  return header
}

export function useHyperfileHeader(url: HyperfileUrl | null): Header | null {
  const [header, setHeader] = useState<Header | null>(null)
  const { files } = useRepo()

  useEffect(() => {
    header && setHeader(null)
    url && files.header(url).then(setHeader)
  }, [url])

  return header
}

export function useInterval(ms: number, cb: () => void, deps: any[]) {
  useEffect(() => {
    const id = setInterval(cb, ms)

    return () => {
      clearInterval(id)
    }
  }, deps)
}

/**
 * Starts a timeout when `cond` is first set to true.
 * The timeout can be restarted by calling the returned `reset` function.
 *
 * @remarks
 * The timeout is cancelled when `cond` is set to false.
 */
export function useTimeoutWhen(cond: boolean, ms: number, cb: () => void) {
  const reset = useRef(() => { })

  useEffect(() => {
    if (!cond) {
      reset.current = () => { }
      return () => { }
    }

    let id: NodeJS.Timeout

    reset.current = () => {
      id != null && clearTimeout(id)
      id = setTimeout(cb, ms)
    }

    reset.current()

    return () => {
      clearTimeout(id)
    }
  }, [cond])

  return () => reset.current()
}

/**
 * Manages a set of timeouts keyed by type `K`.
 *
 * @remarks
 * Returns a tuple containing two functions:
 * A function of a key to reset a timeout back to `ms`.
 * A function of a key to perform a timeout early.
 */
export function useTimeouts<K>(
  ms: number,
  onTimeout: (key: K) => void
): [(key: K) => void, (key: K) => void] {
  const timeoutIds = useRef<Map<K, NodeJS.Timeout>>(new Map())
  const timedOut = useStaticCallback((key: K) => {
    timeoutIds.current.delete(key)
    onTimeout(key)
  })

  const bump = useCallback(
    (key: K) => {
      const timeoutId = timeoutIds.current.get(key)
      if (timeoutId) clearTimeout(timeoutId)
      timeoutIds.current.set(
        key,
        setTimeout(() => timedOut(key), ms)
      )
    },
    [onTimeout]
  )

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach((id) => clearTimeout(id))
      timeoutIds.current.clear()
    }
  }, [])

  return [bump, timedOut]
}

type InputEvent = React.ChangeEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>

/**
 * Manages the state and events for an input element for which the input's value
 * is only needed after a confirmation via the enter key.
 *
 * @remarks
 * Returns `[value, onEvent]`.
 * Pass `value` to the input's `value` prop, and
 * pass `onEvent` to both `onChange` and `onKeyDown`.
 */
export function useConfirmableInput(
  value: string,
  onConfirm: (val: string) => void
): [string, (e: InputEvent) => void] {
  const [str, setStr] = useState<string | null>(null)

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setStr(e.target.value)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'Enter':
        if (str !== null) {
          onConfirm(str)
          setStr(null)
        }
        e.currentTarget.blur()
        break

      case 'Backspace':
        e.stopPropagation()
        break

      case 'Escape':
        e.currentTarget.blur()
        setStr(null)
        break
    }
  }

  function onEvent(e: InputEvent) {
    switch (e.type) {
      case 'change':
        onChange(e as React.ChangeEvent<HTMLInputElement>)
        break
      case 'keydown':
        onKeyDown(e as React.KeyboardEvent<HTMLInputElement>)
        break
    }
  }

  return [str != null ? str : value, onEvent]
}

export function useEvent<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  cb: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any
): void
export function useEvent<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  cb: (this: Document, ev: DocumentEventMap[K]) => any
): void
export function useEvent<K extends string>(
  target: EventTarget | null,
  type: K,
  cb: (this: HTMLElement, ev: any) => void
): void
export function useEvent<K extends string>(
  target: EventTarget | null,
  type: K,
  cb: (this: EventTarget, ev: Event) => void
): void {
  useEffect(() => {
    if (target == null) return () => { }

    target.addEventListener(type, cb)

    return () => {
      target.removeEventListener(type, cb)
    }
  }, [target, type, cb])
}
/**
 * Creates a constant reference for the given function.
 * Always returns the same function.
 *
 * @remarks
 *
 * `useCallback` closes over the deps at the time they're passed in, whereas `useStaticCallback`
 * always calls the latest callback. This is generally a good thing, but it's worth noting that it
 * could result in a race condition.
 */
export function useStaticCallback<T extends (...args: any[]) => any>(callback: T): T {
  const cb = useRef<T>(callback)
  cb.current = callback

  return useCallback((...args: any[]) => cb.current(...args), []) as T
}

type Setter<T> = ((state: T) => T) | T
/**
 * Provides access to shared mutable state via hook interface. Provided
 * handle object used as key to which shared state is associated with
 * there for thing wishing to share the state will need to share the handle.
 */
export function useSharedState<T>(id: string, defaultValue: T): [T, (v: Setter<T>) => void] {
  const atom = Atom.new(id, defaultValue)
  const [state, setState] = useState(atom.value)
  useEffect((): (() => void) => {
    atom.watch(setState)
    return () => atom.unwatch(setState)
  }, [])

  const setSharedState: any = (t: any) => {
    if (typeof t === 'function') {
      atom.transact(t as any)
    } else {
      atom.swap(t)
    }
  }

  return [state, setSharedState]
}

class Atom<T> {
  value: T
  watchers: ((state: T) => any)[]
  static new<T>(id: string, value: T): Atom<T> {
    if (atoms.has(id)) {
      return atoms.get(id)
    }
    const atom = new Atom(value)
    atoms.set(id, atom)
    return atom
  }
  constructor(value: T) {
    this.value = value
    this.watchers = []
  }
  transact(f: (inn: T) => T) {
    this.value = f(this.value)
    this.notify()
  }
  swap(value: T) {
    this.value = value
    this.notify()
  }
  notify() {
    const { value, watchers } = this
    watchers.forEach((watcher) => watcher(value))
  }
  watch(watcher: (state: T) => any) {
    this.watchers.push(watcher)
  }
  unwatch(watcher: (state: T) => any) {
    const index = this.watchers.indexOf(watcher)
    if (index >= 0) {
      this.watchers.splice(index, index + 1)
    }
  }
}

const atoms = new Map()
