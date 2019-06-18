/**
 *
 *   NGSI Subscriber node
 *
 *   Given an Entity type / id, attributes and a filter subscribes to the changes
 *
 *   Copyright (c) 2019 FIWARE Foundation e.V.
 *
 *   @author José M. Cantera
 *
 */

const http = require('../../../http.js');
const common = require('../../../common.js');

function validate(config, payload) {
  let out = true;
  if (!config.endpoint) {
    out = false;
  }

  if (!common.getParam('entityType', config, payload)) {
    out = false;
  }

  return out;
}

function buildSubscription(config, payload) {
  const out = [];

  out.push(`type=${common.getParam('entityType', config, payload)}`);

  if (config.mode && config.mode === 'keyValues') {
    out.push(`options=${config.mode}`);
  }

  const attrs = common.getParam('attrs', config, payload);
  if (attrs) {
    out.push(`attrs=${attrs}`);
  }

  const q = common.getParam('q', config, payload);
  if (q) {
    out.push(`q=${q}`);
  }

  return out.join('&');
}

module.exports = function(RED) {
  function NgsiSubscriberNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    const endpointConfig = RED.nodes.getNode(config.endpoint);
    const endpoint = endpointConfig.endpoint;

    node.on('input', async function(msg) {
      if (!validate(config, msg.payload)) {
        msg.payload = null;
        node.error('Node is not properly configured, entity type not provided');
        return;
      }

      const parameters = buildSubscription(config, msg.payload);

      const response = await http.get(
        `${endpoint}/${common.apiPrefix(config)}/entities/?${parameters}`,
        common.buildHeaders(config)
      );

      const statusCode = response.response.statusCode;

      switch (statusCode) {
        case 200:
          msg.payload = response.body;
          node.send(msg);
          break;
        default:
          msg.payload = null;
          node.error(`Query returned HTTP status code in error: ${statusCode}`);
      }
    });
  }

  RED.nodes.registerType('NGSI-Subscriber', NgsiSubscriberNode);
};