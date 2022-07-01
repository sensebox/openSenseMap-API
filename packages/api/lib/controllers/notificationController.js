'use strict'

const { model: Notification } = require('../../../models/src/notifications/notifications.js');
const handleError = require('../helpers/errorHandler');


// GET ALL USER NOTIFICATIONS
const listNotifications = async function listNotifications(req, res, next) {
    try {
        let notifications = await Notification.find({ reciever: req.user._id });
        res.send(notifications);
    } catch (err) {
        handleError(err, next);
    }
}

// GET UNREAD NOTIFICATIONS
const getUnreadNotifications = async function getUnreadNotifications(req, res, next) {
    try {
        let notifications = await Notification.find({ reciever: req.user._id, is_read: false });
        res.send(notifications);
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

// SET NOTIFICATION AS READ
const setNotificationAsRead = async function setNotificationAsRead(req, res, next) {
    try {
        let notification = await Notification.findById(req.params.notificationId);
        notification.is_read = true;
        await notification.save();
        res.send({ code: 'Ok', notification: notification });
    } catch (err) {
        handleError(err, next);
    }
}



module.exports = {
    listNotifications,
    getUnreadNotifications,
    deleteNotifications,
    setNotificationAsRead
}