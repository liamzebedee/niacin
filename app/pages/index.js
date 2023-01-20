import Head from 'next/head';
import { useState } from 'react';
import { AppLayout } from '../components/layout';
import styles from '../styles/Home.module.css';

import { useAccount, useSigner } from 'wagmi';
import Header from '../components/header';
import { useDebounce } from '../components/util';
import { Btn } from '../components/button'

function UI() {
  const account = useAccount()
  const { data: signer, isError, isLoading } = useSigner()

  const connectGithub = () => {
    // // Create a personal access token at https://github.com/settings/tokens/new?scopes=repo
    // const octokit = new Octokit({ auth: `personal-access-token123` });

    // // Compare: https://docs.github.com/en/rest/reference/users#get-the-authenticated-user
    // const {
    //   data: { login },
    // } = await octokit.rest.users.getAuthenticated();

    // Now get the repos a user has.
    
  }

  const ui = (
    <div className={styles.container}>
      <Head>
        <title>vercel3</title>
        <meta name="description" content="hot takes" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header/>

      <main className={styles.main}>
        <Btn onClick={connectGithub}>Connect Github</Btn>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by wordcels
        </a>
      </footer>
    </div>
  )

  return ui
}

UI.layout = AppLayout
export default UI
