'use strict'

const axios = require('axios');
const { model: Notification } = require('../../../models/src/notifications/notifications.js');

// ENVIRONMENT VARIABLES
const dotenv = require('dotenv');
dotenv.config();

// SET CREDENTIALS
const endpoint = process.env.BADGRAPI;
const password = process.env.PASSWORD;
const username = process.env.USERNAME;
const ISSUERID = process.env.MYBADGESISSUERID;

// BADGR API CLIENT
const API = require("@geobadges/badgr-api-client");
// CONNECT TO API ENDPOINT WITH CREDENTIELS
const client = new API({ endpoint, password, username, debug: true, admin: true });


// GET ACCESSTOKEN
const getAccessToken = async function getAccessToken() {
    const {
        accessToken,
        expirationDate,
        refreshToken
    } = await client.getAccessToken();
    console.log({
        accessToken,
        expirationDate,
        refreshToken
    });
    return accessToken;
}
getAccessToken();

// GRANT BADGE TO USER (REQUEST EMAIL) BY BADGE CLASS ID
const grantBadge = async function grantBadge(req, res, next) {
    // CHECK IF USER ALREADY HAS THIS BADGE
    const badges = await axios.get(process.env.BADGRAPI + '/v2/backpack/' + req.user.email, { headers: { Authorization: 'Bearer ' + await getAccessToken() } });
    const usersOwnedBadges = badges.data.result;
    for (let i = 0; i < usersOwnedBadges.length; i++) {
        if (usersOwnedBadges[i].badgeclass == req.params.badgeClassEntityId) {
            res.send({ code: 'User already has this badge' });
            return;
        }
    }
    try {
        // GET BADGE
        const entityId = req.params.badgeClassEntityId; // badge id
        const fields = ['name', 'entityId', 'criteriaNarrative', 'tags', 'image', 'description']; // fields to include in return
        const badge = await client.getBadge({
            entityId,
            fields
        });
        // GRANT BADGE WITH BADGR API
        const status = await client.grant({
            badgeClassEntityId: badge.entityId,
            createNotification: false,
            email: req.user.email,
            evidence: [],
            issuerEntityId: ISSUERID,
            narrative: badge.description
        })
        // IF SUCCESSFULLY GRANTED
        if (status === true) {
            // CREATE NEW NOTIFICATION FOR USER
            const notification = await Notification.initNew(req.user._id, req.user.email, "You just earned the badge " + badge.name.toUpperCase() + "! Go to mybadges.org to see it or open your mails.", badge.image, badge.entityId);
            res.send({ code: 'Badge granted and notification sent', badge: badge, status: status, notification: notification });
        }
        else {
            res.send({ code: 'Could not grant badge', badge: badge, status: status });
        }
    }
    catch (err) {
        console.log(err);
    }
}

// GET ALL BADGES FROM USER BY ITS ID
const getBackpack = async function getBackpack(req, res, next) {
    try {
        // GET ALL BADGES FROM USER
        const response = await axios.get(process.env.BADGRAPI + '/v2/backpack/' + req.params.email, { headers: { Authorization: 'Bearer ' + await getAccessToken() } });
        const badges = response.data.result;
        // FILTER FOR BADGES FROM OPENSENSEMAP ISSUER
        for (let i = 0; i < badges.length; i++) {
            if (badges[i].issuer != ISSUERID) {
                badges.splice(i, 1);
            }
        }
        res.send(badges);
    }
    catch (err) {
        console.log(err);
    }
}

const getBadge = async function getBadge(req, res, next) {
    try {
        // GET BADGE
        const entityId = req.params.id; // badge id
        const fields = ['name', 'entityId', 'criteriaNarrative', 'tags', 'image', 'description']; // fields to include in return
        const badge = await client.getBadge({
            entityId,
            fields
        });
        res.send(badge);
    }
    catch (err) {
        console.log(err);
    }
}

module.exports = {
    grantBadge,
    getBackpack,
    getBadge
}