'use strict'

const { model: Notification } = require('../../../models/src/notifications/notifications.js');
const { User } = require('@sensebox/opensensemap-api-models');

// ENVIRONMENT VARIABLES
const dotenv = require('dotenv');
dotenv.config();

// SET CREDENTIALS
const endpoint = process.env.BADGRAPI;
const password = process.env.PASSWORD;
const username = process.env.USERNAME;

// BADGR API CLIENT
const API = require("@geobadges/badgr-api-client");
// CONNECT TO API ENDPOINT WITH CREDENTIELS
const client = new API({ endpoint, password, username, debug: true });

// GET ALL BADGES
const listBadges = async function listBadges(req, res, next) {
    try {
        let fields = ['entityId', 'name', 'description', 'image']; // fields to include in return
        let badges = await client.getBadgeClasses({ fields });
        res.send(badges);
    } catch (err) {
        console.log(err);
    }
}

// GET BADGE BY BADGE CLASS ID
const getBadge = async function getBadge(req, res, next) {
    try {
        let entityId = req.params.badgeClassEntityId; // badge id
        let fields = ['name', 'entityId', 'criteriaNarrative', 'tags', 'image', 'description']; // fields to include in return
        let badge = await client.getBadge({
            entityId,
            fields
        });
        res.send(badge);
    } catch (err) {
        console.log(err);
    }
}

// GRANT BADGE TO USER (REQUEST EMAIL) BY BADGE CLASS ID
const grantBadge = async function grantBadge(req, res, next) {
    //TODO: CHECK IF USER HAS BADGE ALREADY
    try {
        // GET ISSUER
        const issuer = await getIssuer();
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
            issuerEntityId: issuer.entityId,
            narrative: badge.description
        })
        // IF SUCCESSFULLY GRANTED
        if (status === true) {
            // CREATE NEW NOTIFICATION FOR USER
            const notification = await Notification.initNew(req.user._id, req.user.email, "You just earned the badge " + badge.name.toUpperCase() + "! Go to mybadges.org to see it or open your mails.", badge.image, badge.entityId);
            // ADD BADGEID TO USER OBJECT
            req.user.addBadge(entityId);
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
const getBackpackFromUser = async function getBackpackFromUser(req, res, next) {
    let ownedBadges = [];
    const email = req.params.email;
    const user = await User.findOne({ email: email });
    const badges = user.badges;
    for (let i = 0; i < badges.length; i++) {
        console.log(badges[i]);
        const entityId = badges[i];
        const fields = ['name', 'entityId', 'image'];
        const badge = await client.getBadge({ entityId, fields });
        ownedBadges.push(badge);
    }
    res.send(ownedBadges);
}

const getIssuer = async function getIssuer() {
    const fields = ['emails', 'entityId', 'firstName', 'lastName'];
    const user = await client.getUser({
        fields
    });
    return user;
}

module.exports = {
    getBadge,
    grantBadge,
    listBadges,
    getBackpackFromUser
}