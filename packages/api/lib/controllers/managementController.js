'use strict';

const { Box, User } = require('@sensebox/opensensemap-api-models'),
  { clearCache, checkContentType, postToSlack } = require('../helpers/apiUtils'),
  { NotFoundError, BadRequestError } = require('restify-errors'),
  handleError = require('../helpers/errorHandler'),
  {
    retrieveParameters,
  } = require('../helpers/userParamHelpers');


const listBoxes = async function listBoxes (req, res, next) {
  try {
    let boxes = await Box.find().exec();
    const users = await User.find().exec();

    boxes = boxes
      .map(b => b.toJSON({ includeSecrets: true }));

    for (const user of users) {
      for (const userbox of user.boxes) {
        const foundbox = boxes.find(box => box._id.equals(userbox));
        if (foundbox) {
          foundbox.owner = user.toJSON({ includeSecrets: true });
        }
      }
    }

    res.send({ code: 'Ok', boxes });
  } catch (err) {
    handleError(err, next);
  }
};

const listUsers = async function listUsers (req, res, next) {
  try {
    const users = await User.find()
      .populate('boxes')
      .then(function (users) {
        return users.map(function (user) {
          const boxes = user.boxes.map(b => b.toJSON({ includeSecrets: true }));

          user = user.toJSON({ includeSecrets: true });

          user.boxes = boxes;

          return user;
        });
      });

    res.send({ code: 'Ok', users });
  } catch (err) {
    handleError(err, next);
  }
};

const getUser = async function getUser (req, res, next) {
  const { userId } = req._userParams;

  try {
    const user = await User.findById(userId)
      .populate('boxes')
      .then(function (user) {
        user.boxes = user.boxes.map(b => b.toJSON({ includeSecrets: true }));

        return user;
      });
    res.send(user.toJSON({ includeSecrets: true }));
  } catch (err) {
    handleError(err, next);
  }
};

const getBox = async function getBox (req, res, next) {
  const { boxId } = req._userParams;

  try {
    const box = await Box.findBoxById(boxId, { includeSecrets: true });
    box.owner = {};
    const user = await User.findUserOfBox(boxId);
    if (user) {
      box.owner = user.toJSON({ includeSecrets: true });
    }

    res.send(box);
  } catch (err) {
    handleError(err, next);
  }
};

const deleteBoxes = async function deleteBoxes (req, res, next) {
  const { boxIds } = req._userParams;

  try {
    for (const boxId of boxIds) {
      const user = await User.findUserOfBox(boxId);
      await user.removeBox(boxId);
      clearCache(['getBoxes', 'getStats']);
      postToSlack(`Management Action: Box deleted: ${req.user.name} (${req.user.email}) just deleted ${boxIds.join(',')}`);
    }
    res.send({ boxIds });
  } catch (err) {
    handleError(err, next);
  }
};

const updateBox = async function updateBox (req, res, next) {
  try {
    const { owner, boxId } = req._userParams;
    // update owner
    if (owner) {
      await User.transferOwnershipOfBox(owner, boxId);
    }

    // update other props
    let box = await Box.findBoxById(boxId, { lean: false, populate: false });
    await box.updateBox(req._userParams);

    // presentation
    box = await Box.findBoxById(boxId, { includeSecrets: true });
    const user = await User.findUserOfBox(boxId);
    box.owner = user.toJSON({ includeSecrets: true });

    postToSlack(`Management Action: Box updated: ${req.user.name} (${req.user.email}) just updated "${box.name}" (${box.model}): <https://opensensemap.org/explore/${box._id}|link>`);
    res.send({ code: 'Ok', data: box });
    clearCache(['getBoxes']);
  } catch (err) {
    handleError(err, next);
  }
};

const updateUser = async function updateUser (req, res, next) {
  try {
    const { userId } = req._userParams;

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('Box not found');
    }

    for (const param of ['email', 'name', 'password', 'role', 'language']) {
      if (req._userParams[param]) {
        user.set(param, req._userParams[param]);
      }
    }

    await user.save();

    postToSlack(`Management Action: User updated: ${req.user.name} (${req.user.email}) just updated "${user.name}" (${user.email})`);
    res.send({ code: 'Ok', data: user });
  } catch (err) {
    handleError(err, next);
  }
};

