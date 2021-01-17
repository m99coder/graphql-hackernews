# graphql-hackernews

> How to GraphQL – Hackernews Clone

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

Finally we implement a redirect to the main route after creating a link

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

The main route doesn’t update yet – this will come later
