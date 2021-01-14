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
