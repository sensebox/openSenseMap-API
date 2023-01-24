import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

// const FeatureList = [
//   {
//     title: 'openSenseMap',
//     Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
//     description: (
//       <>
//         Docusaurus was designed from the ground up to be easily installed and
//         used to get your website up and running quickly.
//       </>
//     ),
//   },
// ];

// function Feature({Svg, title, description}) {
//   return (
//     <div className={clsx('col col--4')}>
//       <div className="text--center">
//         <Svg className={styles.featureSvg} role="img" />
//       </div>
//       <div className="text--center padding-horiz--md">
//         <h3>{title}</h3>
//         <p>{description}</p>
//       </div>
//     </div>
//   );
// }

export default function HomepageFeatures() {
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
