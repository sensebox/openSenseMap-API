'use strict'

const { mongoose } = require('../db');
const { User } = require('@sensebox/opensensemap-api-models');
const config = require('config');
var jwtAuth = require('socketio-jwt-auth');
const { algorithm: jwt_algorithm, secret: jwt_secret, issuer: jwt_issuer, validity_ms: jwt_validity_ms } = config.get('jwt');

// INITIALIZE SOCKET.IO
const { Server } = require("socket.io");
const io = new Server(1234, { /* options */ });
const mongooseSocketIo = require('mongoose-socket.io');

io.use(jwtAuth.authenticate({
    secret: jwt_secret,
    algorithm: jwt_algorithm,
}, function (payload, done) {
    console.log(payload);
    User.findOne({ email: payload.sub }, (err, user) => {
        if (err) {
            return done(err);
        }
        if (!user) {
            return done(new Error('User not found'));
        }
        return done(null, user);
    })
}))

io.on("connection", (socket) => {
    // tell user they connected
    socket.emit('connected');

    // event when a client wants to join a room
    socket.on('join room', (room) => {
        socket.join(room);
        console.log('user joined room "' + room + '"');
    });

    // on disconnect
    socket.on('disconnect', () => {
        console.log('a user disconnected!');
    });
});


// NOTIFICATION SCHEMA
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
    email: {
        type: String,
        required: [true, 'email is required'],
    },
    image: {
        type: String,
        required: [true, 'image is required'],
    },
    badgeId: {
        type: String,
        required: [true, 'badgeId is required'],
    },
    is_read: {
        type: Boolean
    }
});

// USE MONGOOSE PLUGIN TO EMIT EVENT WHEN MONGOOSE DETECTS CHANGES
notificationSchema.plugin(mongooseSocketIo, {
    io,
    prefix: 'notification',
    namespace: '',
    room: (doc) => {
        return doc.email;
    },
    events: {
        create: {
            map: function (data) {
                return data;
            }
        },
        update: false,
        remove: false
    },
    debug: true
})


// CREATE NOTIFICATION
notificationSchema.statics.initNew = function (reciever, email, message, image, badgeId) {
    return this.create({
        message: message,
        created_at: new Date(),
        reciever: reciever,
        email: email,
        image: image,
        badgeId: badgeId,
        is_read: false
    })
};

// NOTIFICATION MODEL
const notificationModel = mongoose.model('Notification', notificationSchema);

module.exports = {
    schema: notificationSchema,
    model: notificationModel
}