const fs = require("fs")
const path = require("path")
const jwt = require("jsonwebtoken")

const { ApolloServer, PubSub } = require("apollo-server")
const { PrismaClient } = require("@prisma/client")

const Mutation = require('./resolvers/Mutation')
const Subscription = require('./resolvers/Subscription')

const resolvers = {
  Query: {
    info: () => `This is the API of a Hackernews Clone`,
    feed: async (parent, args, context) => {
      return context.prisma.link.findMany()
    },
  },
  Mutation,
  Subscription,
  Link: {
    id: (parent) => parent.id,
    description: (parent) => parent.description,
    url: (parent) => parent.url,
  },
}

const prisma = new PrismaClient()
const pubsub = new PubSub()

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

const server = new ApolloServer({
  typeDefs: fs.readFileSync(path.join(__dirname, "schema.graphql"), "utf-8"),
  resolvers,
  context: ({ req }) => {
    return {
      ...req,
      prisma,
      pubsub,
      userId:
        req && req.headers.authorization
          ? getUserId(req)
          : null
    }
  },
})

server
  .listen()
  .then(({ url }) =>
    console.log(`Server is running on ${url}`)
  )
