'use strict'

const { model: Notification } = require('../../../models/src/notifications/notifications.js');
const { handleError } = require('../helpers/errorHandler')


// GET ALL USER NOTIFICATIONS
const listNotifications = async function listNotifications(req, res, next) {
    try {
        let notifications = await Notification.find({ reciever: req.user._id });
        res.send(notifications);
    } catch (err) {
        handleError(err, next);
    }
}

// POST NEW NOTIFICATION
const postNewNotification = async function postNotification(req, res, next) {
    try {
        let notification = await Notification.initNew(req.user._id, req.body.message, req.body.image, req.body.badgeId);
        res.send({ code: 'Ok', notification: notification });
    } catch (err) {
        handleError(err, next);
    }
}

// GET SINGLE NOTIFICATION
const getNotification = async function getNotification(req, res, next) {
    try {
        let notification = await Notification.findById(req.params.notificationId);
        res.send({ code: 'Ok', notification: notification });
    } catch (err) {
        handleError(err, next);
    }
}

// DELETE ALL NOTIFICATIONS
const deleteNotifications = async function deleteNotifications(req, res, next) {
    try {
        await Notification.deleteMany({ reciever: req.user._id });
        res.send({ code: 'All user notifications deleted' });
    } catch (err) {
        handleError(err, next);
    }

}

module.exports = {
    listNotifications,
    postNewNotification,
    getNotification,
    deleteNotifications
}