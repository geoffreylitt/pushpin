import React, { useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

import JSONPretty from 'react-json-pretty'
import * as ContentTypes from '../../ContentTypes'
import { ContentProps } from '../Content'
import { useDocument, useTypedDocument } from '../../Hooks'
import './Project.css'
import Badge from '../ui/Badge'
import ListItem from '../ui/ListItem'
import ContentDragHandle from '../ui/ContentDragHandle'
import TitleWithSubtitle from '../ui/TitleWithSubtitle'

import projectSchema from '../../../types/projectSchema.json'

import { ProjectDoc, ProjectDocTask } from '../../../types/project'

Project.defaultWidth = 15

interface TaskProps {
  task: ProjectDocTask
  toggleComplete(string): void
  updateTitle(taskId: string, newTitle: string): void
  updateDescription(taskId: string, newDescription: string): void
}

function Task(props: TaskProps) {
  return (
    <div className="Task">
      <input
        name="complete"
        type="checkbox"
        checked={props.task.complete}
        onChange={() => props.toggleComplete(props.task.id)}
      />
      <input
        value={props.task.title}
        className={`TaskTitle ${props.task.complete ? 'complete' : ''}`}
        onChange={(e) => props.updateTitle(props.task.id, e.target.value)}
      />

      <input
        value={props.task.description}
        className={`TaskDescription ${props.task.complete ? 'complete' : ''}`}
        onChange={(e) => props.updateDescription(props.task.id, e.target.value)}
      />
    </div>
  )
}

export default function Project(props: ContentProps) {
  const [doc, changeDoc] = useTypedDocument<ProjectDoc>(props.hypermergeUrl, projectSchema)

  const addTask = useCallback(() => {
    changeDoc((projectDoc: ProjectDoc) => {
      projectDoc.tasks.push({
        id: uuidv4(),
        title: 'New task',
        description: 'No description',
        complete: false,
      })
    })
  }, [changeDoc])

  const toggleComplete = useCallback(
    (taskId) => {
      changeDoc((projectDoc: ProjectDoc) => {
        const task = projectDoc.tasks.find((t) => t.id === taskId)
        if (task) {
          task.complete = !task.complete
        }
      })
    },
    [changeDoc]
  )

  const updateTitle = useCallback(
    (taskId, newTitle) => {
      changeDoc((projectDoc: ProjectDoc) => {
        const task = projectDoc.tasks.find((t) => t.id === taskId)
        if (task) {
          task.title = newTitle
        }
      })
    },
    [changeDoc]
  )

  const updateDescription = useCallback(
    (taskId, newDescription) => {
      changeDoc((projectDoc: ProjectDoc) => {
        const task = projectDoc.tasks.find((t) => t.id === taskId)
        if (task) {
          task.description = newDescription
        }
      })
    },
    [changeDoc]
  )

  // todo: find a way to not need this type guard?
  // We need to run all Hooks (because of hooks implementation) so
  // this has to come after all hooks
  if (!doc) {
    return null
  }

  // todo: the `doc.tasks &&` below is precisely an example of the
  // schema problem! I added the tasks field after creating the doc.
  //
  // todo: heading seems redundant with the title bar, pick one
  return (
    <div className="ProjectContainer">
      <div className="Project">
        <h1 className="ProjectTitle">{doc.title}</h1>

        {doc.tasks.map((task) => (
          <Task
            task={task}
            toggleComplete={toggleComplete}
            updateTitle={updateTitle}
            updateDescription={updateDescription}
            key={task.id}
          />
        ))}

        <button type="button" className="AddTaskButton" onClick={addTask}>
          Add new task
        </button>

        <div className="debug">
          <div>doc debug:</div>

          <JSONPretty id="json-pretty" data={doc} />
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
      <TitleWithSubtitle title={doc.title} subtitle="" hypermergeUrl={hypermergeUrl} editable />
    </ListItem>
  )
}

function create(unusedAttrs, handle) {
  handle.change((doc) => {
    doc.title = 'Yet Another Project'
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
