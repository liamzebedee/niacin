import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Head from 'next/head'
import React from 'react'
import '../styles/globals.css'

const queryClient = new QueryClient()

function MyApp({ Component, pageProps }) {
  const Layout = Component.layout || (({ children }) => <>{children}</>)
  return <Layout>
    <Head>
      <link rel="apple-touch-icon" href="apple-touch-icon.png"></link>
    </Head>
    
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>


    <footer dangerouslySetInnerHTML={{
      __html: `<!--${comments}-->`
    }}>

    </footer>
  </Layout>
}

const comments = ``

export default MyApp
