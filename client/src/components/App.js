import React, { Component } from 'react'
import LinkList from './LinkList'
import Login from './Login'

class App extends Component {
  render() {
    return (
      <React.Fragment>
        <Login />
        <LinkList />
      </React.Fragment>
    )
  }
}

export default App
