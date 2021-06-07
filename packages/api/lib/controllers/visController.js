'use strict';

const
  { Vis } = require('@sensebox/opensensemap-api-models'),
  {
    retrieveParameters,
    parseAndValidateTimeParamsForFindAllBoxes,
    validateFromToTimeParams,
    checkPrivilegeVis
  } = require('../helpers/userParamHelpers'),
  handleError = require('../helpers/errorHandler');



/**
 * @api {post} /boxes Post new vis
 * @apiGroup Users
 * @apiName postNewVis
 * @apiDescription Post a new Vis to your account
 *
 */
const postNewVis = async function postNewVis (req, res, next) {
  
  try {
    let newVis = await req.user.addVis(req.body);
    // newVis = await Box.populate(newVis, Box.BOX_SUB_PROPS_FOR_POPULATION);
    res.send(201, { message: 'Vis successfully created', data: newVis });
  } catch (err) {
    handleError(err, next);
  }
};
  

const updateVis = async function updateVis (req, res, next) {
  
  try {
    let vis = await Vis.findById(req.body._id);
    vis = await vis.updatevis(req.body);

    res.send({ code: 'Ok', data: vis.toJSON({ includeSecrets: true }) });
  } catch (err) {
    handleError(err, next);
  }
};

const deleteVis = async function deleteBox (req, res, next) {
  let visId = req.body._id;
  try {
    const vis = await req.user.removeVis(visId);
    res.send({ code: 'Ok', message: 'vis marked for deletion' });
  } catch (err) {
    handleError(err, next);
  }
};


module.exports = {
  postNewVis : [
    retrieveParameters([
      { predef: 'name', required: true }
    ]),
    postNewVis
  ],
  updateVis  : [
    retrieveParameters([
      { predef: 'visId', required: true }
    ]),
    checkPrivilegeVis, 
    updateVis
  ],
  deleteVis  : [
    retrieveParameters([
      { predef: 'visId', required: true }
    ]),
    checkPrivilegeVis, 
    deleteVis
  ]
}
