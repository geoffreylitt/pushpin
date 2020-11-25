// Import React dependencies.
import React, { useEffect, useMemo, useState, useCallback } from 'react'
// Import the Slate editor factory.
import { createEditor, Transforms, Text } from 'slate'

// Import the Slate components and React plugin.
import { Slate, Editable, withReact } from 'slate-react'

import * as ContentTypes from '../../ContentTypes'
import Content, { ContentProps } from '../Content'
import { useDocument } from '../../Hooks'
import ListItem from '../ui/ListItem'
import Badge from '../ui/Badge'
import ContentDragHandle from '../ui/ContentDragHandle'
import TitleWithSubtitle from '../ui/TitleWithSubtitle'

// Define a React component to render leaves with bold text.
const Leaf = props => {
  return (
    <span
      {...props.attributes}
      style={{ fontWeight: props.leaf.bold ? 'bold' : 'normal' }}
    >
      {props.children}
    </span>
  )
}

export default function RichText(props: ContentProps) {
  const [doc, changeDoc] = useDocument<Doc>(props.hypermergeUrl)

  const editor = useMemo(() => withReact(createEditor()), [])
  // Add the initial value when setting up our state.
  const [value, setValue] = useState([
    {
      type: 'paragraph',
      children: [{ text: 'A line of text in a paragraph.' }],
    },
  ])

  // Define a leaf rendering function that is memoized with `useCallback`.
  const renderLeaf = useCallback(props => {
    return <Leaf {...props} />
  }, [])

  if (!doc) {
    return null
  }

  return (
    <Slate
      editor={editor}
      value={value}
      onChange={newValue => setValue(newValue)}
    >
      <Editable
        renderLeaf={renderLeaf} 
        onKeyDown={event => {
          if (!event.ctrlKey) {
            return
          }

          switch (event.key) {
            case 'b': {
              console.log("b!")
              event.preventDefault()
              Transforms.setNodes(
                editor,
                { bold: true },
                { match: n => Text.isText(n), split: true }
              )
              break
            }
          }
        }}/>
    </Slate>
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
