'use strict'

const { model: Notification } = require('../../../models/src/notifications/notifications.js');


// GET ALL USER NOTIFICATIONS
const listNotifications = async function listNotifications(req, res, next) {
    const notifications = await Notification.find({ reciever: req.user._id });
    res.send({ code: 'Ok', notifications: notifications });
}

// POST NEW NOTIFICATION
const postNewNotification = async function postNotification(req, res, next) {
    const notification = await Notification.initNew(req.user._id, req.body.message, req.body.image);
    res.send({ code: 'Ok', notification: notification });
}

// GET SINGLE NOTIFICATION
const getNotification = async function getNotification(req, res, next) {
    const notification = await Notification.findById(req.params.notificationId);
    res.send({ code: 'Ok', notification: notification });
}

module.exports = {
    listNotifications,
    postNewNotification,
    getNotification
}