const deleteUsers = async function deleteUsers (req, res, next) {
  try {
    const { userIds } = req._userParams;

    const userNames = [];

    for (const userId of userIds) {
      const user = await User.findById(userId);
      userNames.push(`${user.name} (${user.email})`);
      await user.destroyUser({ sendMail: false });
      clearCache(['getBoxes', 'getStats']);
      postToSlack(`Management Action: User deleted: ${req.user.name} (${req.user.email}) just deleted ${userNames.join(',')}`);
    }
    res.send({ userIds });
  } catch (err) {
    handleError(err, next);
  }
};

const execUserAction = async function execUserAction (req, res, next) {
  try {
    const { userId, boxId, action } = req._userParams;

    if (action === 'resendBoxMail' && !boxId) {
      throw new BadRequestError('Action \'resendBoxMail\' requires parameter boxId.');
    }

    const user = await User.findById(userId)
      .populate('boxes');

    let box;
    if (action === 'resendBoxMail') {
      box = user.boxes.find(id => id.equals(boxId));
      if (!box) {
        throw new BadRequestError(`Box with id ${boxId} not in this user.`);
      }
    }

    switch (action) {
    case 'passwordReset':
    case 'resendEmailConfirmation':
      await user[action]();
      break;
    case 'resendWelcomeMail':
      user.mail('newUser');
      break;
    case 'resendBoxMail':
      if (box.model.toString().includes('luftdaten')) {
        user.mail('newBoxLuftdaten', box);
        break;
      }

      user.mail('newBox', box);
      break;
    }

    res.send({ code: 'Ok' });
  } catch (err) {
    handleError(err, next);
  }
};

module.exports = {
  listBoxes,
  getBox: [
    retrieveParameters([
      { predef: 'boxId', required: true }
    ]),
    getBox
  ],
  getUser: [
    retrieveParameters([
      { predef: 'boxId', name: 'userId', required: true }
    ]),
    getUser
  ],
  deleteBoxes: [
    checkContentType,
    retrieveParameters([
      { name: 'boxIds', dataType: ['id'], required: true }
    ]),
    deleteBoxes
  ],
  updateBox: [
    checkContentType,
    retrieveParameters([
      { predef: 'boxId', required: true },
      { name: 'name' },
      { name: 'grouptag', dataType: 'StringWithEmpty' },
      { name: 'description', dataType: 'StringWithEmpty' },
      { name: 'weblink', dataType: 'StringWithEmpty' },
      { name: 'image', dataType: 'base64Image' },
      { name: 'exposure', allowedValues: Box.BOX_VALID_EXPOSURES },
      { name: 'mqtt', dataType: 'object' },
      { name: 'ttn', dataType: 'object' },
      { name: 'sensors', dataType: ['object'] },
      { name: 'addons', dataType: 'object' },
      { predef: 'location' },
      { name: 'model', allowedValues: ['custom', ...Box.BOX_VALID_MODELS] },
      { name: 'owner', dataType: 'id' }
    ]),
    updateBox
  ],
  listUsers,
  updateUser: [
    checkContentType,
    retrieveParameters([
      { name: 'userId', dataType: 'id', required: true },
      { name: 'email', dataType: 'email' },
      { predef: 'password', required: false },
      { name: 'name', dataType: 'as-is' },
      { name: 'language' },
      { name: 'role' }
    ]),
    updateUser
  ],
  deleteUsers: [
    checkContentType,
    retrieveParameters([
      { name: 'userIds', dataType: ['id'], required: true }
    ]),
    deleteUsers
  ],
  execUserAction: [
    checkContentType,
    retrieveParameters([
      { name: 'userId', dataType: 'id', required: true },
      { name: 'boxId', dataType: 'id', required: false },
      { name: 'action', required: true, allowedValues: ['passwordReset', 'resendWelcomeMail', 'resendEmailConfirmation', 'resendBoxMail'] }
    ]),
    execUserAction
  ]
};
