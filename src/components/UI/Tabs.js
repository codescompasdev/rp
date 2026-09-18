import styles from './Tabs.module.css';

const Tabs = ({ tabs, activeTab, onTabChange }) => {
    return (
        <div className={styles.tabsContainer}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default Tabs;
