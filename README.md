# graphql-hackernews

> How to GraphQL – Hackernews Clone

## Server

Change into the root directory `/server`.

### Getting started

Type definitions and resolvers are just statically declared in this step. Run `npm start` and go to [http://localhost:4000](http://localhost:4000) to run the GraphQL Playground. For convenience a second command is available: `npm run dev` restarts the same server whenever `./src/index.js` is modified.

On the right side you can check the schema as well as the docs. On the left side put in the following query and hit `[Cmd+Enter]` to run it.

```graphql
query {
  info
}
```

The result looks like this:

```json
{
  "data": {
    "info": "This is the API of a Hackernews Clone"
  }
}
```
