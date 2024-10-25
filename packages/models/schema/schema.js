'use strict';

const { pgTable, text, boolean, timestamp, doublePrecision, geometry, index, unique } = require('drizzle-orm/pg-core');
const { relations, sql } = require('drizzle-orm');
const { createId } = require('@paralleldrive/cuid2');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
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
    .notNull()
    .$onUpdateFn(() => new Date()),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
  tags: text('tags').array()
    .default(sql`ARRAY[]::text[]`),
  userId: text('user_id').notNull(),
  sensorWikiModel: text('sensor_wiki_model'),
}, (t) => ({
  spatialIndex: index('spatial_index').using('gist', t.location),
}),);

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
    .notNull()
    .$onUpdateFn(() => new Date()),
  deviceId: text('device_id').notNull()
    .references(() => device.id, {
      onDelete: 'cascade',
    }),
  sensorWikiType: text('sensor_wiki_type'),
  sensorWikiPhenomenon: text('sensor_wiki_phenomenon'),
  sensorWikiUnit: text('sensor_wiki_unit')
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
    .$onUpdateFn(() => new Date())
});

const password = pgTable('password', {
  hash: text('hash').notNull(),
  userId: text('user_id')
    .references(() => user.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade'
    })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

const passwordReset = pgTable('password_reset', {
  userId: text('user_id').unique()
    .notNull()
    .references(() => user.id, {
      onDelete: 'cascade',
    }),
  token: text('token').notNull()
    .$defaultFn(() => uuidv4()),
  expiresAt: timestamp('expires_at').notNull()
    .$defaultFn(() => moment.utc().add(12, 'hours')
      .toDate())
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
  }),
  createdAt: timestamp('created_at').defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
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
    .notNull()
    .$onUpdateFn(() => new Date()),
  profileId: text('profile_id').references(() => profile.id, {
    onDelete: 'cascade',
    onUpdate: 'cascade'
  })
});

const refreshToken = pgTable('refresh_token', {
  userId: text('user_id')
    .notNull()
    .references(() => user.id, {
      onDelete: 'cascade',
    }),
  token: text('token'),
  expiresAt: timestamp('expires_at')
});

const accessToken = pgTable('access_token', {
  deviceId: text('device_id').notNull()
    .references(() => device.id, {
      onDelete: 'cascade'
    }),
  token: text('token'),
});

const tokenBlacklist = pgTable('token_blacklist', {
  hash: text('hash').notNull(),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at')
    .notNull()
    .$defaultFn(() => moment.utc().add(1, 'week')
      .toDate())
});

const measurement = pgTable('measurement', {
  sensorId: text('sensor_id').notNull(),
  time: timestamp('time', { precision: 3, withTimezone: true }).defaultNow()
    .notNull(),
  value: doublePrecision('value')
}, (t) => ({
  unq: unique().on(t.sensorId, t.time)
}));

/**
 * Relations
 */
const deviceRelations = relations(device, ({ many, one }) => ({
  sensors: many(sensor),
  accessToken: one(accessToken)
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
  passwordReset: one(passwordReset, {
    fields: [user.id],
    references: [passwordReset.userId]
  }),
  profile: one(profile, {
    fields: [user.id],
    references: [profile.userId]
  }),
  devices: many(device),
  // TODO: model shared devices sharedDevices: many(device),
  refreshToken: many(refreshToken)
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

const refreshTokenRelations = relations(refreshToken, ({ one }) => ({
  user: one(user, {
    fields: [refreshToken.userId],
    references: [user.id]
  })
}));

const accessTokenRelations = relations(accessToken, ({ one }) => ({
  user: one(device, {
    fields: [accessToken.deviceId],
    references: [device.id]
  })
}));

module.exports.accessTokenTable = accessToken;
module.exports.deviceTable = device;
module.exports.sensorTable = sensor;
module.exports.userTable = user;
module.exports.measurementTable = measurement;
module.exports.passwordTable = password;
module.exports.passwordResetTable = passwordReset;
module.exports.profileTable = profile;
module.exports.profileImageTable = profileImage;
module.exports.refreshTokenTable = refreshToken;
module.exports.tokenBlacklistTable = tokenBlacklist;
module.exports.accessTokenRelations = accessTokenRelations;
module.exports.deviceRelations = deviceRelations;
module.exports.sensorRelations = sensorRelations;
module.exports.userRelations = userRelations;
module.exports.profileRelations = profileRelations;
module.exports.refreshTokenRelations = refreshTokenRelations;
