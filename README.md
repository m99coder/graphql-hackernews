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

### A simple query

```diff
diff --git a/server/src/index.js b/server/src/index.js
index 3788ed7..593f5d1 100644
--- a/server/src/index.js
+++ b/server/src/index.js
@@ -3,12 +3,31 @@ const { ApolloServer } = require("apollo-server")
 const typeDefs = `
   type Query {
     info: String!
+    feed: [Link!]!
+  }
+
+  type Link {
+    id: ID!
+    description: String!
+    url: String!
   }
 `

+let links = [{
+  id: "link-0",
+  url: "https://howtographql.com",
+  description: "Fullstack tutorial for GraphQL"
+}]
+
 const resolvers = {
   Query: {
     info: () => `This is the API of a Hackernews Clone`,
+    feed: () => links,
+  },
+  Link: {
+    id: (parent) => parent.id,
+    description: (parent) => parent.description,
+    url: (parent) => parent.url,
   },
 }

```

Run the following query

```graphql
query {
  feed {
    id
    url
    description
  }
}
```

You should retrieve this result

```json
{
  "data": {
    "feed": [
      {
        "id": "link-0",
        "url": "https://howtographql.com",
        "description": "Fullstack tutorial for GraphQL"
      }
    ]
  }
}
```
