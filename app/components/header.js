import { createContext, useContext, useEffect, useState } from 'react';
import styles from '../styles/Home.module.css';

/*
Rainbow & wagmi
*/
import '@rainbow-me/rainbowkit/styles.css';

import {
    ConnectButton
} from '@rainbow-me/rainbowkit';
import { useAccount, useSigner } from 'wagmi';
import { mainnet, polygon } from 'wagmi/chains';
import { getContract, getProvider } from '@wagmi/core';
import { ethers } from 'ethers';
import Link from 'next/link';
import { useRouter } from 'next/router';
const classNames = require('classnames');

const {
    menuLiActive,
    menuLiLiterallyAnythingElse
} = styles



export default function Header() {
    // Manually compute the active page
    const router = useRouter()
    const isHome = router.pathname == "/"
    const isFeed = router.pathname == "/feed"
    const isLiterallyAnythingElse = !isHome && !isFeed

    return <header className={styles.header}>
        <div className={styles.menu}>
            <ul>
                <li className={classNames({ [menuLiActive]: isHome })}>
                    <Link href="/">Home</Link>
                </li>
                <li className={classNames({ [menuLiActive]: isLiterallyAnythingElse, [menuLiLiterallyAnythingElse]: true })}>
                    <span>✴✴✴</span>
                </li>
            </ul>
        </div>
        
        <div className={styles.mainStatus}>
        </div>

        <div className={styles.account}>
            <ConnectButton chainStatus="name" />
        </div>
    </header>
}