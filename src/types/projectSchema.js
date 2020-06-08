const schema = {
  $schema: 'http://json-schema.org/draft-07/schema',
  $id: 'hypermerge:/SomeUrlInHypermerge',
  type: 'object',
  title: 'ProjectDoc',
  description: 'A project in Arthropod, comprising a list of tasks',
  default: {},
  required: ['title', 'tasks'],
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      default: '',
    },
    tasks: {
      type: 'array',
      description: 'A list of tasks in the project',
      default: [],
      additionalItems: false,
      items: {
        $id: 'hypermerge:/SomeOtherUrlInHypermerge',
        type: 'object',
        title: 'ProjectDocTask',
        description: 'A distinct thing to do in a project',
        default: {},
        required: ['id', 'title', 'description', 'complete'],
        additionalProperties: false,
        properties: {
          id: {
            type: 'string',
          },
          title: {
            type: 'string',
            default: 'New task',
          },
          description: {
            type: 'string',
          },
          complete: {
            type: 'boolean',
            default: false,
          },
        },
      },
    },
  },
}

export default schema