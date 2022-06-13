'use strict'

const { model: Notification } = require('../../../models/src/notifications/notifications.js');


// GET ALL USER NOTIFICATIONS
const listNotifications = async function listNotifications(req, res, next) {
    try {
        let notifications = await Notification.find({ reciever: req.user._id });
        res.send(notifications);
    } catch (err) {
        console.log(err);
    }
}

// GET UNREAD NOTIFICATIONS
const getUnreadNotifications = async function getUnreadNotifications(req, res, next) {
    try {
        let notifications = await Notification.find({ reciever: req.user._id, is_read: false });
        res.send(notifications);
    } catch (err) {
        console.log(err);
    }
}

// POST NEW NOTIFICATION
const postNewNotification = async function postNotification(req, res, next) {
    try {
        let notification = await Notification.initNew(req.user._id, req.user.email, req.body.message, req.body.image, req.body.badgeId);
        res.send({ code: 'Ok', notification: notification });
    } catch (err) {
        console.log(err);
    }
}

// DELETE ALL NOTIFICATIONS
const deleteNotifications = async function deleteNotifications(req, res, next) {
    try {
        await Notification.deleteMany({ reciever: req.user._id });
        res.send({ code: 'All user notifications deleted' });
    } catch (err) {
        console.log(err);
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
        console.log(err);
    }
}



module.exports = {
    listNotifications,
    getUnreadNotifications,
    postNewNotification,
    deleteNotifications,
    setNotificationAsRead
}