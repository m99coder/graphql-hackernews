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

### A simple mutation

In order to enhance our schema we move it to a separate file `./src/schema.graphql`. Afterwards we load the file asynchronously and remove `typeDefs`.

```diff
diff --git a/server/src/index.js b/server/src/index.js
index 593f5d1..142e475 100644
--- a/server/src/index.js
+++ b/server/src/index.js
@@ -1,17 +1,7 @@
-const { ApolloServer } = require("apollo-server")
-
-const typeDefs = `
-  type Query {
-    info: String!
-    feed: [Link!]!
-  }
+const fs = require("fs")
+const path = require("path")

-  type Link {
-    id: ID!
-    description: String!
-    url: String!
-  }
-`
+const { ApolloServer } = require("apollo-server")

 let links = [{
   id: "link-0",
@@ -32,7 +22,7 @@ const resolvers = {
 }

 const server = new ApolloServer({
-  typeDefs,
+  typeDefs: fs.readFileSync(path.join(__dirname, "schema.graphql"), "utf-8"),
   resolvers,
 })
```

Now we add the corresponding resolver function.

```diff
diff --git a/server/src/index.js b/server/src/index.js
index 142e475..577ccd8 100644
--- a/server/src/index.js
+++ b/server/src/index.js
@@ -8,12 +8,24 @@ let links = [{
   url: "https://howtographql.com",
   description: "Fullstack tutorial for GraphQL"
 }]
+let idCount = links.length

 const resolvers = {
   Query: {
     info: () => `This is the API of a Hackernews Clone`,
     feed: () => links,
   },
+  Mutation: {
+    post: (parent, args) => {
+      const link = {
+        id: `link-${idCount++}`,
+        description: args.description,
+        url: args.url,
+      }
+      links.push(link)
+      return link
+    },
+  },
   Link: {
     id: (parent) => parent.id,
     description: (parent) => parent.description,
```

Run the following query

```graphql
mutation {
  post(url: "https://prisma.io", description: "Prisma replaces traditional ORMs") {
    id
  }
}
```

You should retrieve this result

```json
{
  "data": {
    "post": {
      "id": "link-1"
    }
  }
}
```
