import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';


export default function HomepageLogo() {
  return (
    <section className={styles.features}>
      <div className="container" style={{display:'flex', justifyContent:'center', alignItems:'center'}}>
        <div className={clsx('col col--8')}>
          <div className="text--center">
            <img src='./img/openSenseMap_2.png'/>
          </div>
          <div className="text--center padding-horiz--md">
            <p>
              This API offers ...
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
