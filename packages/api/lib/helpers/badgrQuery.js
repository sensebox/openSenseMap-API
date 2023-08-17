const { Queue } = require("bullmq");

let queue;

const requestQueue = () => {
  if (queue) {
    return queue;
  }
  queue = new Queue(config.get("mailer.queue"), {
    connection: {
      host: config.get("redis.host"),
      port: config.get("redis.port"),
      username: config.get("redis.username"),
      password: config.get("redis.password"),
      db: config.get("redis.db"),
    },
  });

  return queue;
};

module.exports = {
  grantBadge({ badgeClassEntityId, user, issuerEntityId }) {
    const payload = {
      badgeClassEntityId: badgeClassEntityId,
      email: user.email,
      issuerEntityId: issuerEntityId,
      createNotification: true,
    };

    return requestQueue()
      .add("grant-badge", payload, {
        removeOnComplete: true,
      })
      .then((response) => {
        log.info({
          msg: "Successfully granted badge to user",
          job_id: response.id,
          template: response.name,
        });
      })
      .catch((err) => {
        throw err;
      });
  },
};
