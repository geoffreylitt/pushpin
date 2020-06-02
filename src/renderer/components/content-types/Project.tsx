import React, { useEffect, useRef, useMemo } from 'react'
import { Handle } from 'hypermerge'

import * as ContentTypes from '../../ContentTypes'
import { ContentProps } from '../Content'
import { useDocument, useStaticCallback } from '../../Hooks'
import './Project.css'
import Badge from '../ui/Badge'
import * as ContentData from '../../ContentData'
import * as WebStreamLogic from '../../../WebStreamLogic'
import ListItem from '../ui/ListItem'
import ContentDragHandle from '../ui/ContentDragHandle'
import TitleWithSubtitle from '../ui/TitleWithSubtitle'
import Heading from '../ui/Heading'

interface Task {
  title: string
  description: string
}

interface ProjectDoc {
  title: string
  tasks: Task[]
}

Project.defaultWidth = 15

export default function Project(props: ContentProps) {
  const [doc, changeDoc] = useDocument<ProjectDoc>(props.hypermergeUrl)

  // todo: why wouldn't there be a doc here?
  // Is it only temporarily while loading data?
  if (!doc) {
    return <>Loading project...</>
  }

  // todo: the `doc.tasks &&` below is precisely an example of the
  // schema problem! I added the tasks field after creating the doc.
  //
  // todo: heading seems redundant with the title bar, pick one
  return (
    <div
      className="Project"
    >
      <Heading style={{fontWeight: "bold", fontSize: "20px"}}>{doc.title}</Heading>

      <div className="taskList">
        { doc.tasks && doc.tasks.map(task => <div className="Task">{task.title}</div>) }
       </div>

      <hr />

      <span>Debug doc contents:</span>

      <pre style={{fontSize: "12px", width: "300px"}}>
        { JSON.stringify(doc) }
      </pre>
    </div>
  )
}

// todo: try changing the way that "render in a list" works to use our
// schema mapping tool. A project just needs to define a schema mapping
// from a ProjectDoc to a ListItem and then the list renderer
// can take it from there
function ProjectInList(props: ContentProps) {
  const { hypermergeUrl, url } = props
  const [doc] = useDocument<ProjectDoc>(hypermergeUrl)
  if (!doc) return null

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge icon="sticky-note" />
      </ContentDragHandle>
      <TitleWithSubtitle
        title={doc.title}
        subtitle={""}
        hypermergeUrl={hypermergeUrl}
        editable={true}
      />
    </ListItem>
  )
}

function create(unusedAttrs, handle) {
  handle.change((doc) => {
    doc.title = "Yet Another Project"
    doc.tasks = [
      {
        title: "Fork pushpin",
        description: "Start an issue tracker"
      }
    ]
  })
}

ContentTypes.register({
  type: 'project',
  name: 'Project',
  icon: 'sticky-note',
  contexts: {
    board: Project,
    workspace: Project,
    list: ProjectInList,
    'title-bar': ProjectInList,
  },
  create,
})
