'use strict'

const { mongoose } = require('../db');

const notificationSchema = new mongoose.Schema({
    message: {
        type: String,
        required: [true, 'message is required'],
    },
    created_at: {
        type: Date,
        required: [true, 'date is required'],
    },
    reciever: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'reciever is required'],
    },
    image: {
        type: String,
        required: [true, 'image is required'],
    },
    is_read: {
        type: Boolean
    }
});

notificationSchema.statics.initNew = function (reciever, message, image) {
    return this.create({
        message: message,
        created_at: new Date(),
        reciever: reciever,
        image: image,
        is_read: false
    })
};

const notificationModel = mongoose.model('Notification', notificationSchema);

module.exports = {
    schema: notificationSchema,
    model: notificationModel
}