const express = require('express');
const bodyParser = require('body-parser');
const identifyRoutes = require('./routes/identifyRoutes');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use('/', identifyRoutes);

const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
    res.send(' Bitespeed Identity Reconciliation API is running.');
  });  
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
