import React from 'react'
import Link from './Link'
import { useQuery, gql } from '@apollo/client'

const FEED_QUERY = gql`
  {
    feed {
      links {
        id
        createdAt
        url
        description
      }
    }
  }
`

const LinkList = () => {
  const { data } = useQuery(FEED_QUERY)

  return (
    <div>
      {data && (
        <React.Fragment>
          {data.feed.links.map((link) => (
            <Link key={link.id} link={link} />
          ))}
        </React.Fragment>
      )}
    </div>
  )
}

export default LinkList
