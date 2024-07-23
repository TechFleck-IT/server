const swaggerJSDoc = require('swagger-jsdoc');
const swaggerDefinition = {
openapi: '3.0.0',
info: {
title: 'My API',
version: '1.0.0',
description: 'My API Description',
license: {
    name: "MIT",
    url: "https://spdx.org/licenses/MIT.html",
  },
  contact: {
    name: "LogRocket",
    url: "https://logrocket.com",
    email: "info@email.com",
  }
},
servers: [
    {
      url: "http://localhost:3000",
    }
  ]
};
const options = {
swaggerDefinition,
apis: ['./routes/*.js'], // Path to the API routes in your Node.js application
};
const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;