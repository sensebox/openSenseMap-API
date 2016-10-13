module.exports = {
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "firstname": {
      "type": "string"
    },
    "lastname": {
      "type": "string"
    },
    "email": {
      "type": "string"
    },
    "apikey": {
      "type": "string"
    },
    "_id": {
      "type": "string"
    },
    "boxes": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "firstname",
    "lastname",
    "email",
    "apikey",
    "_id",
    "boxes"
  ]
}
