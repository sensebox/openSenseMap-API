'use strict'

const axios = require('axios');
const { model: Notification } = require('../../../models/src/notifications/notifications.js');
const handleError = require('../helpers/errorHandler')

// ENVIRONMENT VARIABLES
const dotenv = require('dotenv');
dotenv.config();

// SET CREDENTIALS
const endpoint = process.env.BADGRAPI;
const password = process.env.PASSWORD;
const username = process.env.USERNAME;
const ISSUERID = process.env.MYBADGESISSUERID;
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;

// BADGR API CLIENT
//const API = require("@geobadges/badgr-api-client");

// CONNECT TO API ENDPOINT WITH CREDENTIELS
const getAccessToken = async function getAccessToken() {
    try {
        const creds = await axios({
            method: 'POST',
            url: "http://localhost:8000/o/token",
            data: `grant_type=password&username=${username}&password=${password}&client_id=${client_id}&client_secret=${client_secret}&scope=rw:serverAdmin`,
        })
        return creds.data.access_token;
    }
    catch (err) {
        console.log(err);
    }
}

// GRANT BADGE TO USER (REQUEST EMAIL) BY BADGE CLASS ID
const grantBadge = async function grantBadge(userId, email, badgeClassEntityId) {
    // CHECK IF USER ALREADY HAS THIS BADGE
    try {
        const badges = await axios.get(process.env.BADGRAPI + '/v2/backpack/' + email, { headers: { Authorization: 'Bearer ' + await getAccessToken() } });
        const usersOwnedBadges = badges.data.result;
        for (let i = 0; i < usersOwnedBadges.length; i++) {
            if (usersOwnedBadges[i].badgeclass == badgeClassEntityId) {
                console.log('User already has this badge');
                return;
            }
        }

        // GET BADGE
        const entityId = badgeClassEntityId; // badge id
        const badge = await axios({
            params: { access_token: await getAccessToken() },
            method: "GET",
            url: `${endpoint}/v2/badgeclasses/${entityId}`,
        });

        // GRANT BADGE WITH BADGR API
        const grant = await axios({
            headers: { Authorization: `Bearer ` + await getAccessToken() },
            method: "POST",
            url: `${endpoint}/v1/issuer/issuers/${ISSUERID}/badges/${badge.data.result[0].entityId}/assertions`,
            data: {
                badge_class: badge.entityId,
                create_notification: false,
                evidence_items: [],
                issuer: ISSUERID,
                narrative: "",
                recipient_identifier: email,
                recipient_type: "email",
            },
        });

        // DETERMINE IF BADGE IS ASSERTED
        const status = !grant.hasOwnProperty("revoked") || grant.revoked === false

        // IF SUCCESSFULLY GRANTED
        if (status === true) {
            // CREATE NEW NOTIFICATION FOR USER
            const notification = await Notification.initNew(userId, email, "Congratulations, you just earned a new badge! 🎉 <br>" + '<a href="' + process.env.BADGRUI + '/recipient/badges target="_blank">' + badge.data.result[0].name.toUpperCase() + "</a>", badge.data.result[0].image, badge.data.result[0].entityId);
            console.log('Badge granted and notification sent');
        }
        else {
            console.log('Could not grant badge');
        }
    }
    catch (err) {
        console.log(err);
    }
}

// GET ALL BADGES FROM USER BY ITS ID
const getBackpack = async function getBackpack(email) {
    try {
        // GET ALL BADGES FROM USER
        const response = await axios.get(process.env.BADGRAPI + '/v2/backpack/' + email, { headers: { Authorization: 'Bearer ' + await getAccessToken() } });
        const badges = response.data.result;
        // FILTER FOR BADGES FROM OPENSENSEMAP ISSUER
        for (let i = 0; i < badges.length; i++) {
            if (badges[i].issuer != ISSUERID) {
                badges.splice(i, 1);
            }
        }
        return badges;
    }
    catch (err) {
        console.log(err);
        //handleError(err, next);
    }
}

const getBadge = async function getBadge(req, res, next) {
    try {
        // GET BADGE
        const entityId = req.params.id; // badge id
        const badge = await axios({
            params: { access_token: await getAccessToken() },
            method: "GET",
            url: `${endpoint}/v2/badgeclasses/${entityId}`,
        });
        res.send(badge.data.result[0]);
    }
    catch (err) {
        handleError(err, next);
    }
}

module.exports = {
    grantBadge,
    getBackpack,
    getBadge
}