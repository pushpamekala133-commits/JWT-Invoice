const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.json({ message: 'Certificates root' }));

module.exports = router;
