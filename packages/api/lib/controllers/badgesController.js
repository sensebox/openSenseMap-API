'use strict'

const { model: Notification } = require('../../../models/src/notifications/notifications.js');
const { handleError } = require('../helpers/errorHandler')


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
const client = new API({ endpoint, password, username });


// GET ALL BADGES
const listBadges = async function listBadges(req, res, next) {
    try {
        let fields = ['entityId', 'name', 'description', 'image']; // fields to include in return
        let badges = await client.getBadgeClasses({ fields });
        res.send({ code: 'Ok', badges: badges });
    } catch (err) {
        handleError(err, next);
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
        res.send({ code: 'Ok', badge: badge });
    } catch (err) {
        handleError(err, next);
    }
}

// GRANT BADGE TO USER (REQUEST EMAIL) BY BADGE CLASS ID
const grantBadge = async function grantBadge(req, res, next) {
    try {
        // GET ISSUER
        const issuer = await getIssuer();
        try {
            // GET BADGE
            const entityId = req.params.badgeClassEntityId; // badge id
            const fields = ['name', 'entityId', 'criteriaNarrative', 'tags', 'image', 'description']; // fields to include in return
            const badge = await client.getBadge({
                entityId,
                fields
            });
            try {
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
                    const notification = await Notification.initNew(req.user._id, "You just earned a new badge! Go to mybadges.org to see it or open your mails.", badge.image, badge.entityId);
                    res.send({ code: 'Badge granted and notification sent', badge: badge, status: status, notification: notification });
                }
                else {
                    res.send({ code: 'Could not grant badge', badge: badge, status: status });
                }
            } catch (err) {
                handleError(err, next);
            }
        } catch (err) {
            handleError(err, next);
        }
    } catch (err) {
        handleError(err, next);
    }
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
    listBadges
}