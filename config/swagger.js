const swaggerJSDoc = require('swagger-jsdoc');
const swaggerDefinition = {
openapi: '3.0.0',
info: {
title: 'CookStar APIs',
version: '1.0.0',
description: 'APIs Description',
},
servers: [
    {
      url: "http://16.171.36.94:3004/",
    }
  ]
};
const options = {
swaggerDefinition,
apis: ['./routes/*.js'], // Path to the API routes in your Node.js application
};
const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
