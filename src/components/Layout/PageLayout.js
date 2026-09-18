import styles from './PageLayout.module.css';

/**
 * PageLayout component
 * @param {Object} props
 * @param {React.ReactNode} props.sidebar - Content for the left contextual sidebar
 * @param {React.ReactNode} props.children - Main content area
 */
const PageLayout = ({ sidebar, children }) => {
    return (
        <div className={styles.container}>
            {sidebar && <aside className={styles.sidebar}>{sidebar}</aside>}
            <div className={styles.mainContent}>
                {children}
            </div>
        </div>
    );
};

export default PageLayout;
