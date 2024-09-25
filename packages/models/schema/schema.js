'use strict';

const { pgTable, text, boolean, timestamp, doublePrecision, json } = require('drizzle-orm/pg-core');
const { relations } = require('drizzle-orm');
const { createId } = require('@paralleldrive/cuid2');
const { exposure, status, deviceModel } = require('./enum');
const { bytea } = require('./types');

/**
 * Table definition
 */
const device = pgTable('device', {
  id: text('id').primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  name: text('name').notNull(),
  image: text('image'),
  description: text('description'),
  link: text('link'),
  useAuth: boolean('use_auth'),
  exposure: exposure('exposure'),
  status: status('status').default('inactive'),
  model: deviceModel('model'),
  public: boolean('public').default(false),
  createdAt: timestamp('created_at').defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
    .notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  userId: text('user_id').notNull(),
  sensorWikiModel: text('sensor_wiki_model'),
});

const sensor = pgTable('sensor', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  title: text('title'),
  unit: text('unit'),
  sensorType: text('sensor_type'),
  status: status('status').default('inactive'),
  createdAt: timestamp('created_at').defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
    .notNull(),
  deviceId: text('device_id').notNull(),
  sensorWikiType: text('sensor_wiki_type'),
  sensorWikiPhenomenon: text('sensor_wiki_phenomenon'),
  sensorWikiUnit: text('sensor_wiki_unit'),
  lastMeasurement: json('lastMeasurement'),
  data: json('data')
});

const user = pgTable('user', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  name: text('name').notNull(),
  email: text('email').unique()
    .notNull(),
  role: text('role', { enum: ['admin', 'user'] }).default('user'),
  language: text('language').default('en_US'),
  emailIsConfirmed: boolean('email_is_confirmed').default(false),
  createdAt: timestamp('created_at').defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
    .notNull()
});

const password = pgTable('password', {
  hash: text('hash').notNull(),
  userId: text('user_id')
    .references(() => user.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade'
    })
    .notNull()
});

const profile = pgTable('profile', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
  username: text('username').unique()
    .notNull(),
  public: boolean('public').default(false),
  userId: text('user_id').references(() => user.id, {
    onDelete: 'cascade',
    onUpdate: 'cascade'
  })
});

const profileImage = pgTable('profile_image', {
  id: text('id')
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId()),
  altText: text('alt_text'),
  contentType: text('content_type').notNull(),
  blob: bytea('blob').notNull(),
  createdAt: timestamp('created_at').defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
    .notNull(),
  profileId: text('profile_id').references(() => profile.id, {
    onDelete: 'cascade',
    onUpdate: 'cascade'
  })
});

/**
 * Relations
 */
const deviceRelations = relations(device, ({ many }) => ({
  sensors: many(sensor)
}));

const sensorRelations = relations(sensor, ({ one }) => ({
  device: one(device, {
    fields: [sensor.deviceId],
    references: [device.id]
  })
}));

const userRelations = relations(user, ({ one, many }) => ({
  password: one(password, {
    fields: [user.id],
    references: [password.userId]
  }),
  profile: one(profile, {
    fields: [user.id],
    references: [profile.userId]
  }),
  devices: many(device)
}));

const profileRelations = relations(profile, ({ one }) => ({
  user: one(user, {
    fields: [profile.userId],
    references: [user.id]
  }),
  profileImage: one(profileImage, {
    fields: [profile.id],
    references: [profileImage.profileId]
  })
}));

module.exports.deviceTable = device;
module.exports.sensorTable = sensor;
module.exports.userTable = user;
module.exports.passwordTable = password;
module.exports.profileTable = profile;
module.exports.profileImageTable = profileImage;
module.exports.deviceRelations = deviceRelations;
module.exports.sensorRelations = sensorRelations;
module.exports.userRelations = userRelations;
module.exports.profileRelations = profileRelations;
