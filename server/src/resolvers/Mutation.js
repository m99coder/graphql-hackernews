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
