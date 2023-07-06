'use strict';

//import axios, { get, post } from 'axios';
const axios = require('axios');

const config = require('config');

const { triggerNotification } = require('./notifications');

const endpoint = config.get('myBadges.api_url_v2');
const ISSUERID = config.get('myBadges.issuer_id');
const username = config.get('myBadges.username');
const password = config.get('myBadges.password');
const client_id = config.get('myBadges.client_id');
const client_secret = config.get('myBadges.client_secret');

// CONNECT TO API ENDPOINT WITH CREDENTIALS
const getAccessToken = async function getAccessToken () {
  await axios({
    method: 'POST',
    url: `${endpoint}/o/token`,
    data: `grant_type=password&username=${username}&password=${password}&client_id=${client_id}&client_secret=${client_secret}&scope=rw:serverAdmin`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
};

// const getBadge = async function getBadge(badgeId) {
//     try {
//         const accessData = await getAccessToken();
//         // GET BADGE
//         const response = await axios({
//             params: { access_token: accessData.access_token },
//             method: "GET",
//             url: `${endpoint}/v2/badgeclasses/${badgeId}`,
//         });
//         return response.data;
//     } catch (error) {
//         throw error;
//     }
// };

const grantBadge = async function grantBadge (email, badgeClassEntityId) {
  try {
    const accessData = await getAccessToken();
    // Check if user already has this badge
    const badges = await axios({
      url: `${endpoint}/v2/backpack/${email}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${accessData.access_token}` },
    });
    const usersOwnedBadges = badges.data.result;
    const hasBadge = usersOwnedBadges.some((badge) => {
      const matchCondition = badge.badgeclass === badgeClassEntityId && badge.revoked === false;

      return matchCondition;
    });
    if (!hasBadge) {
      // Get badge details
      const badge = await axios({
        url: `${endpoint}/v2/badgeclasses/${badgeClassEntityId}`,
        method: 'GET',
        params: { access_token: accessData.access_token },
      });

      // Grant badge with Badgr API
      const grant = await axios({
        url: `${endpoint}/v1/issuer/issuers/${ISSUERID}/badges/${badge.data.result[0].entityId}/assertions`,
        method: 'POST',
        data: {
          badge_class: badge.data.result[0].entityId,
          create_notification: false,
          evidence_items: [],
          issuer: ISSUERID,
          narrative: '',
          recipient_identifier: email,
          recipient_type: 'email',
        },
        headers: { Authorization: `Bearer ${accessData.access_token}` },
      });

      // Determine if badge is asserted
      // eslint-disable-next-line no-prototype-builtins
      const status = !grant.data.hasOwnProperty('revoked') || grant.data.revoked === false;
      if (status) {
        await triggerNotification(email, { badge: badge.data.result[0] });
      }

      return status;
    }

    return false;

  } catch (err) {
    return err;
  }
};


module.exports = {
  getAccessToken,
  //getBadge,
  grantBadge
};
