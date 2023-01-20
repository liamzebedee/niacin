import styles from '../styles/Home.module.css';

export const Btn = ({ props, onClick, disabled, children }) => {
    return <button onClick={onClick} disabled={disabled} {...props} className={styles.btn}>
        {children}
    </button>
}