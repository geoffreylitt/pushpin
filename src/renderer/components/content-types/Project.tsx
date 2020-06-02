import React, { useEffect, useRef, useMemo } from 'react'
import { Handle } from 'hypermerge'
import { v4 as uuidv4 } from 'uuid';

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
  id: string
  title: string
  description: string
  complete: boolean
}

interface ProjectDoc {
  title: string
  tasks: Task[]
}

Project.defaultWidth = 15

interface TaskProps {
  task: Task
  toggleComplete(string): void
  updateTitle(string): void
}

function Task(props: TaskProps) {
  return <div className="Task">
    <input
      name="complete"
      type="checkbox"
      checked={props.task.complete}
      onChange={() => props.toggleComplete(props.task.id)} />
    <input
      value={props.task.title}
      className={`TaskTitle ${props.task.complete ? 'complete' : ''}`}
      onChange={(e) => props.updateTitle(props.task.id, e.target.value)} />

    <input
      value={props.task.description}
      className="TaskDescription"
      onChange={(e) => props.updateDescription(props.task.id, e.target.value)}
      />
  </div>
}

export default function Project(props: ContentProps) {
  const [doc, changeDoc] = useDocument<ProjectDoc>(props.hypermergeUrl)

  let addTask = () => {
    changeDoc((projectDoc: ProjectDoc) => {
      projectDoc.tasks.push({
        id: uuidv4(),
        title: "New task",
        description: "No description",
        complete: false
      })
    })
  }

  let toggleComplete = (taskId) => {
    changeDoc((projectDoc: ProjectDoc) => {
      let task = projectDoc.tasks.find(t => t.id === taskId)
      if (task) {
        task.complete = !task.complete
      }
    })
  }

  let updateTitle = (taskId, newTitle) => {
    changeDoc((projectDoc: ProjectDoc) => {
      let task = projectDoc.tasks.find(t => t.id === taskId)
      if (task) {
        task.title = newTitle
      }
    })
  }

  let updateDescription = (taskId, newDescription) => {
    changeDoc((projectDoc: ProjectDoc) => {
      let task = projectDoc.tasks.find(t => t.id === taskId)
      if (task) {
        task.description = newDescription
      }
    })
  }

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
    <div className="ProjectContainer">
      <div className="Project">

        <h1 className="ProjectTitle">{doc.title}</h1>

        { doc.tasks && doc.tasks.map(task =>
          <Task
            task={task}
            toggleComplete={ toggleComplete }
            updateTitle={ updateTitle }
            updateDescription={ updateDescription }
            key={task.id}
          />)

         }

        <button className="AddTaskButton" onClick={ addTask }>
          Add new task
        </button>

        <div className="debug">
          <div>doc contents:</div>

          <div style={{fontSize: "12px", width: "300px"}}>
            { JSON.stringify(doc) }
          </div>
        </div>
      </div>
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
    doc.tasks = []
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
