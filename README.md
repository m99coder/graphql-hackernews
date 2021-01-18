# graphql-hackernews

> How to GraphQL – Hackernews Clone

Based on these two [How to GraphQL](https://www.howtographql.com/) tutorials:

* [graphql-node Tutorial](https://www.howtographql.com/graphql-js/0-introduction/) by Robin MacPherson
* [React + Apollo Tutorial](https://www.howtographql.com/react-apollo/0-introduction/) by Nikolas Burk

## Introduction

This tutorial is a step-by-step guide and each step can be checked out individually. To get a full list of available tags run `git tag`. To checkout a specific tag run `git checkout tags/<tag>`.

- [graphql-hackernews](#graphql-hackernews)
  - [Introduction](#introduction)
  - [Server](#server)
    - [Getting started](#getting-started)
    - [A simple query](#a-simple-query)
    - [A simple mutation](#a-simple-mutation)
    - [Adding a database](#adding-a-database)
    - [Connect server and database](#connect-server-and-database)
    - [Realtime subscriptions](#realtime-subscriptions)
    - [Authentication](#authentication)
    - [Extend context by authorization](#extend-context-by-authorization)
    - [Adding a voting feature](#adding-a-voting-feature)
    - [Separate all remaining resolvers](#separate-all-remaining-resolvers)
    - [Filtering](#filtering)
    - [Pagination](#pagination)
    - [Sorting](#sorting)
    - [Counting](#counting)
  - [Client](#client)
    - [Getting started](#getting-started-1)
    - [Loading links](#loading-links)
    - [Authentication](#authentication-1)
    - [Creating links](#creating-links)
    - [Routing](#routing)
    - [More mutations and Updating the store](#more-mutations-and-updating-the-store)
    - [Searching a link](#searching-a-link)
    - [Realtime updates with GraphQL subscriptions](#realtime-updates-with-graphql-subscriptions)
    - [Pagination](#pagination-1)

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

### Adding a database

Install Prisma CLI and init data source

```bash
npm i @prisma/cli@2.12 --save-dev
npx prisma init
```

Modify `./prisma/schema.prisma`

```diff
diff --git a/server/prisma/schema.prisma b/server/prisma/schema.prisma
index e99af20..5fe76d6 100644
--- a/server/prisma/schema.prisma
+++ b/server/prisma/schema.prisma
@@ -1,11 +1,15 @@
-// This is your Prisma schema file,
-// learn more about it in the docs: https://pris.ly/d/prisma-schema
-
 datasource db {
-  provider = "postgresql"
-  url      = env("DATABASE_URL")
+  provider = "sqlite"
+  url      = "file:./dev.db"
 }

 generator client {
   provider = "prisma-client-js"
 }
+
+model Link {
+  id          Int      @id @default(autoincrement())
+  createdAt   DateTime @default(now())
+  description String
+  url         String
+}
```

Init and run migrations

```bash
npx prisma migrate save --experimental
# You will get a prompt asking if you would like to create a new database.
# Select `Yes`, and type `init` for the Name of migration.
# The hit `Return` to confirm.

npx prisma migrate up --experimental
```

Generate the Prisma Client based on the data model

```bash
npx prisma generate
```

Using Prisma Studio

```bash
npx prisma studio
# If you used another Prisma version before, be sure to delete the IndexedDB in the browser before.
# `window.indexedDB.deleteDatabase('Prisma Studio')`
```

### Connect server and database

Instantiate the prisma client and inject it into the context

```diff
diff --git a/server/src/index.js b/server/src/index.js
index 577ccd8..bc31e08 100644
--- a/server/src/index.js
+++ b/server/src/index.js
@@ -2,6 +2,7 @@ const fs = require("fs")
 const path = require("path")

 const { ApolloServer } = require("apollo-server")
+const { PrismaClient } = require("@prisma/client")

 let links = [{
   id: "link-0",
@@ -33,9 +34,14 @@ const resolvers = {
   },
 }

+const prisma = new PrismaClient()
+
 const server = new ApolloServer({
   typeDefs: fs.readFileSync(path.join(__dirname, "schema.graphql"), "utf-8"),
   resolvers,
+  context: {
+    prisma,
+  },
 })

 server
```

Utilize the prisma client

```diff
diff --git a/server/src/index.js b/server/src/index.js
index bc31e08..f3125bf 100644
--- a/server/src/index.js
+++ b/server/src/index.js
@@ -4,27 +4,22 @@ const path = require("path")
 const { ApolloServer } = require("apollo-server")
 const { PrismaClient } = require("@prisma/client")

-let links = [{
-  id: "link-0",
-  url: "https://howtographql.com",
-  description: "Fullstack tutorial for GraphQL"
-}]
-let idCount = links.length
-
 const resolvers = {
   Query: {
     info: () => `This is the API of a Hackernews Clone`,
-    feed: () => links,
+    feed: async (parent, args, context) => {
+      return context.prisma.link.findMany()
+    },
   },
   Mutation: {
-    post: (parent, args) => {
-      const link = {
-        id: `link-${idCount++}`,
-        description: args.description,
-        url: args.url,
-      }
-      links.push(link)
-      return link
+    post: (parent, args, context, info) => {
+      const newLink = context.prisma.link.create({
+        data: {
+          url: args.url,
+          description: args.description,
+        },
+      })
+      return newLink
     },
   },
   Link: {
```

You can try it in the GraphQL Playground and all added links remain even after a server restart.

### Realtime subscriptions

Add `PubSub` to the server

```diff
diff --git a/server/src/index.js b/server/src/index.js
index f3125bf..9ded9ca 100644
--- a/server/src/index.js
+++ b/server/src/index.js
@@ -1,7 +1,7 @@
 const fs = require("fs")
 const path = require("path")

-const { ApolloServer } = require("apollo-server")
+const { ApolloServer, PubSub } = require("apollo-server")
 const { PrismaClient } = require("@prisma/client")

 const resolvers = {
@@ -30,12 +30,17 @@ const resolvers = {
 }

 const prisma = new PrismaClient()
+const pubsub = new PubSub()

 const server = new ApolloServer({
   typeDefs: fs.readFileSync(path.join(__dirname, "schema.graphql"), "utf-8"),
   resolvers,
-  context: {
-    prisma,
+  context: ({ req }) => {
+    return {
+      ...req,
+      prisma,
+      pubsub,
+    }
   },
 })
```

Modify the GraphQL schema and add the `Subscription` type

```graphql
type Subscription {
  newLink: Link
}
```

Create a resolver for the subscription as `./src/resolvers/Subscription.js`

```js
function newLinkSubscribe(parent, args, context, info) {
  return context.pubsub.asyncIterator("NEW_LINK")
}

const newLink = {
  subscribe: newLinkSubscribe,
  resolve: payload => {
    return payload
  },
}

module.exports = {
  newLink,
}
```

Outsource the resolver for the mutation as well as `./src/resolvers/Mutation.js`

```js
async function post(parent, args, context, info) {
  const newLink = await context.prisma.link.create({
    data: {
      url: args.url,
      description: args.description
    },
  })
  context.pubsub.publish("NEW_LINK", newLink)

  return newLink
}

module.exports = {
  post,
}
```

Modify the server code

```diff
diff --git a/server/src/index.js b/server/src/index.js
index 9ded9ca..168b970 100644
--- a/server/src/index.js
+++ b/server/src/index.js
@@ -4,6 +4,9 @@ const path = require("path")
 const { ApolloServer, PubSub } = require("apollo-server")
 const { PrismaClient } = require("@prisma/client")

+const Mutation = require('./resolvers/Mutation')
+const Subscription = require('./resolvers/Subscription')
+
 const resolvers = {
   Query: {
     info: () => `This is the API of a Hackernews Clone`,
@@ -11,17 +14,8 @@ const resolvers = {
       return context.prisma.link.findMany()
     },
   },
-  Mutation: {
-    post: (parent, args, context, info) => {
-      const newLink = context.prisma.link.create({
-        data: {
-          url: args.url,
-          description: args.description,
-        },
-      })
-      return newLink
-    },
-  },
+  Mutation,
+  Subscription,
   Link: {
     id: (parent) => parent.id,
     description: (parent) => parent.description,
```

You can test the subscription by using the following queries in different tabs of the GraphQL playground

```graphql
subscription onNewLink {
  newLink {
    id
    url
    description
  }
}
```

```graphql
mutation newLink {
  post(url: "https://graphqlweekly.com", description: "Curated GraphQL content coming to your email inbox every Friday") {
    id
  }
}
```

### Authentication

Install `bcrypt` and `jsonwebtoken`

```bash
npm i bcryptjs@^2.4 jsonwebtoken@^8.5 --save
```

Enhance GraphQL schema in `./src/schema.graphql`

```graphql
diff --git a/server/src/schema.graphql b/server/src/schema.graphql
index a72a082..83c7984 100644
--- a/server/src/schema.graphql
+++ b/server/src/schema.graphql
@@ -5,6 +5,8 @@ type Query {

 type Mutation {
   post(url: String!, description: String!): Link!
+  signup(email: String!, password: String!, name: String!): AuthPayload
+  login(email: String!, password: String!): AuthPayload
 }

 type Subscription {
@@ -16,3 +18,14 @@ type Link {
   description: String!
   url: String!
 }
+
+type User {
+  id: ID!
+  name: String!
+  email: String!
+}
+
+type AuthPayload {
+  token: String
+  user: User
+}
```

Enhance Prisma schema in `./prisma/schema.prisma`

```prisma
model User {
  id       Int    @id @default(autoincrement())
  name     String
  email    String @unique
  password String
}
```

Migrate database schema

```bash
npx prisma migrate save --name "add-user-model" --experimental
npx prisma migrate up --experimental
```

Apply the changes and update Prisma Client API

```bash
npx prisma generate
```

Signup and login mutations

```diff
diff --git a/server/src/resolvers/Mutation.js b/server/src/resolvers/Mutation.js
index 5337e0b..0218aad 100644
--- a/server/src/resolvers/Mutation.js
+++ b/server/src/resolvers/Mutation.js
@@ -1,3 +1,8 @@
+const bcrypt = require("bcryptjs")
+const jwt = require("jsonwebtoken")
+
+const APP_SECRET = "GraphQL-is-aw3some"
+
 async function post(parent, args, context, info) {
   const newLink = await context.prisma.link.create({
     data: {
@@ -10,6 +15,34 @@ async function post(parent, args, context, info) {
   return newLink
 }

+async function signup(parent, args, context, info) {
+  const password = await bcrypt.hash(args.password, 10)
+  const user = await context.prisma.user.create({
+    data: { ...args, password }
+  })
+  const token = jwt.sign({ userId: user.id }, APP_SECRET)
+  return { token, user }
+}
+
+async function login(parent, args, context, info) {
+  const user = await context.prisma.user.findUnique({
+    where: { email: args.email }
+  })
+  if (!user) {
+    throw new Error("No such user found")
+  }
+
+  const valid = await bcrypt.compare(args.password, user.password)
+  if (!valid) {
+    throw new Error("Invalid password")
+  }
+
+  const token = jwt.sign({ userId: user.id }, APP_SECRET)
+  return { token, user }
+}
+
 module.exports = {
   post,
+  signup,
+  login,
 }
```

To sign up and login use the following mutations

```graphql
mutation signMeUp {
  signup(email: "mail@example.com", password: "password", name: "Marco") {
    token
    user {
      id
      name
      email
    }
  }
}

mutation logMeIn {
  login(email: "mail@example.com", password: "password") {
    token
    user {
      id
      name
      email
    }
  }
}
```

### Extend context by authorization

Add the current user ID into the context if the respective authorization header holding a JWT is correct

```diff
diff --git a/server/src/index.js b/server/src/index.js
index 168b970..4278f33 100644
--- a/server/src/index.js
+++ b/server/src/index.js
@@ -1,5 +1,6 @@
 const fs = require("fs")
 const path = require("path")
+const jwt = require("jsonwebtoken")

 const { ApolloServer, PubSub } = require("apollo-server")
 const { PrismaClient } = require("@prisma/client")
@@ -26,6 +27,24 @@ const resolvers = {
 const prisma = new PrismaClient()
 const pubsub = new PubSub()

+const APP_SECRET = "GraphQL-is-aw3some"
+
+const getUserId = (req) => {
+  if (req) {
+    const authHeader = req.headers.authorization
+    if (authHeader) {
+      const token = authHeader.replace("Bearer ", "")
+      if (!token) {
+        throw new Error("No token found")
+      }
+      const { userId } = jwt.verify(token, APP_SECRET)
+      return userId
+    }
+  }
+
+  throw new Error("Not authenticated")
+}
+
 const server = new ApolloServer({
   typeDefs: fs.readFileSync(path.join(__dirname, "schema.graphql"), "utf-8"),
   resolvers,
@@ -34,6 +53,10 @@ const server = new ApolloServer({
       ...req,
       prisma,
       pubsub,
+      userId:
+        req && req.headers.authorization
+          ? getUserId(req)
+          : null
     }
   },
 })
```

Use this user ID to populate the soon to be added `postedBy` field

```diff
diff --git a/server/src/resolvers/Mutation.js b/server/src/resolvers/Mutation.js
index 0218aad..10fb12e 100644
--- a/server/src/resolvers/Mutation.js
+++ b/server/src/resolvers/Mutation.js
@@ -4,10 +4,12 @@ const jwt = require("jsonwebtoken")
 const APP_SECRET = "GraphQL-is-aw3some"

 async function post(parent, args, context, info) {
+  const { userId } = context
   const newLink = await context.prisma.link.create({
     data: {
       url: args.url,
-      description: args.description
+      description: args.description,
+      postedBy: { connect: { id: userId } }
     },
   })
   context.pubsub.publish("NEW_LINK", newLink)
```

Extend the GraphQL type definitions

```diff
diff --git a/server/src/schema.graphql b/server/src/schema.graphql
index 83c7984..4fb3627 100644
--- a/server/src/schema.graphql
+++ b/server/src/schema.graphql
@@ -17,15 +17,20 @@ type Link {
   id: ID!
   description: String!
   url: String!
+  postedBy: User
+  createdAt: DateTime!
 }

 type User {
   id: ID!
   name: String!
   email: String!
+  links: [Link!]!
 }

 type AuthPayload {
   token: String
   user: User
 }
+
+scalar DateTime
```

Extend the Prisma schema as well

```diff
diff --git a/server/prisma/schema.prisma b/server/prisma/schema.prisma
index ee7a53b..dfee2fe 100644
--- a/server/prisma/schema.prisma
+++ b/server/prisma/schema.prisma
@@ -12,6 +12,8 @@ model Link {
   createdAt   DateTime @default(now())
   description String
   url         String
+  postedBy    User     @relation(fields: [postedById], references: [id])
+  postedById  Int
 }

 model User {
@@ -19,4 +21,5 @@ model User {
   name     String
   email    String @unique
   password String
+  links    Link[]
 }
```

Migrate database schema

```bash
npx prisma migrate save --name "add-user-relation" --experimental
npx prisma migrate up --experimental
```

Apply the changes and update Prisma Client API

```bash
npx prisma generate
```

To test the whole cycle you first need to sign up or – if already done – login. Copy the token you receive and set a respective `Authorization` header for creating a new link.

### Adding a voting feature

Extend the prisma schema

```diff
diff --git a/server/prisma/schema.prisma b/server/prisma/schema.prisma
index dfee2fe..d1ed15f 100644
--- a/server/prisma/schema.prisma
+++ b/server/prisma/schema.prisma
@@ -14,6 +14,7 @@ model Link {
   url         String
   postedBy    User     @relation(fields: [postedById], references: [id])
   postedById  Int
+  votes       Vote[]
 }

 model User {
@@ -22,4 +23,14 @@ model User {
   email    String @unique
   password String
   links    Link[]
+  votes    Vote[]
+}
+
+model Vote {
+  id     Int  @id @default(autoincrement())
+  link   Link @relation(fields: [linkId], references: [id])
+  linkId Int
+  user   User @relation(fields: [userId], references: [id])
+  userId Int
+  @@unique([linkId, userId])
 }
```

Migrate database schema

```bash
npx prisma migrate save --name "add-vote-model" --experimental
npx prisma migrate up --experimental
```

Apply the changes and update Prisma Client API

```bash
npx prisma generate
```

Separate utility methods for convenience in `./src/utils.js`

```js
const jwt = require("jsonwebtoken")
const APP_SECRET = "GraphQL-is-aw3some"

const getUserId = (req) => {
  if (req) {
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "")
      if (!token) {
        throw new Error("No token found")
      }
      const { userId } = jwt.verify(token, APP_SECRET)
      return userId
    }
  }

  throw new Error("Not authenticated")
}

module.exports = {
  getUserId,
}
```

Create a separate resolver for the newly added type `Vote` as `./src/resolvers/Vote.js`

```js
function link(parent, args, context) {
  return context.prisma.vote
    .findUnique({ where: { id: parent.id } })
    .link()
}

function user(parent, args, context) {
  return context.prisma.vote
    .findUnique({ where: { id: parent.id } })
    .user()
}

module.exports = {
  link,
  user,
}
```

Adjust the server code to include this new resolver and remove unnecessary utility code

```diff
diff --git a/server/src/index.js b/server/src/index.js
index 02255e5..8996e41 100644
--- a/server/src/index.js
+++ b/server/src/index.js
@@ -1,12 +1,14 @@
 const fs = require("fs")
 const path = require("path")
-const jwt = require("jsonwebtoken")

 const { ApolloServer, PubSub } = require("apollo-server")
 const { PrismaClient } = require("@prisma/client")

 const Mutation = require('./resolvers/Mutation')
 const Subscription = require('./resolvers/Subscription')
+const Vote = require('./resolvers/Vote')
+
+const { getUserId } = require('./utils')

 const resolvers = {
   Query: {
@@ -22,29 +24,12 @@ const resolvers = {
     description: (parent) => parent.description,
     url: (parent) => parent.url,
   },
+  Vote,
 }

 const prisma = new PrismaClient()
 const pubsub = new PubSub()

-const APP_SECRET = "GraphQL-is-aw3some"
-
-const getUserId = (req) => {
-  if (req) {
-    const authHeader = req.headers.authorization
-    if (authHeader) {
-      const token = authHeader.replace("Bearer ", "")
-      if (!token) {
-        throw new Error("No token found")
-      }
-      const { userId } = jwt.verify(token, APP_SECRET)
-      return userId
-    }
-  }
-
-  throw new Error("Not authenticated")
-}
-
 const server = new ApolloServer({
   typeDefs: fs.readFileSync(path.join(__dirname, "schema.graphql"), "utf-8"),
   resolvers,
```

Finally, adjust mutations and subscriptions

```diff
diff --git a/server/src/resolvers/Mutation.js b/server/src/resolvers/Mutation.js
index 10fb12e..723b1b9 100644
--- a/server/src/resolvers/Mutation.js
+++ b/server/src/resolvers/Mutation.js
@@ -43,8 +43,35 @@ async function login(parent, args, context, info) {
   return { token, user }
 }

+async function vote(parent, args, context, info) {
+  const { userId } = context
+  const vote = await context.prisma.vote.findUnique({
+    where: {
+      linkId_userId: {
+        linkId: Number(args.linkId),
+        userId: userId
+      }
+    }
+  })
+
+  if (Boolean(vote)) {
+    throw new Error(`Already voted for link: ${args.linkId}`)
+  }
+
+  const newVote = context.prisma.vote.create({
+    data: {
+      user: { connect: { id: userId } },
+      link: { connect: { id: Number(args.linkId) } },
+    }
+  })
+  context.pubsub.publish("NEW_VOTE", newVote)
+
+  return newVote
+}
+
 module.exports = {
   post,
   signup,
   login,
+  vote,
 }
```

```diff
diff --git a/server/src/resolvers/Subscription.js b/server/src/resolvers/Subscription.js
index 7150405..a95a612 100644
--- a/server/src/resolvers/Subscription.js
+++ b/server/src/resolvers/Subscription.js
@@ -9,6 +9,18 @@ const newLink = {
   },
 }

+function newVoteSubscribe(parent, args, context, info) {
+  return context.pubsub.asyncIterator("NEW_VOTE")
+}
+
+const newVote = {
+  subscribe: newVoteSubscribe,
+  resolve: payload => {
+    return payload
+  },
+}
+
 module.exports = {
   newLink,
+  newVote,
 }
```

### Separate all remaining resolvers

`./src/resolvers/Link.js`

```js
function postedBy(parent, args, context) {
  return context.prisma.link
    .findUnique({ where: { id: parent.id } })
    .postedBy()
}

function votes(parent, args, context) {
  return context.prisma.link
    .findUnique({ where: { id: parent.id } })
    .votes()
}

module.exports = {
  postedBy,
  votes,
}
```

`./src/resolvers/Query.js`

```js
async function feed(parent, args, context, info) {
  return context.prisma.link.findMany()
}

module.exports = {
  feed,
}
```

`./src/resolvers/User.js`

```js
function links(parent, args, context) {
  return context.prisma.user
    .findUnique({ where: { id: parent.id } })
    .links()
}

module.exports = {
  links,
}
```

Finally, modify the server code

```diff
diff --git a/server/src/index.js b/server/src/index.js
index 8996e41..33d81eb 100644
--- a/server/src/index.js
+++ b/server/src/index.js
@@ -4,26 +4,19 @@ const path = require("path")
 const { ApolloServer, PubSub } = require("apollo-server")
 const { PrismaClient } = require("@prisma/client")

+const Link = require('./resolvers/Link')
 const Mutation = require('./resolvers/Mutation')
+const Query = require('./resolvers/Query')
 const Subscription = require('./resolvers/Subscription')
+const User = require('./resolvers/User')
 const Vote = require('./resolvers/Vote')

 const { getUserId } = require('./utils')

 const resolvers = {
-  Query: {
-    info: () => `This is the API of a Hackernews Clone`,
-    feed: async (parent, args, context) => {
-      return context.prisma.link.findMany()
-    },
-  },
+  Query,
   Mutation,
   Subscription,
-  Link: {
-    id: (parent) => parent.id,
-    description: (parent) => parent.description,
-    url: (parent) => parent.url,
-  },
+  Link,
   Vote,
+  User,
 }
```

### Filtering

First modify the query definition for `feed`

```diff
diff --git a/server/src/schema.graphql b/server/src/schema.graphql
index 95590a2..0920c9e 100644
--- a/server/src/schema.graphql
+++ b/server/src/schema.graphql
@@ -1,6 +1,6 @@
 type Query {
   info: String!
-  feed: [Link!]!
+  feed(filter: String): [Link!]!
 }

 type Mutation {
```

Then incorporate the filter into the resolver function

```diff
diff --git a/server/src/resolvers/Query.js b/server/src/resolvers/Query.js
index 3ce3250..31cba7a 100644
--- a/server/src/resolvers/Query.js
+++ b/server/src/resolvers/Query.js
@@ -1,5 +1,17 @@
 async function feed(parent, args, context, info) {
-  return context.prisma.link.findMany()
+  const where = args.filter
+    ? {
+      OR: [
+        { description: { contains: args.filter } },
+        { url: { contains: args.filter } },
+      ],
+    } : {}
+
+  const links = await context.prisma.link.findMany({
+    where,
+  })
+
+  return links
 }

 module.exports = {
```

Now you can query using the filter

```graphql
query {
  feed(filter: "QL") {
    id
    description
    url
    postedBy {
      id
      name
    }
  }
}
```

### Pagination

First modify the query definition for `feed`

```diff
diff --git a/server/src/schema.graphql b/server/src/schema.graphql
index 0920c9e..718fac5 100644
--- a/server/src/schema.graphql
+++ b/server/src/schema.graphql
@@ -1,6 +1,6 @@
 type Query {
   info: String!
-  feed(filter: String): [Link!]!
+  feed(filter: String, skip: Int, take: Int): [Link!]!
 }

 type Mutation {
```

Then incorporate the pagination into the resolver function

```diff
diff --git a/server/src/resolvers/Query.js b/server/src/resolvers/Query.js
index 31cba7a..d64a5f6 100644
--- a/server/src/resolvers/Query.js
+++ b/server/src/resolvers/Query.js
@@ -9,6 +9,8 @@ async function feed(parent, args, context, info) {

   const links = await context.prisma.link.findMany({
     where,
+    skip: args.skip,
+    take: args.take,
   })

   return links
```

Now you can query using the pagination

```graphql
query {
  feed(take: 1, skip: 1) {
    id
    description
    url
  }
}
```

### Sorting

First modify the query definition for `feed` and add sort criteria rules

```diff
diff --git a/server/src/schema.graphql b/server/src/schema.graphql
index 718fac5..43cdb63 100644
--- a/server/src/schema.graphql
+++ b/server/src/schema.graphql
@@ -1,6 +1,6 @@
 type Query {
   info: String!
-  feed(filter: String, skip: Int, take: Int): [Link!]!
+  feed(filter: String, skip: Int, take: Int, orderBy: LinkOrderByInput): [Link!]!
 }

 type Mutation {
@@ -44,3 +44,14 @@ type AuthPayload {
 }

 scalar DateTime
+
+input LinkOrderByInput {
+  description: Sort
+  url: Sort
+  createdAt: Sort
+}
+
+enum Sort {
+  asc
+  desc
+}
```

Then incorporate the sorting into the resolver function

```diff
diff --git a/server/src/resolvers/Query.js b/server/src/resolvers/Query.js
index d64a5f6..33caf53 100644
--- a/server/src/resolvers/Query.js
+++ b/server/src/resolvers/Query.js
@@ -11,6 +11,7 @@ async function feed(parent, args, context, info) {
     where,
     skip: args.skip,
     take: args.take,
+    orderBy: args.orderBy,
   })

   return links
```

Now you can query using the sorting

```graphql
query {
  feed(orderBy: { createdAt: asc }) {
    id
    description
    url
    createdAt
  }
}
```

### Counting

First modify the query definition for `feed` and add a sub-type

```diff
diff --git a/server/src/schema.graphql b/server/src/schema.graphql
index 43cdb63..0fed02b 100644
--- a/server/src/schema.graphql
+++ b/server/src/schema.graphql
@@ -1,6 +1,6 @@
 type Query {
   info: String!
-  feed(filter: String, skip: Int, take: Int, orderBy: LinkOrderByInput): [Link!]!
+  feed(filter: String, skip: Int, take: Int, orderBy: LinkOrderByInput): Feed!
 }

 type Mutation {
@@ -38,6 +38,11 @@ type Vote {
   user: User!
 }

+type Feed {
+  links: [Link!]!
+  count: Int!
+}
+
 type AuthPayload {
   token: String
   user: User
```

Then incorporate the counting into the resolver function

```diff
diff --git a/server/src/resolvers/Query.js b/server/src/resolvers/Query.js
index 33caf53..81c450f 100644
--- a/server/src/resolvers/Query.js
+++ b/server/src/resolvers/Query.js
@@ -14,7 +14,12 @@ async function feed(parent, args, context, info) {
     orderBy: args.orderBy,
   })

-  return links
+  const count = await context.prisma.link.count({ where })
+
+  return {
+    links,
+    count,
+  }
 }

 module.exports = {
```

Now you can query and get back the actual count

```graphql
query {
  feed {
    count
    links {
      id
      description
      url
    }
  }
}
```

## Client

Change into the root directory `/client`.

### Getting started

First we create the app

```bash
create-react-app client
cd client
yarn start
```

After that we prepare the styling

```diff
diff --git a/client/public/index.html b/client/public/index.html
index aa069f2..67b1127 100644
--- a/client/public/index.html
+++ b/client/public/index.html
@@ -3,6 +3,7 @@
   <head>
     <meta charset="utf-8" />
     <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
+    <link rel="stylesheet" href="https://unpkg.com/tachyons@4.12.0/css/tachyons.min.css" />
     <meta name="viewport" content="width=device-width, initial-scale=1" />
     <meta name="theme-color" content="#000000" />
     <meta
```

Replace the contents of `./src/styles/index.css` as follows

```css
body {
  margin: 0;
  padding: 0;
  font-family: Verdana, Geneva, sans-serif;
}

input {
  max-width: 500px;
}

.gray {
  color: #828282;
}

.orange {
  background-color: #ff6600;
}

.background-gray {
  background-color: rgb(246, 246, 239);
}

.f11 {
  font-size: 11px;
}

.w85 {
  width: 85%;
}

.button {
  font-family: monospace;
  font-size: 10pt;
  color: black;
  background-color: buttonface;
  text-align: center;
  padding: 2px 6px 3px;
  border-width: 2px;
  border-style: outset;
  border-color: buttonface;
  cursor: pointer;
  max-width: 250px;
}
```

Now we install and configure the Apollo client

```bash
yarn add @apollo/client graphql
```

```diff
diff --git a/client/src/index.js b/client/src/index.js
index f2dcf42..3ded303 100644
--- a/client/src/index.js
+++ b/client/src/index.js
@@ -4,10 +4,26 @@ import './styles/index.css';
 import App from './components/App';
 import reportWebVitals from './reportWebVitals';

+import {
+  ApolloProvider,
+  ApolloClient,
+  createHttpLink,
+  InMemoryCache
+} from '@apollo/client'
+
+const httpLink = createHttpLink({
+  uri: 'http://localhost:4000',
+})
+
+const client = new ApolloClient({
+  link: httpLink,
+  cache: new InMemoryCache(),
+})
+
 ReactDOM.render(
-  <React.StrictMode>
+  <ApolloProvider client={client}>
     <App />
-  </React.StrictMode>,
+  </ApolloProvider>,
   document.getElementById('root')
 );
```

### Loading links

Add `./src/components/Link.js` and `./src/components/LinkList.js`

```js
import React from 'react'

const Link = (props) => {
  const { link } = props
  return (
    <div>
      <div>
        {link.description} ({link.url})
      </div>
    </div>
  )
}

export default Link
```

```js
import React from 'react'
import Link from './Link'

const LinkList = () => {
  const linksToRender = [
    {
      id: '1',
      description: 'Prisma gives you a powerful database toolkit 😎',
      url: 'https://prisma.io'
    },
    {
      id: '2',
      description: 'The best GraphQL client',
      url: 'https://www.apollographql.com/docs/react/'
    }
  ]

  return (
    <div>
      {linksToRender.map((link) => (
        <Link key={link.id} link={link} />
      ))}
    </div>
  )
}

export default LinkList
```

And replace the contents of `./src/components/App.js` with

```js
import React, { Component } from 'react'
import LinkList from './LinkList'

class App extends Component {
  render() {
    return <LinkList />
  }
}

export default App
```

Now we using Apollo client to actually query the backend. Make sure that it runs in a different terminal running `npm start` from within the `/server` directory.

```diff
diff --git a/client/src/components/LinkList.js b/client/src/components/LinkList.js
index c4f726e..21923fc 100644
--- a/client/src/components/LinkList.js
+++ b/client/src/components/LinkList.js
@@ -1,25 +1,32 @@
 import React from 'react'
 import Link from './Link'
+import { useQuery, gql } from '@apollo/client'

-const LinkList = () => {
-  const linksToRender = [
-    {
-      id: '1',
-      description: 'Prisma gives you a powerful database toolkit 😎',
-      url: 'https://prisma.io'
-    },
-    {
-      id: '2',
-      description: 'The best GraphQL client',
-      url: 'https://www.apollographql.com/docs/react/'
+const FEED_QUERY = gql`
+  {
+    feed {
+      links {
+        id
+        createdAt
+        url
+        description
+      }
     }
-  ]
+  }
+`
+
+const LinkList = () => {
+  const { data } = useQuery(FEED_QUERY)

   return (
     <div>
-      {linksToRender.map((link) => (
-        <Link key={link.id} link={link} />
-      ))}
+      {data && (
+        <React.Fragment>
+          {data.feed.links.map((link) => (
+            <Link key={link.id} link={link} />
+          ))}
+        </React.Fragment>
+      )}
     </div>
   )
 }
```

### Authentication

Before we can mutate data we need to handle authentication

> **Warning**: Storing JWTs in `localStorage` is not a safe approach to implement authentication on the frontend.

Add `./src/constants.js`

```js
export const AUTH_TOKEN = 'auth-token'
```

Add the login component as `./src/components/Login.js`

```js
import React, { useState } from 'react'
import { gql, useMutation } from '@apollo/client'
import { AUTH_TOKEN } from '../constants'

const SIGNUP_MUTATION = gql`
  mutation SignupMutation(
    $email: String!
    $password: String!
    $name: String!
  ) {
    signup(
      email: $email
      password: $password
      name: $name
    ) {
      token
    }
  }
`

const LOGIN_MUTATION = gql`
  mutation LoginMutation(
    $email: String!
    $password: String!
  ) {
    login(
      email: $email
      password: $password
    ) {
      token
    }
  }
`

const Login = () => {
  const [formState, setFormState] = useState({
    login: true,
    email: '',
    password: '',
    name: '',
  })

  const [login] = useMutation(LOGIN_MUTATION, {
    variables: {
      email: formState.email,
      password: formState.password,
    },
    onCompleted: ({ login }) => {
      localStorage.setItem(AUTH_TOKEN, login.token)
    },
  })

  const [signup] = useMutation(SIGNUP_MUTATION, {
    variables: {
      name: formState.name,
      email: formState.email,
      password: formState.password,
    },
    onCompleted: ({ signup }) => {
      localStorage.setItem(AUTH_TOKEN, login.token)
    },
  })

  return (
    <div>
      <h4 className="mv3">
        {formState.login ? 'Login' : 'Sign up'}
      </h4>
      <div className="flex flex-column">
        {!formState.login && (
          <input value={formState.name} onChange={(e) => {
            setFormState({
              ...formState,
              name: e.target.value,
            })
          }} type="text" placeholder="Your name" />
        )}
        <input value={formState.email} onChange={(e) => {
          setFormState({
            ...formState,
            email: e.target.value,
          })
        }} type="text" placeholder="Your email address" />
        <input value={formState.password} onChange={(e) => {
          setFormState({
            ...formState,
            password: e.target.value,
          })
        }} type="password" placeholder="Choose a safe password" />
      </div>
      <div className="flex mt3">
        <button className="pointer mr2 button" onClick={formState.login ? login : signup}>
          {formState.login ? 'login' : 'create account'}
        </button>
        <button className="pointer button" onClick={(e) => {
          setFormState({
            ...formState,
            login: !formState.login
          })
        }}>
          {formState.login
            ? 'need to create an account?'
            : 'already have an account?' }
        </button>
      </div>
    </div>
  )
}

export default Login
```

Include the `Login` component into the `App` component

```diff
diff --git a/client/src/components/App.js b/client/src/components/App.js
index e47b648..4ce8dd6 100644
--- a/client/src/components/App.js
+++ b/client/src/components/App.js
@@ -1,9 +1,15 @@
 import React, { Component } from 'react'
 import LinkList from './LinkList'
+import Login from './Login'

 class App extends Component {
   render() {
-    return <LinkList />
+    return (
+      <React.Fragment>
+        <Login />
+        <LinkList />
+      </React.Fragment>
+    )
   }
 }
```

Finally inject the `Authorization` header into the `link` property of the Apollo client

```diff
diff --git a/client/src/index.js b/client/src/index.js
index 3ded303..fdb5290 100644
--- a/client/src/index.js
+++ b/client/src/index.js
@@ -10,13 +10,25 @@ import {
   createHttpLink,
   InMemoryCache
 } from '@apollo/client'
+import { setContext } from '@apollo/client/link/context'
+import { AUTH_TOKEN } from './constants'

 const httpLink = createHttpLink({
   uri: 'http://localhost:4000',
 })

+const authLink = setContext((_, { headers }) => {
+  const token = localStorage.getItem(AUTH_TOKEN)
+  return {
+    headers: {
+      ...headers,
+      authorization: token ? `Bearer ${token}`: ''
+    },
+  }
+})
+
 const client = new ApolloClient({
-  link: httpLink,
+  link: authLink.concat(httpLink),
   cache: new InMemoryCache(),
 })
```

### Creating links

First create the new `./src/components/CreateLink.js` component

```js
import React, { useState } from 'react'
import { useMutation, gql } from '@apollo/client'

const CREATE_LINK_MUTATION = gql`
  mutation PostMutation(
    $description: String!
    $url: String!
  ) {
    post(description: $description, url: $url) {
      id
      createdAt
      url
      description
    }
  }
`

const CreateLink = () => {
  const [formState, setFormState] = useState({
    description: '',
    url: '',
  })

  const [createLink] = useMutation(CREATE_LINK_MUTATION, {
    variables: {
      description: formState.description,
      url: formState.url,
    },
  })

  return (
    <div>
      <form onSubmit={(e) => {
        e.preventDefault()
        createLink()
      }}>
        <div className="flex flex-column mt3">
          <input className="mb2" value={formState.description} onChange={(e) => {
            setFormState({
              ...formState,
              description: e.target.value,
            })
          }} type="text" placeholder="A description for the link" />
          <input className="mb2" value={formState.url} onChange={(e) => {
            setFormState({
              ...formState,
              url: e.target.value,
            })
          }} type="text" placeholder="The URL for the link" />
        </div>
        <button type="submit">Submit</button>
      </form>
    </div>
  )
}

export default CreateLink
```

Second, include it into the `App` component

```diff
diff --git a/client/src/components/App.js b/client/src/components/App.js
index 4ce8dd6..facd262 100644
--- a/client/src/components/App.js
+++ b/client/src/components/App.js
@@ -1,4 +1,5 @@
 import React, { Component } from 'react'
+import CreateLink from './CreateLink'
 import LinkList from './LinkList'
 import Login from './Login'

@@ -7,6 +8,7 @@ class App extends Component {
     return (
       <React.Fragment>
         <Login />
+        <CreateLink />
         <LinkList />
       </React.Fragment>
     )
```

Don’t wonder… Currently there is no user feedback. But you can always check the state of the database by running `npx prisma studio`.

### Routing

Add React Router to implement a navigation

```bash
yarn add react-router react-router-dom
```

Create a `./src/components/Header.js` component

```js
import React from 'react'
import { Link } from 'react-router-dom'

const Header = () => {
  return (
    <div className="flex pa1 justify-between nowrap orange">
      <div className="flex flex-fixed black">
        <div className="fw7 mr1">Hacker News</div>
        <Link to="/" className="ml1 no-underline black">new</Link>
        <div className="ml1">|</div>
        <Link to="/create" className="ml1 no-underline black">submit</Link>
      </div>
    </div>
  )
}

export default Header
```

Next we add the router to the `App` component

```diff
diff --git a/client/src/components/App.js b/client/src/components/App.js
index facd262..f5b599c 100644
--- a/client/src/components/App.js
+++ b/client/src/components/App.js
@@ -1,16 +1,21 @@
 import React, { Component } from 'react'
+import { Route, Switch } from 'react-router'
 import CreateLink from './CreateLink'
+import Header from './Header'
 import LinkList from './LinkList'
-import Login from './Login'

 class App extends Component {
   render() {
     return (
-      <React.Fragment>
-        <Login />
-        <CreateLink />
-        <LinkList />
-      </React.Fragment>
+      <div className="center w85">
+        <Header />
+        <div className="ph3 pv1 background-gray">
+          <Switch>
+            <Route exact path="/" component={LinkList} />
+            <Route exact path="/create" component={CreateLink} />
+          </Switch>
+        </div>
+      </div>
     )
   }
 }
```

Now we implement a redirect to the main route after creating a link

```diff
diff --git a/client/src/components/CreateLink.js b/client/src/components/CreateLink.js
index 0a80ce2..332a976 100644
--- a/client/src/components/CreateLink.js
+++ b/client/src/components/CreateLink.js
@@ -1,5 +1,6 @@
 import React, { useState } from 'react'
 import { useMutation, gql } from '@apollo/client'
+import { useHistory } from 'react-router'

 const CREATE_LINK_MUTATION = gql`
   mutation PostMutation(
@@ -16,6 +17,8 @@ const CREATE_LINK_MUTATION = gql`
 `

 const CreateLink = () => {
+  const history = useHistory()
+
   const [formState, setFormState] = useState({
     description: '',
     url: '',
@@ -26,6 +29,7 @@ const CreateLink = () => {
       description: formState.description,
       url: formState.url,
     },
+    onCompleted: () => history.push('/'),
   })

   return (
```

Next we add the login route to the `App` component

```diff
diff --git a/client/src/components/App.js b/client/src/components/App.js
index f5b599c..0d9446d 100644
--- a/client/src/components/App.js
+++ b/client/src/components/App.js
@@ -3,6 +3,7 @@ import { Route, Switch } from 'react-router'
 import CreateLink from './CreateLink'
 import Header from './Header'
 import LinkList from './LinkList'
+import Login from './Login'

 class App extends Component {
   render() {
@@ -13,6 +14,7 @@ class App extends Component {
           <Switch>
             <Route exact path="/" component={LinkList} />
             <Route exact path="/create" component={CreateLink} />
+            <Route exact path="/login" component={Login} />
           </Switch>
         </div>
       </div>
```

Finally we adjust the `Header` component to reflect the authorization state

```diff
diff --git a/client/src/components/Header.js b/client/src/components/Header.js
index c3ae43f..b9ef8a8 100644
--- a/client/src/components/Header.js
+++ b/client/src/components/Header.js
@@ -1,14 +1,33 @@
 import React from 'react'
+import { useHistory } from 'react-router'
 import { Link } from 'react-router-dom'
+import { AUTH_TOKEN } from '../constants'

 const Header = () => {
+  const history = useHistory()
+  const authToken = localStorage.getItem(AUTH_TOKEN)
+
   return (
     <div className="flex pa1 justify-between nowrap orange">
       <div className="flex flex-fixed black">
         <div className="fw7 mr1">Hacker News</div>
         <Link to="/" className="ml1 no-underline black">new</Link>
-        <div className="ml1">|</div>
-        <Link to="/create" className="ml1 no-underline black">submit</Link>
+        {authToken && (
+          <div className="flex">
+            <div className="ml1">|</div>
+            <Link to="/create" className="ml1 no-underline black">submit</Link>
+          </div>
+        )}
+      </div>
+      <div className="flex flex-fixed">
+        {authToken ? (
+          <div className="ml1 pointer black" onClick={() => {
+            localStorage.removeItem(AUTH_TOKEN)
+            history.push(`/`)
+          }}>logout</div>
+        ) : (
+          <Link to="/login" className="ml1 no-underline black">login</Link>
+        )}
       </div>
     </div>
   )
```

The main route doesn’t update yet – this will come later

### More mutations and Updating the store

First we enhance the GraphQL query to also contain the author and the votes of a link

```diff
diff --git a/client/src/components/LinkList.js b/client/src/components/LinkList.js
index 21923fc..8bae72c 100644
--- a/client/src/components/LinkList.js
+++ b/client/src/components/LinkList.js
@@ -10,6 +10,16 @@ const FEED_QUERY = gql`
         createdAt
         url
         description
+        postedBy {
+          id
+          name
+        }
+        votes {
+          id
+          user {
+            id
+          }
+        }
       }
     }
   }
@@ -22,8 +32,8 @@ const LinkList = () => {
     <div>
       {data && (
         <React.Fragment>
-          {data.feed.links.map((link) => (
-            <Link key={link.id} link={link} />
+          {data.feed.links.map((link, index) => (
+            <Link key={link.id} link={link} index={index} />
           ))}
         </React.Fragment>
       )}
```

Then we display the new information in the `Link` component

```diff
diff --git a/client/src/components/Link.js b/client/src/components/Link.js
index 4c96063..1d6a3ab 100644
--- a/client/src/components/Link.js
+++ b/client/src/components/Link.js
@@ -1,11 +1,30 @@
 import React from 'react'
+import { AUTH_TOKEN } from '../constants'
+import { timeDifferenceForDate } from '../utils'

 const Link = (props) => {
   const { link } = props
+  const authToken = localStorage.getItem(AUTH_TOKEN)
+
   return (
-    <div>
-      <div>
-        {link.description} ({link.url})
+    <div className="flex mt2 items-start">
+      <div className="flex items-center">
+        <span className="gray">{props.index + 1}.</span>
+        {authToken && (
+          <div className="ml1 gray f11" style={{ cursor: 'pointer' }}>▲</div>
+        )}
+      </div>
+      <div className="ml1">
+        <div>
+          {link.description} ({link.url})
+        </div>
+        {authToken && (
+          <div className="f6 lh-copy gray">
+            {link.votes.length} votes | by{' '}
+            {link.postedBy ? link.postedBy.name : 'Unknown'}{' '}
+            {timeDifferenceForDate(link.createdAt)}
+          </div>
+        )}
       </div>
     </div>
   )
```

The function `timeDifferenceForDate` is implemented inside `./src/utils.js`. Now we call the actual mutation to vote.

```diff
diff --git a/client/src/components/Link.js b/client/src/components/Link.js
index 1d6a3ab..9ee9356 100644
--- a/client/src/components/Link.js
+++ b/client/src/components/Link.js
@@ -1,17 +1,44 @@
 import React from 'react'
 import { AUTH_TOKEN } from '../constants'
 import { timeDifferenceForDate } from '../utils'
+import { useMutation, gql } from '@apollo/client'
+
+const VOTE_MUTATION = gql`
+  mutation VoteMutation($linkId: ID!) {
+    vote(linkId: $linkId) {
+      id
+      link {
+        id
+        votes {
+          id
+          user {
+            id
+          }
+        }
+      }
+      user {
+        id
+      }
+    }
+  }
+`

 const Link = (props) => {
   const { link } = props
   const authToken = localStorage.getItem(AUTH_TOKEN)

+  const [vote] = useMutation(VOTE_MUTATION, {
+    variables: {
+      linkId: link.id
+    },
+  })
+
   return (
     <div className="flex mt2 items-start">
       <div className="flex items-center">
         <span className="gray">{props.index + 1}.</span>
         {authToken && (
-          <div className="ml1 gray f11" style={{ cursor: 'pointer' }}>▲</div>
+          <div className="ml1 gray f11" style={{ cursor: 'pointer' }} onClick={vote}>▲</div>
         )}
       </div>
       <div className="ml1">
```

To update the UI after each mutation we first add another constant

```diff
diff --git a/client/src/constants.js b/client/src/constants.js
index 3f1172c..637b960 100644
--- a/client/src/constants.js
+++ b/client/src/constants.js
@@ -1 +1,2 @@
 export const AUTH_TOKEN = 'auth-token'
+export const LINKS_PER_PAGE = 20
```

Also export `FEED_QUERY` in the `LinkList` component so that it can be re-used in `Link` and `CreateLink`

```diff --git a/client/src/components/LinkList.js b/client/src/components/LinkList.js
index 8bae72c..d68e07b 100644
--- a/client/src/components/LinkList.js
+++ b/client/src/components/LinkList.js
@@ -2,7 +2,7 @@ import React from 'react'
 import Link from './Link'
 import { useQuery, gql } from '@apollo/client'

-const FEED_QUERY = gql`
+export const FEED_QUERY = gql`
   {
     feed {
       links {
(
```

Utilize the `update` method of `useMutation` in the `Link` component

```diff
diff --git a/client/src/components/Link.js b/client/src/components/Link.js
index 9ee9356..6e5b4c3 100644
--- a/client/src/components/Link.js
+++ b/client/src/components/Link.js
@@ -2,6 +2,7 @@ import React from 'react'
 import { AUTH_TOKEN } from '../constants'
 import { timeDifferenceForDate } from '../utils'
 import { useMutation, gql } from '@apollo/client'
+import { FEED_QUERY } from './LinkList'

 const VOTE_MUTATION = gql`
   mutation VoteMutation($linkId: ID!) {
@@ -31,6 +32,30 @@ const Link = (props) => {
     variables: {
       linkId: link.id
     },
+    update(cache, { data: { vote } }) {
+      const { feed } = cache.readQuery({
+        query: FEED_QUERY
+      })
+
+      const updatedLinks = feed.links.map((feedLink) => {
+        if (feedLink.id === link.id) {
+          return {
+            ...feedLink,
+            votes: [vote, ...feedLink.votes]
+          }
+        }
+        return feedLink
+      })
+
+      cache.writeQuery({
+        query: FEED_QUERY,
+        data: {
+          feed: {
+            links: updatedLinks,
+          },
+        },
+      })
+    }
   })

   return (
```

Finally do the same in the `CreateLink` component

```diff
diff --git a/client/src/components/CreateLink.js b/client/src/components/CreateLink.js
index 332a976..034d0a5 100644
--- a/client/src/components/CreateLink.js
+++ b/client/src/components/CreateLink.js
@@ -1,6 +1,8 @@
 import React, { useState } from 'react'
 import { useMutation, gql } from '@apollo/client'
 import { useHistory } from 'react-router'
+import { LINKS_PER_PAGE } from './../constants'
+import { FEED_QUERY } from './LinkList'

 const CREATE_LINK_MUTATION = gql`
   mutation PostMutation(
@@ -30,6 +32,34 @@ const CreateLink = () => {
       url: formState.url,
     },
     onCompleted: () => history.push('/'),
+    update: (cache, { data: { post } }) => {
+      const take = LINKS_PER_PAGE
+      const skip = 0
+      const orderBy = { createdAt: 'desc' }
+
+      const data = cache.readQuery({
+        query: FEED_QUERY,
+        variables: {
+          take,
+          skip,
+          orderBy,
+        },
+      })
+
+      cache.writeQuery({
+        query: FEED_QUERY,
+        data: {
+          feed: {
+            link: [post, ...data.feed.links]
+          }
+        },
+        variables: {
+          take,
+          skip,
+          orderBy,
+        }
+      })
+    },
   })

   return (
```

### Searching a link

First add the `./src/components/Search.js` component

```js
import React, { useState } from 'react'
import { gql, useLazyQuery } from '@apollo/client'
import Link from './Link'

const FEED_SEARCH_QUERY = gql`
  query FeedSearchQuery($filter: String!) {
    feed(filter: $filter) {
      links {
        id
        url
        description
        createdAt
        postedBy {
          id
          name
        }
        votes {
          id
          user {
            id
          }
        }
      }
    }
  }
`

const Search = () => {
  const [searchFilter, setSearchFilter] = useState('')
  const [executeSearch, { data }] = useLazyQuery(FEED_SEARCH_QUERY)

  return (
    <React.Fragment>
      <div>
        Search
        <input type="text" onChange={(e) => setSearchFilter(e.target.value)} />
        <button onClick={() => {
          executeSearch({
            variables: {
              filter: searchFilter,
            },
          })
        }}>OK</button>
      </div>
      {data && data.feed.links.map((link, index) => (
        <Link key={link.id} link={link} index={index} />
      ))}
    </React.Fragment>
  )
}

export default Search
```

Now add the `Search` component to the router

```diff
diff --git a/client/src/components/App.js b/client/src/components/App.js
index 0d9446d..797df8a 100644
--- a/client/src/components/App.js
+++ b/client/src/components/App.js
@@ -4,6 +4,7 @@ import CreateLink from './CreateLink'
 import Header from './Header'
 import LinkList from './LinkList'
 import Login from './Login'
+import Search from './Search'

 class App extends Component {
   render() {
@@ -15,6 +16,7 @@ class App extends Component {
             <Route exact path="/" component={LinkList} />
             <Route exact path="/create" component={CreateLink} />
             <Route exact path="/login" component={Login} />
+            <Route exact path="/search" component={Search} />
           </Switch>
         </div>
       </div>
```

Finally add the component route to the `Header`

```diff
diff --git a/client/src/components/Header.js b/client/src/components/Header.js
index b9ef8a8..411b657 100644
--- a/client/src/components/Header.js
+++ b/client/src/components/Header.js
@@ -12,6 +12,8 @@ const Header = () => {
       <div className="flex flex-fixed black">
         <div className="fw7 mr1">Hacker News</div>
         <Link to="/" className="ml1 no-underline black">new</Link>
+        <div className="ml1">|</div>
+        <Link to="/search" className="ml1 no-underline black">search</Link>
         {authToken && (
           <div className="flex">
             <div className="ml1">|</div>
```

### Realtime updates with GraphQL subscriptions

First install websocket support packages

```bash
npm install subscriptions-transport-ws
```

Now add the `WebSocketLink` configuration, which is using a `split` to distinguish between WebSocket and HTTP based traffic

```diff
diff --git a/client/src/index.js b/client/src/index.js
index 5db84bc..9482477 100644
--- a/client/src/index.js
+++ b/client/src/index.js
@@ -8,9 +8,13 @@ import {
   ApolloProvider,
   ApolloClient,
   createHttpLink,
-  InMemoryCache
+  InMemoryCache,
+  split
 } from '@apollo/client'
 import { setContext } from '@apollo/client/link/context'
+import { WebSocketLink } from '@apollo/client/link/ws'
+import { getMainDefinition } from '@apollo/client/utilities'
+
 import { AUTH_TOKEN } from './constants'
 import { BrowserRouter } from 'react-router-dom';

@@ -28,8 +32,29 @@ const authLink = setContext((_, { headers }) => {
   }
 })

+const wsLink = new WebSocketLink({
+  uri: `ws://localhost:4000/graphql`,
+  options: {
+    reconnect: true,
+    connectionParams: {
+      authToken: localStorage.getItem(AUTH_TOKEN)
+    },
+  },
+})
+
+const link = split(
+  ({ query }) => {
+    const { kind, operation } = getMainDefinition(query)
+    return (
+      kind === 'OperationDefinition' && operation === 'subscription'
+    )
+  },
+  wsLink,
+  authLink.concat(httpLink)
+)
+
 const client = new ApolloClient({
-  link: authLink.concat(httpLink),
+  link,
   cache: new InMemoryCache(),
 })
```

Then we subscribe ourselves to the creation of new links inside of the `LinkList` component

```diff
diff --git a/client/src/components/LinkList.js b/client/src/components/LinkList.js
index d68e07b..578ed97 100644
--- a/client/src/components/LinkList.js
+++ b/client/src/components/LinkList.js
@@ -1,6 +1,8 @@
 import React from 'react'
 import Link from './Link'
 import { useQuery, gql } from '@apollo/client'
+import { LINKS_PER_PAGE } from '../constants'
+import { useHistory } from 'react-router'

 export const FEED_QUERY = gql`
   {
@@ -25,8 +27,65 @@ export const FEED_QUERY = gql`
   }
 `

+const NEW_LINKS_SUBSCRIPTION = gql`
+  subscription {
+    newLink {
+      id
+      url
+      description
+      createdAt
+      postedBy {
+        id
+        name
+      }
+      votes {
+        id
+        user {
+          id
+        }
+      }
+    }
+  }
+`
+
+const getQueryVariables = (isNewPage, page) => {
+  const skip = isNewPage ? (page - 1) * LINKS_PER_PAGE : 0
+  const take = isNewPage ? LINKS_PER_PAGE : 100
+  const orderBy = { createdAt: 'desc' }
+  return { take, skip, orderBy }
+}
+
 const LinkList = () => {
-  const { data } = useQuery(FEED_QUERY)
+  const history = useHistory()
+  const isNewPage = history.location.pathname.includes('new')
+  const pageIndexParams = history.location.pathname.split('/')
+  const page = parseInt(pageIndexParams[pageIndexParams.length - 1])
+
+  const {
+    data,
+    loading,
+    error,
+    subscribeToMore
+  } = useQuery(FEED_QUERY, {
+    variables: getQueryVariables(isNewPage, page)
+  })
+
+  subscribeToMore({
+    document: NEW_LINKS_SUBSCRIPTION,
+    updateQuery: (prev, { subscriptionData }) => {
+      if (!subscriptionData.data) return prev
+      const newLink = subscriptionData.data.newLink
+      const exists = prev.feed.links.find(({ id }) => id === newLink.id)
+      if (exists) return prev
+      return Object.assign({}, prev, {
+        feed: {
+          links: [newLink, ...prev.feed.links],
+          count: prev.feed.links.length + 1,
+          __typename: prev.feed.__typename
+        }
+      })
+    }
+  })

   return (
     <div>
```

Run a `newLink` mutation to see live changes of the link list

```graphql
mutation NewLink {
  post(description: "My personal portfolio", url: "https://m99.io") {
    id
    url
    description
  }
}
```

We do the same to subscribe to new votes

```diff
diff --git a/client/src/components/LinkList.js b/client/src/components/LinkList.js
index 578ed97..59bfd21 100644
--- a/client/src/components/LinkList.js
+++ b/client/src/components/LinkList.js
@@ -48,6 +48,33 @@ const NEW_LINKS_SUBSCRIPTION = gql`
   }
 `

+const NEW_VOTES_SUBSCRIPTION = gql`
+  subscription {
+    newVote {
+      id
+      link {
+        id
+        url
+        description
+        createdAt
+        postedBy {
+          id
+          name
+        }
+        votes {
+          id
+          user {
+            id
+          }
+        }
+      }
+      user {
+        id
+      }
+    }
+  }
+`
+
 const getQueryVariables = (isNewPage, page) => {
   const skip = isNewPage ? (page - 1) * LINKS_PER_PAGE : 0
   const take = isNewPage ? LINKS_PER_PAGE : 100
@@ -84,7 +111,11 @@ const LinkList = () => {
           __typename: prev.feed.__typename
         }
       })
-    }
+    },
+  })
+
+  subscribeToMore({
+    document: NEW_VOTES_SUBSCRIPTION,
   })

   return (
```

Run a `vote` mutation to see live changes of the link list

```graphql
mutation VoteForApollo {
  vote(linkId: "2") {
    link {
      url
      description
    }
    user {
      name
      email
    }
  }
}
```

### Pagination

First we modify our route structure

```diff
diff --git a/client/src/components/App.js b/client/src/components/App.js
index 797df8a..4cacad8 100644
--- a/client/src/components/App.js
+++ b/client/src/components/App.js
@@ -1,5 +1,5 @@
 import React, { Component } from 'react'
-import { Route, Switch } from 'react-router'
+import { Redirect, Route, Switch } from 'react-router'
 import CreateLink from './CreateLink'
 import Header from './Header'
 import LinkList from './LinkList'
@@ -13,10 +13,12 @@ class App extends Component {
         <Header />
         <div className="ph3 pv1 background-gray">
           <Switch>
-            <Route exact path="/" component={LinkList} />
+            <Route exact path="/" render={() => <Redirect to="/new/1" />} />
             <Route exact path="/create" component={CreateLink} />
             <Route exact path="/login" component={Login} />
             <Route exact path="/search" component={Search} />
+            <Route exact path="/top" component={LinkList} />
+            <Route exact path="/new/:page" component={LinkList} />
           </Switch>
         </div>
       </div>
```

Then we modify the navigation in the `Header` component

```diff
diff --git a/client/src/components/Header.js b/client/src/components/Header.js
index 411b657..0f3cf7b 100644
--- a/client/src/components/Header.js
+++ b/client/src/components/Header.js
@@ -13,6 +13,8 @@ const Header = () => {
         <div className="fw7 mr1">Hacker News</div>
         <Link to="/" className="ml1 no-underline black">new</Link>
         <div className="ml1">|</div>
+        <Link to="/top" className="ml1 no-underline black">top</Link>
+        <div className="ml1">|</div>
         <Link to="/search" className="ml1 no-underline black">search</Link>
         {authToken && (
           <div className="flex">
```

And we incorporate the pagination into the `LinkList` component

```diff
diff --git a/client/src/components/LinkList.js b/client/src/components/LinkList.js
index 59bfd21..887c01c 100644
--- a/client/src/components/LinkList.js
+++ b/client/src/components/LinkList.js
@@ -5,8 +5,12 @@ import { LINKS_PER_PAGE } from '../constants'
 import { useHistory } from 'react-router'

 export const FEED_QUERY = gql`
-  {
-    feed {
+  query FeedQuery(
+    $take: Int
+    $skip: Int
+    $orderBy: LinkOrderByInput
+  ) {
+    feed(take: $take, skip: $skip, orderBy: $orderBy) {
       links {
         id
         createdAt
@@ -23,6 +27,7 @@ export const FEED_QUERY = gql`
           }
         }
       }
+      count
     }
   }
 `
@@ -87,6 +92,7 @@ const LinkList = () => {
   const isNewPage = history.location.pathname.includes('new')
   const pageIndexParams = history.location.pathname.split('/')
   const page = parseInt(pageIndexParams[pageIndexParams.length - 1])
+  const pageIndex = page ? (page - 1) * LINKS_PER_PAGE : 0

   const {
     data,
@@ -118,13 +124,41 @@ const LinkList = () => {
     document: NEW_VOTES_SUBSCRIPTION,
   })

+  const getLinksToRender = (isNewPage, data) => {
+    if (isNewPage) {
+      return data.feed.links
+    }
+    const rankedLinks = data.feed.links.slice()
+    rankedLinks.sort(
+      (l1, l2) => l2.votes.length - l1.votes.length
+    )
+    return rankedLinks
+  }
+
   return (
     <div>
+      {loading && <p>Loading ...</p>}
+      {error && <pre>{JSON.stringify(error, null, 2)}</pre>}
       {data && (
         <React.Fragment>
-          {data.feed.links.map((link, index) => (
-            <Link key={link.id} link={link} index={index} />
+          {getLinksToRender(isNewPage, data).map((link, index) => (
+            <Link key={link.id} link={link} index={index + pageIndex} />
           ))}
+          {isNewPage && (
+            <div className="flex ml4 mv3 gray">
+              <div className="pointer mr2" onClick={() => {
+                if (page > 1) {
+                  history.push(`/new/${page - 1}`)
+                }
+              }}>Previous</div>
+              <div className="pointer" onClick={() => {
+                if (page <= data.feed.count / LINKS_PER_PAGE) {
+                  const nextPage = page + 1
+                  history.push(`/new/${nextPage}`)
+                }
+              }}>Next</div>
+            </div>
+          )}
         </React.Fragment>
       )}
     </div>
```

Finally we need to enhance the vote mutation to also carry the pagination variables

```diff
diff --git a/client/src/components/Link.js b/client/src/components/Link.js
index 6e5b4c3..43b5c1e 100644
--- a/client/src/components/Link.js
+++ b/client/src/components/Link.js
@@ -1,5 +1,5 @@
 import React from 'react'
-import { AUTH_TOKEN } from '../constants'
+import { AUTH_TOKEN, LINKS_PER_PAGE } from '../constants'
 import { timeDifferenceForDate } from '../utils'
 import { useMutation, gql } from '@apollo/client'
 import { FEED_QUERY } from './LinkList'
@@ -28,13 +28,22 @@ const Link = (props) => {
   const { link } = props
   const authToken = localStorage.getItem(AUTH_TOKEN)

+  const take = LINKS_PER_PAGE
+  const skip = 0
+  const orderBy = { createdAt: 'desc' }
+
   const [vote] = useMutation(VOTE_MUTATION, {
     variables: {
       linkId: link.id
     },
     update(cache, { data: { vote } }) {
       const { feed } = cache.readQuery({
-        query: FEED_QUERY
+        query: FEED_QUERY,
+        variables: {
+          take,
+          skip,
+          orderBy,
+        },
       })

       const updatedLinks = feed.links.map((feedLink) => {
@@ -54,6 +63,11 @@ const Link = (props) => {
             links: updatedLinks,
           },
         },
+        variables: {
+          take,
+          skip,
+          orderBy,
+        },
       })
     }
   })
```

In order to only show valid pagination links we add more adjustments

```diff
diff --git a/client/src/components/LinkList.js b/client/src/components/LinkList.js
index 887c01c..dac7a15 100644
--- a/client/src/components/LinkList.js
+++ b/client/src/components/LinkList.js
@@ -146,17 +146,21 @@ const LinkList = () => {
           ))}
           {isNewPage && (
             <div className="flex ml4 mv3 gray">
-              <div className="pointer mr2" onClick={() => {
-                if (page > 1) {
-                  history.push(`/new/${page - 1}`)
-                }
-              }}>Previous</div>
-              <div className="pointer" onClick={() => {
-                if (page <= data.feed.count / LINKS_PER_PAGE) {
-                  const nextPage = page + 1
-                  history.push(`/new/${nextPage}`)
-                }
-              }}>Next</div>
+              {page > 1 && (
+                <div className="pointer mr2" onClick={() => {
+                  if (page > 1) {
+                    history.push(`/new/${page - 1}`)
+                  }
+                }}>Previous</div>
+              )}
+              {page < Math.floor(data.feed.count / LINKS_PER_PAGE) && (
+                <div className="pointer" onClick={() => {
+                  if (page <= Math.floor(data.feed.count / LINKS_PER_PAGE)) {
+                    const nextPage = page + 1
+                    history.push(`/new/${nextPage}`)
+                  }
+                }}>Next</div>
+              )}
             </div>
           )}
         </React.Fragment>
```

That’s it 😎 Quite a ride, but worth it. Thanks for reading, coding and trying out this tutorial.
