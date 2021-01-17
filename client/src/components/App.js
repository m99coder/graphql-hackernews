import React, { Component } from 'react'
import CreateLink from './CreateLink'
import LinkList from './LinkList'
import Login from './Login'

class App extends Component {
  render() {
    return (
      <React.Fragment>
        <Login />
        <CreateLink />
        <LinkList />
      </React.Fragment>
    )
  }
}

export default App
