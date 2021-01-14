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
