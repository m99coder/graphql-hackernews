const fs = require("fs")
const path = require("path")

const { ApolloServer, PubSub } = require("apollo-server")
const { PrismaClient } = require("@prisma/client")

const Mutation = require('./resolvers/Mutation')
const Subscription = require('./resolvers/Subscription')
const Vote = require('./resolvers/Vote')

const { getUserId } = require('./utils')

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
  Vote,
}

const prisma = new PrismaClient()
const pubsub = new PubSub()

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
