import ContentTypes from '../../../ContentTypes'
import { HypermergeUrl } from '../../../ShareLink'

import StoragePeerWorkspace from './StoragePeerWorkspace'
import StoragePeer from './StoragePeer'

export interface StoragePeerDoc {
  name: string
  device: HypermergeUrl
  archivedUrls: { [contact: string]: HypermergeUrl } // contact is actually a hypermergeURL too
}

function create(typeAttrs, handle, callback) {
  throw new Error('we cannot (meaningfully) create storage peer documents inside pushpin')
}

ContentTypes.register({
  type: 'storage-peer',
  name: 'Storage Peer',
  icon: 'cloud',
  resizable: true,
  unlisted: true,
  create,
  contexts: {
    workspace: StoragePeerWorkspace,
    board: StoragePeer,
    list: StoragePeer,
  },
})
