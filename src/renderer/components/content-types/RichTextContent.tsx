import React, { useState } from 'react'

import * as ContentTypes from '../../ContentTypes'
import Content, { ContentProps } from '../Content'
import { createDocumentLink, HypermergeUrl } from '../../ShareLink'
import { useDocument } from '../../Hooks'
import ListItem from '../ui/ListItem'
import Badge from '../ui/Badge'
import ContentDragHandle from '../ui/ContentDragHandle'
import TitleWithSubtitle from '../ui/TitleWithSubtitle'
import './ThreadContent.css'

export default function RichText(props: ContentProps) {
  const [message, setMessage] = useState('')
  const [doc, changeDoc] = useDocument<Doc>(props.hypermergeUrl)

  if (!doc) {
    return null
  }

  return (
    <div>
      Hello World
    </div>
  )
}

interface Doc {
  title?: string
  text: any // todo: slate contents
}

const icon = 'comments'

export function RichTextInList(props: ContentProps) {
  const { hypermergeUrl, url } = props
  const [doc] = useDocument<Doc>(hypermergeUrl)
  if (!doc) return null

  const title = doc.title != null && doc.title !== '' ? doc.title : 'Untitled rich text'

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge icon={icon} />
      </ContentDragHandle>
      <TitleWithSubtitle
        titleEditorField="title"
        title={title}
        subtitle={""}
        hypermergeUrl={hypermergeUrl}
        editable
      />
    </ListItem>
  )
}

function create(unusedAttrs, handle) {
  handle.change((doc) => {
    doc.title = "Rich Text"
  })
}

ContentTypes.register({
  type: 'richtext',
  name: 'Rich Text',
  icon,
  contexts: {
    workspace: RichText,
    board: RichText,
    list: RichTextInList,
    'title-bar': RichTextInList,
  },
  create,
})
